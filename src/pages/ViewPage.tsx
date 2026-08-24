import { useEffect, useState, useRef } from 'react'
import { getCurrentRoom, getRoomState, subscribeToRoomState, joinRoom } from '../services/RoomService'
import type { RoomState } from '../services/RoomService'
import { getSongById } from '../services/DataService'
import { db } from '../db/Database'
import { PresentationRenderer } from '../presentation/PresentationRenderer'
import { presentationRealtime } from '../services/PresentationRealtimeService'
import type { PresentationCommand } from '../types/PresentationCommand'

interface CurrentSlide {
  lines: string[]
  sectionTitle: string
}

type DiagnosticStatus = 'LOADING' | 'READY' | 'EMPTY' | 'ERROR'

type DisplaySource = 'SHOW_SLIDE' | 'ROOM_STATE' | 'BROADCAST_CHANNEL' | 'LOAD_SONG' | 'SET_LIVE_OFF' | 'CLEAR_SONG' | 'INIT' | null

interface DiagnosticState {
  controllerSongId: number | null
  controllerSongTitle: string | null
  requestedSongId: number | null
  requestedSongTitle: string | null
  loadedSongId: number | null
  loadedSongTitle: string | null
  indexedDb: 'FOUND' | 'MISSING' | 'UNKNOWN'
  status: DiagnosticStatus
  sectionIndex: number | null
  slideIndex: number | null
  requestedSlideExists: boolean | null
  songMatch: boolean | null
  slideExists: boolean | null
  displayed: 'VISIBLE' | 'BLANK' | 'INVALID'
  mismatches: string[]
  lastDisplaySource: DisplaySource
  lastDisplayTime: number
}

