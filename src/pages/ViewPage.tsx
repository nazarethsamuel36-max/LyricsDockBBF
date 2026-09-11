import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getCurrentRoom, joinRoom, subscribeToRoomParticipants, getRoomParticipants, getDeviceId } from '../services/RoomService'
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
  const navigate = useNavigate()
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
  const searchParams = new URLSearchParams(window.location.search)
  const isDirectRoomView = searchParams.has('room')
  const isQrParam = searchParams.get('qr') === '1'
  const roomParam = searchParams.get('room')
  const currentRoom = getCurrentRoom()
  const activePassword = (roomParam || currentRoom.password || '').toUpperCase()
  const [showQrOverlay, setShowQrOverlay] = useState(isQrParam)
  const qrJoinUrl = `${window.location.origin}/join/${activePassword}?role=controller`

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

  const handleRealtimeCommand = async (command: PresentationCommand) => {
    setShowQrOverlay(false)
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

  // ── Auto-dismiss QR overlay when a mobile controller connects ─────────────
  useEffect(() => {
    if (!showQrOverlay) return
    const roomId = currentRoom.roomId
    if (!roomId) return

    const myDeviceId = getDeviceId()

    const checkForController = (participants: { device_type: string; device_id: string }[]) => {
      const hasOtherController = participants.some(
        (p) => p.device_type === 'controller' && p.device_id !== myDeviceId
      )
      if (hasOtherController) {
        setShowQrOverlay(false)
      }
    }

    void getRoomParticipants(roomId).then(checkForController)

    const unsubParticipants = subscribeToRoomParticipants(roomId, (participant) => {
      if (participant.device_type === 'controller' && participant.device_id !== myDeviceId) {
        setShowQrOverlay(false)
      }
    })

    const unsubBroadcast = presentationRealtime.onControllerConnected(() => {
      setShowQrOverlay(false)
    })

    const interval = setInterval(() => {
      void getRoomParticipants(roomId).then(checkForController)
    }, 2000)

    return () => {
      unsubParticipants()
      unsubBroadcast()
      clearInterval(interval)
    }
  }, [showQrOverlay, currentRoom.roomId])

  // ── Connection setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')
    const currentRoom = getCurrentRoom()

    // Priority 1: if this device created the room, keep it on the presentation screen.
    if (currentRoom.roomId && currentRoom.isOwner) {
      presentationRealtime.connect(currentRoom.roomId)
      presentationRealtime.subscribe(handleRealtimeCommand)
      setConnectionStatus('connected')
    }
    // Priority 2: ?room=PASSWORD — auto-join silently (OBS / direct link for non-owner viewers)
    else if (roomParam && !joinedRef.current) {
      joinedRef.current = true
      setConnectionStatus('connecting')
      joinRoom(roomParam.toUpperCase()).then((room) => {
        if (room) {
          presentationRealtime.connect(room.id)
          presentationRealtime.subscribe(handleRealtimeCommand)
          setConnectionStatus('connected')
        } else {
          setConnectionStatus('error')
        }
      })
    } else {
      // Priority 3: Already in a room via localStorage as a viewer
      const { roomId, isOwner } = currentRoom
      if (roomId && !isOwner) {
        presentationRealtime.connect(roomId)
        presentationRealtime.subscribe(handleRealtimeCommand)
        setConnectionStatus('connected')
      } else {
        // Priority 4: BroadcastChannel — same-device tabs
        setConnectionStatus('broadcast')
      }
    }

    const roomIdentity = getCurrentRoom()
    const bc = roomIdentity.roomId ? null : new BroadcastChannel('song-viewer')
    if (bc) {
      bc.onmessage = (event) => {
        const message = event.data
        if (message.type === 'SELECT_BLOCK' && message.blockId === 'dynamic') {
          if (message.senderDeviceId !== getCurrentRoom().ownerDeviceId) return
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
      bc?.close()
      presentationRealtime.disconnect()
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

      {!isDirectRoomView && (
        <button
          onClick={() => navigate('/')}
          aria-label="Back to home"
          className="absolute top-0 right-0 z-10 h-[70px] w-[70px] cursor-pointer bg-transparent"
        >
          <svg className="hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}

      {currentSlide && (
        <div
          key={currentSlide.lines.join('|')}
          className="text-center max-w-6xl px-12 animate-[fadeIn_0.3s_ease-out]"
        >
          <div className="flex flex-col gap-4">
            {currentSlide.lines.map((line, index) => (
              <div
                key={index}
                className="presentation-lyrics text-[42px] font-semibold leading-snug text-white"
                style={{
                  // Layered shadow keeps white lyrics readable over bright backgrounds.
                  textShadow: `
                    0 1px 3px rgba(0,0,0,1),
                    0 3px 8px rgba(0,0,0,0.95),
                    0 8px 24px rgba(0,0,0,0.85),
                    0 0 40px rgba(0,0,0,0.70)
                  `,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tiny connection indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-20 hover:opacity-70 transition-opacity">
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
        <span className="text-[10px] text-white font-mono">{statusLabel}</span>
      </div>

      {/* Pair Mobile Controller QR Modal */}
      {showQrOverlay && activePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300 animate-[fadeIn_0.25s_ease-out]">
          <div className="relative flex flex-col items-center bg-[#16161a] border border-zinc-700/80 shadow-2xl rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4 text-center">
            {/* Close / Dismiss button */}
            <button
              onClick={() => setShowQrOverlay(false)}
              className="absolute top-3.5 right-3.5 p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Dismiss QR Code"
              aria-label="Close QR overlay"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-950/70 border border-indigo-700/60 rounded-full text-indigo-300 text-xs font-medium mb-3">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Pair Mobile Controller
            </div>

            {/* Header */}
            <h3 className="text-xl font-bold text-white mb-1">
              Scan to Control
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Scan with your phone to control lyrics live
            </p>

            {/* QR Code SVG */}
            <div className="bg-white p-3.5 rounded-xl shadow-lg mb-4">
              <QRCodeSVG
                value={qrJoinUrl}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Room Password */}
            <div className="bg-[#0f0f12] border border-zinc-800 rounded-lg px-4 py-2.5 mb-3 w-full flex items-center justify-between">
              <span className="text-xs text-zinc-400">Room Code:</span>
              <span className="font-mono text-base font-bold text-indigo-400 tracking-widest">
                {activePassword}
              </span>
            </div>

            {/* Live connection status */}
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <div className="w-2 h-2 border-2 border-zinc-500 border-t-indigo-400 rounded-full animate-spin"></div>
              <span>Waiting for mobile to connect...</span>
            </div>

            <button
              onClick={() => setShowQrOverlay(false)}
              className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors cursor-pointer"
            >
              Skip and open presentation now
            </button>
          </div>
        </div>
      )}

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
