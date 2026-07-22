import { useEffect, useState, useRef } from 'react'
import { getCurrentRoom, getRoomState, subscribeToRoomState, joinRoom } from '../services/RoomService'
import type { RoomState } from '../services/RoomService'
import { getSongById } from '../services/DataService'
import { PresentationRenderer } from '../presentation/PresentationRenderer'

interface CurrentSlide {
  lines: string[]
  sectionTitle: string
}

function ViewPage() {
  const [currentSlide, setCurrentSlide] = useState<CurrentSlide | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'broadcast' | 'error'>('connecting')
  const prevSlideKey = useRef<string>('')
  const joinedRef = useRef(false)

  // ── Transparent background for OBS overlay ──────────────────────────────
  useEffect(() => {
    const els = [document.documentElement, document.body, document.getElementById('root')]
    const prev = els.map(el => el?.style.background ?? '')
    els.forEach(el => { if (el) el.style.background = 'transparent' })
    return () => {
      els.forEach((el, i) => { if (el) el.style.background = prev[i] })
    }
  }, [])

  // ── Helper: render a room state to actual slide lines ─────────────────────
  const renderRoomState = async (state: RoomState) => {
    if (!state.is_live_active || !state.live_song_id) {
      setCurrentSlide(null)
      return
    }

    try {
      const song = await getSongById(state.live_song_id)
      if (!song || !song.display) {
        setCurrentSlide(null)
        return
      }

      const density = (state.presentation_density === 2 ? 2 : 4) as 4 | 2
      const presentation = PresentationRenderer.render(song.display, density)

      const sectionIndex = state.live_section_index ?? 0
      const slideIndex = state.live_slide_index ?? 0

      const section = presentation.sections[sectionIndex]
      const slide = section?.slides[slideIndex]

      if (!section || !slide) {
        setCurrentSlide(null)
        return
      }

      const key = `${state.live_song_id}-${sectionIndex}-${slideIndex}`
      if (key === prevSlideKey.current) return
      prevSlideKey.current = key

      setCurrentSlide({
        lines: slide.lines.map(l => l.text),
        sectionTitle: section.title
      })
    } catch (error) {
      console.error('[ViewPage] Error rendering room state:', error)
    }
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
          unsubscribeRoom = startRoomConnection(room.id)
        } else {
          setConnectionStatus('error')
        }
      })
    } else {
      // Priority 2: Already in a room via localStorage
      const { roomId, isOwner } = getCurrentRoom()
      if (roomId && !isOwner) {
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
          className="text-center max-w-6xl px-12 animate-[fadeIn_0.3s_ease]"
        >
          <div className="flex flex-col gap-4">
            {currentSlide.lines.map((line, index) => (
              <div
                key={index}
                className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-snug text-white opacity-0 animate-[slideUp_0.35s_ease_forwards]"
                style={{
                  animationDelay: `${index * 0.08}s`,
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  )
}

export default ViewPage