function ViewPage() {
  const [currentSlide, setCurrentSlide] = useState<CurrentSlide | null>(null)
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({
    controllerSongId: null,
    controllerSongTitle: null,
    requestedSongId: null,
    requestedSongTitle: null,
    loadedSongId: null,
    loadedSongTitle: null,
    indexedDb: 'UNKNOWN',
    status: 'EMPTY',
    sectionIndex: null,
    slideIndex: null,
    requestedSlideExists: null,
    songMatch: null,
    slideExists: null,
    displayed: 'BLANK',
    mismatches: [],
    lastDisplaySource: null,
    lastDisplayTime: 0,
  })
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'broadcast' | 'error'>('connecting')
  const prevSlideKey = useRef<string>('')
  const joinedRef = useRef(false)
  const presentationRef = useRef<{ songId: number; density: 4 | 2; presentation: ReturnType<typeof PresentationRenderer.render> } | null>(null)
  const loadRequestRef = useRef(0)
  const displayRequestRef = useRef(0) // Unified request ID for all display operations

  // ── Transparent background for OBS overlay ──────────────────────────────
  useEffect(() => {
    const els = [document.documentElement, document.body, document.getElementById('root')]
    const prev = els.map(el => el?.style.background ?? '')
    els.forEach(el => { if (el) el.style.background = 'transparent' })
    return () => {
      els.forEach((el, i) => { if (el) el.style.background = prev[i] })
    }
  }, [])

  // Load and render only when the song or density changes. Slide changes are RAM lookups.
  const ensurePresentation = async (songId: number, density: 4 | 2, requestId?: number) => {
    setDiagnostic(previous => ({
      ...previous,
      requestedSongId: songId,
      status: 'LOADING',
    }))
    const cached = presentationRef.current
    if (cached?.songId === songId && cached.density === density) {
      setDiagnostic(previous => ({
        ...previous,
        loadedSongId: cached.songId,
        status: 'READY',
        songMatch: previous.controllerSongId === null || previous.controllerSongId === cached.songId,
      }))
      return cached.presentation
    }

    const currentRequestId = requestId ?? ++displayRequestRef.current
    const localSong = await db.songs.get(songId)
    setDiagnostic(previous => ({ ...previous, indexedDb: localSong ? 'FOUND' : 'MISSING' }))
    try {
      const song = await getSongById(songId)
      if (requestId && currentRequestId !== displayRequestRef.current) return null
      if (!song?.display) {
        setDiagnostic(previous => ({ ...previous, status: 'EMPTY', loadedSongId: null, loadedSongTitle: null }))
        return null
      }

      const presentation = PresentationRenderer.render(song.display, density)
      presentationRef.current = { songId, density, presentation }
      setDiagnostic(previous => ({
        ...previous,
        requestedSongTitle: previous.requestedSongId === songId ? song.title : previous.requestedSongTitle,
        loadedSongId: songId,
        loadedSongTitle: song.title,
        status: 'READY',
        songMatch: previous.controllerSongId === null || previous.controllerSongId === songId,
      }))
      return presentation
    } catch (error) {
      setDiagnostic(previous => ({ ...previous, status: 'ERROR' }))
      throw error
    }
  }

  const showSlide = (presentation: ReturnType<typeof PresentationRenderer.render>, sectionIndex: number, slideIndex: number, source: DisplaySource) => {
    const section = presentation.sections[sectionIndex]
    const slide = section?.slides[slideIndex]
    if (!section || !slide) {
      setDiagnostic(previous => ({
        ...previous,
        sectionIndex,
        slideIndex,
        requestedSlideExists: false,
        slideExists: false,
        displayed: 'INVALID',
      }))
      setCurrentSlide(null)
      return
    }

    const key = `${presentationRef.current?.songId}-${sectionIndex}-${slideIndex}`
    const prevKeyAtCheck = prevSlideKey.current
    console.log('[ViewPage] showSlide CHECK:', source, { key, prevKeyAtCheck, willSkip: key === prevKeyAtCheck })
    if (key === prevSlideKey.current) {
      console.log('[ViewPage] showSlide SKIPPED:', source, { key })
      return
    }
    prevSlideKey.current = key
    const now = Date.now()
    console.log('[ViewPage] showSlide EXEC:', source, { songId: presentationRef.current?.songId, sectionIndex, slideIndex, key })
    setDiagnostic(previous => ({
      ...previous,
      sectionIndex,
      slideIndex,
      requestedSlideExists: true,
      slideExists: true,
      displayed: 'VISIBLE',
      lastDisplaySource: source,
      lastDisplayTime: now,
    }))
    setCurrentSlide({ lines: slide.lines.map(line => line.text), sectionTitle: section.title })
  }

  // Room-state remains the recovery/initial-state path; cached presentations make slide changes local.
  const renderRoomState = async (state: RoomState) => {
    const controllerSong = state.current_song_id ? await db.songIndex.get(state.current_song_id) : null
    const liveSong = state.live_song_id ? await db.songIndex.get(state.live_song_id) : null

    setDiagnostic(previous => ({
      ...previous,
      controllerSongId: state.current_song_id,
      controllerSongTitle: controllerSong?.title ?? null,
      requestedSongId: state.live_song_id ?? state.current_song_id,
      requestedSongTitle: liveSong?.title ?? controllerSong?.title ?? null,
    }))

    // Priority 1: Live song active - show the live slide (initial load / recovery)
    if (state.live_song_id && state.is_live_active) {
      setDiagnostic(previous => ({
        ...previous,
        controllerSongId: state.current_song_id,
        sectionIndex: state.live_section_index,
        slideIndex: state.live_slide_index,
        songMatch: previous.loadedSongId === null ? null : previous.loadedSongId === state.live_song_id,
      }))

      const stateKey = `${state.live_song_id}-${state.live_section_index ?? 0}-${state.live_slide_index ?? 0}`
      // Dedupe: if we're already showing this exact slide (via broadcast), skip to avoid double-fade
      if (stateKey === prevSlideKey.current) {
        return
      }

      try {
        const presentation = await ensurePresentation(state.live_song_id, 2)
        if (presentation) showSlide(presentation, state.live_section_index ?? 0, state.live_slide_index ?? 0, 'ROOM_STATE')
      } catch (error) {
        console.error('[ViewPage] Error rendering room state:', error)
      }
      return
    }

    // Priority 2: Nothing live — clear (song selected but not live = show nothing)
    setDiagnostic(previous => ({
      ...previous,
      requestedSongId: state.current_song_id,
      requestedSongTitle: controllerSong?.title ?? null,
      controllerSongId: state.current_song_id,
      loadedSongId: null,
      loadedSongTitle: null,
      status: state.current_song_id ? 'READY' : 'EMPTY',
      displayed: 'BLANK',
    }))
    setCurrentSlide(null)
  }

  const handleRealtimeCommand = async (command: PresentationCommand) => {
    setConnectionStatus('connected')

    if (command.type === 'CLEAR_SONG') {
      loadRequestRef.current += 1
      presentationRef.current = null
      prevSlideKey.current = ''
      setCurrentSlide(null)
      setDiagnostic(previous => ({ ...previous, requestedSongId: null, requestedSongTitle: null, loadedSongId: null, loadedSongTitle: null, status: 'EMPTY', displayed: 'BLANK' }))
      return
    }

    if (command.type === 'SET_LIVE') {
      if (!command.live) {
        setCurrentSlide(null)
        setDiagnostic(previous => ({ ...previous, status: previous.loadedSongId ? 'READY' : 'EMPTY', displayed: 'BLANK' }))
      }
      // SET_LIVE(true) is a no-op — SHOW_SLIDE broadcast carries the slide info and handles display
      return
    }

    if (command.type === 'LOAD_SONG') {
      loadRequestRef.current += 1
      presentationRef.current = null
      prevSlideKey.current = ''
      setDiagnostic(previous => ({ ...previous, requestedSongId: command.songId, requestedSlideExists: null, slideExists: null }))
      await ensurePresentation(command.songId, 2) // Only prepare, don't show
      return
    }

    // SHOW_SLIDE — primary display command
    const presentation = await ensurePresentation(command.songId, 2)
    if (!presentation) return

    setDiagnostic(previous => ({
      ...previous,
      requestedSongId: command.songId,
      sectionIndex: command.sectionIndex,
      slideIndex: command.slideIndex,
      requestedSlideExists: Boolean(presentation.sections[command.sectionIndex]?.slides[command.slideIndex]),
      songMatch: previous.loadedSongId === command.songId,
    }))

    showSlide(presentation, command.sectionIndex, command.slideIndex, 'SHOW_SLIDE')
  }

  // ── Connection setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')

    const startRoomConnection = (roomId: string) => {
      setConnectionStatus('connecting')
      getRoomState(roomId).then((state) => {
        if (state) { setConnectionStatus('connected'); renderRoomState(state) }
        else setConnectionStatus('error')
      })
      const unsub = subscribeToRoomState(roomId, (state) => {
        setConnectionStatus('connected')
        renderRoomState(state)
      })
      return unsub
    }

    let unsubscribeRoom: (() => void) | null = null

    // Priority 1: ?room=PASSWORD — auto-join silently (OBS / direct link)
    if (roomParam && !joinedRef.current) {
      joinedRef.current = true
      setConnectionStatus('connecting')
      joinRoom(roomParam.toUpperCase()).then((room) => {
        if (room) {
          presentationRealtime.connect(room.id, room.owner_id)
          presentationRealtime.subscribe(handleRealtimeCommand)
          unsubscribeRoom = startRoomConnection(room.id)
        } else {
          setConnectionStatus('error')
        }
      })
    } else {
      // Priority 2: Already in a room via localStorage
      const { roomId, isOwner } = getCurrentRoom()
      if (roomId && !isOwner) {
        presentationRealtime.connect(roomId, getCurrentRoom().ownerDeviceId)
        presentationRealtime.subscribe(handleRealtimeCommand)
        unsubscribeRoom = startRoomConnection(roomId)
      } else {
        // Priority 3: BroadcastChannel — same-device tabs
        setConnectionStatus('broadcast')
      }
    }

    // BroadcastChannel always listens as same-device fallback
    const roomIdentity = getCurrentRoom()
    const bc = new BroadcastChannel('song-viewer')
    bc.onmessage = (event) => {
      const message = event.data
      if (message.type === 'SELECT_BLOCK' && message.blockId === 'dynamic') {
        if (
          !roomIdentity.roomId ||
          message.roomId !== roomIdentity.roomId ||
          message.senderDeviceId !== roomIdentity.ownerDeviceId
        ) return
        if (connectionStatus !== 'connected') {
          setConnectionStatus('broadcast')
          if (message.lines?.length > 0) {
            // Create a minimal presentation-like object for showSlide
            const tempPresentation = {
              sections: [{
                title: message.title ?? '',
                slides: [{ lines: message.lines.map((text: string) => ({ text })) }]
              }]
            } as ReturnType<typeof PresentationRenderer.render>
            showSlide(tempPresentation, 0, 0, 'BROADCAST_CHANNEL')
          } else {
            setCurrentSlide(null)
            setDiagnostic(previous => ({ ...previous, displayed: 'BLANK', lastDisplaySource: 'BROADCAST_CHANNEL' as DisplaySource, lastDisplayTime: Date.now() }))
          }
        }
      }
    }

    return () => {
      bc.close()
      presentationRealtime.disconnect()
      if (unsubscribeRoom) unsubscribeRoom()
    }
  }, [])

  // ── Status dot ───────────────────────────────────────────────────────────
  const statusDot = {
    connected: 'bg-green-400 animate-pulse',
    broadcast: 'bg-blue-400',
    error:     'bg-red-400',
    connecting:'bg-yellow-400 animate-pulse',
  }[connectionStatus]

  const statusLabel = { connected: 'ROOM', broadcast: 'LOCAL', error: 'ERR', connecting: '...' }[connectionStatus]
  const songMatch = diagnostic.songMatch === null ? 'UNKNOWN' : diagnostic.songMatch ? 'PASS' : 'FAIL'
  const slideExists = diagnostic.slideExists === null ? 'UNKNOWN' : diagnostic.slideExists ? 'PASS' : 'FAIL'
  const mismatches = [
    diagnostic.controllerSongId !== null && diagnostic.loadedSongId !== null && diagnostic.controllerSongId !== diagnostic.loadedSongId
      ? `Controller song ${diagnostic.controllerSongId} != loaded song ${diagnostic.loadedSongId}`
      : null,
    diagnostic.requestedSongId !== null && diagnostic.loadedSongId !== null && diagnostic.requestedSongId !== diagnostic.loadedSongId
      ? `Requested song ${diagnostic.requestedSongId} != loaded song ${diagnostic.loadedSongId}`
      : null,
    diagnostic.requestedSlideExists === false ? 'Requested section/slide does not exist locally' : null,
    diagnostic.displayed === 'INVALID' ? 'Requested slide is invalid' : null,
    diagnostic.status === 'READY' && diagnostic.requestedSongId !== null && diagnostic.displayed === 'BLANK'
      ? 'Song is ready but nothing is displayed'
      : null,
  ].filter((message): message is string => Boolean(message))
  const mismatchKey = mismatches.join('|')

  useEffect(() => {
    if (mismatches.length > 0) console.warn('[PresentationSyncDiagnostic]', mismatches)
  }, [mismatchKey])

  return (
    <div className="flex h-screen w-screen flex-col bg-transparent items-center justify-end pb-[6vh] overflow-hidden select-none">

      {currentSlide && (
        <div
          key={currentSlide.lines.join('|')}
          className="text-center max-w-6xl px-12 animate-[fadeIn_0.3s_ease-out]"
        >
          <div className="flex flex-col gap-4">
            {currentSlide.lines.map((line, index) => (
              <div
                key={index}
                className="presentation-lyrics text-[54px] font-semibold leading-snug text-[#fffde7]"
                style={{
                  // Layered shadow: crisp near-shadow + soft wide glow for pop on any background
                  textShadow: `
                    0 1px 3px rgba(0,0,0,0.95),
                    0 3px 8px rgba(0,0,0,0.85),
                    0 8px 24px rgba(0,0,0,0.70),
                    0 0  40px rgba(0,0,0,0.50)
                  `,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Temporary diagnostic panel for presentation sync testing. */}
      <div className="mt-4 w-[min(92vw,760px)] max-h-[30vh] overflow-y-auto rounded border border-yellow-300/40 bg-black/80 px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-yellow-100/90">
        <div className="mb-1 font-bold text-yellow-200">TEMP PRESENTATION SYNC DIAGNOSTIC</div>
        <div>Controller Selected Song: {diagnostic.controllerSongId ?? 'NONE'} / {diagnostic.controllerSongTitle ?? 'NONE'}</div>
        <div>Requested Song: {diagnostic.requestedSongId ?? 'NONE'} / {diagnostic.requestedSongTitle ?? 'NONE'}</div>
        <div>Presentation Loaded Song: {diagnostic.loadedSongId ?? 'NONE'} / {diagnostic.loadedSongTitle ?? 'NONE'}</div>
        <div>IndexedDB: {diagnostic.indexedDb}</div>
        <div>Status: {diagnostic.status}</div>
        <div>Current section: {diagnostic.sectionIndex ?? 'NONE'} | Current slide: {diagnostic.slideIndex ?? 'NONE'}</div>
        <div>Requested slide exists locally: {diagnostic.requestedSlideExists === null ? 'UNKNOWN' : diagnostic.requestedSlideExists ? 'YES' : 'NO'}</div>
        <div>Song Match: {songMatch} | Slide Exists: {slideExists}</div>
        <div>Displayed: {diagnostic.displayed}</div>
        <div>Last Display Source: {diagnostic.lastDisplaySource ?? 'NONE'} @ {diagnostic.lastDisplayTime ? new Date(diagnostic.lastDisplayTime).toLocaleTimeString() : 'N/A'}</div>
        {mismatches.length > 0 && (
          <div className="mt-1 text-red-200">
            {mismatches.map(message => <div key={message}>Mismatch: {message}</div>)}
          </div>
        )}
      </div>

      {/* Tiny connection indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-20 hover:opacity-70 transition-opacity">
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
        <span className="text-[10px] text-white font-mono">{statusLabel}</span>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

    </div>
  )
}

export default ViewPage
