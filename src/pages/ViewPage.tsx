import { useEffect, useState, useRef } from 'react'
import { getCurrentRoom, getRoomState, subscribeToRoomState, joinRoom } from '../services/RoomService'
import type { RoomState } from '../services/RoomService'
import { getSongById } from '../services/DataService'
import { PresentationRenderer } from '../presentation/PresentationRenderer'
import { presentationRealtime } from '../services/PresentationRealtimeService'
import type { PresentationCommand } from '../types/PresentationCommand'

interface CurrentSlide {
  lines: string[]
  sectionTitle: string
}

function ViewPage() {
  const [currentSlide, setCurrentSlide] = useState<CurrentSlide | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'broadcast' | 'error'>('connecting')
  const prevSlideKey = useRef<string>('')
  const joinedRef = useRef(false)
  const presentationRef = useRef<{ songId: number; density: 4 | 2; presentation: ReturnType<typeof PresentationRenderer.render> } | null>(null)
  const loadRequestRef = useRef(0)

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
  const ensurePresentation = async (songId: number, density: 4 | 2) => {
    const cached = presentationRef.current
    if (cached?.songId === songId && cached.density === density) return cached.presentation

    const requestId = ++loadRequestRef.current
    const song = await getSongById(songId)
    if (requestId !== loadRequestRef.current || !song?.display) return null

    const presentation = PresentationRenderer.render(song.display, density)
    presentationRef.current = { songId, density, presentation }
    return presentation
  }

  const showSlide = (presentation: ReturnType<typeof PresentationRenderer.render>, sectionIndex: number, slideIndex: number) => {
    const section = presentation.sections[sectionIndex]
    const slide = section?.slides[slideIndex]
    if (!section || !slide) {
      setCurrentSlide(null)
      return
    }

    const key = `${presentationRef.current?.songId}-${sectionIndex}-${slideIndex}`
    if (key === prevSlideKey.current) return
    prevSlideKey.current = key
    setCurrentSlide({ lines: slide.lines.map(line => line.text), sectionTitle: section.title })
  }

  // Room-state remains the recovery/initial-state path; cached presentations make slide changes local.
  const renderRoomState = async (state: RoomState) => {
    if (!state.live_song_id) {
      setCurrentSlide(null)
      return
    }

    const stateKey = `${state.live_song_id}-${state.live_section_index ?? 0}-${state.live_slide_index ?? 0}`
    // Keep a newly selected slide visible while the separate live flag update arrives.
    if (!state.is_live_active && stateKey === prevSlideKey.current) {
      setCurrentSlide(null)
      return
    }

    try {
      const presentation = await ensurePresentation(state.live_song_id, 2)
      if (presentation) showSlide(presentation, state.live_section_index ?? 0, state.live_slide_index ?? 0)
    } catch (error) {
      console.error('[ViewPage] Error rendering room state:', error)
    }
  }

  const handleRealtimeCommand = async (command: PresentationCommand) => {
    setConnectionStatus('connected')

    if (command.type === 'SET_LIVE') {
      if (!command.live) setCurrentSlide(null)
      return
    }

    const presentation = await ensurePresentation(command.songId, 2)
    if (!presentation) return

    if (command.type === 'SHOW_SONG') {
      setCurrentSlide(null)
      return
    }

    showSlide(presentation, command.sectionIndex, command.slideIndex)
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
          presentationRealtime.connect(room.id)
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
        presentationRealtime.connect(roomId)
        presentationRealtime.subscribe(handleRealtimeCommand)
        unsubscribeRoom = startRoomConnection(roomId)
      } else {
        // Priority 3: BroadcastChannel — same-device tabs
        setConnectionStatus('broadcast')
      }
    }

    // BroadcastChannel always listens as same-device fallback
    const bc = new BroadcastChannel('song-viewer')
    bc.onmessage = (event) => {
      const message = event.data
      if (message.type === 'SELECT_BLOCK' && message.blockId === 'dynamic') {
        if (connectionStatus !== 'connected') {
          setConnectionStatus('broadcast')
          if (message.lines?.length > 0) {
            setCurrentSlide({ lines: message.lines, sectionTitle: message.title ?? '' })
          } else {
            setCurrentSlide(null)
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

  return (
    <div className="flex h-screen w-screen bg-transparent items-end justify-center pb-[12vh] overflow-hidden select-none">

      {currentSlide && (
        <div
          key={currentSlide.lines.join('|')}
          className="text-center max-w-6xl px-12"
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

      {/* Tiny connection indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-20 hover:opacity-70 transition-opacity">
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
        <span className="text-[10px] text-white font-mono">{statusLabel}</span>
      </div>

    </div>
  )
}

export default ViewPage
