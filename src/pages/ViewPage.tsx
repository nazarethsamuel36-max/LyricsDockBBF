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

  // ── Helper: render a room state to actual slide lines ─────────────────────
  const renderRoomState = async (state: RoomState) => {
    if (!state.is_live_active || !state.live_song_id) {
      setCurrentSlide(null)
      return
    }

    try {
      const song = await getSongById(state.live_song_id)
      if (!song || !song.display) {
        console.warn('[ViewPage] Song not found or no display content:', state.live_song_id)
        setCurrentSlide(null)
        return
      }

      const density = (state.presentation_density === 2 ? 2 : 4) as 4 | 2
      const presentation = PresentationRenderer.render(song.display, density)

      const sectionIndex = state.live_section_index ?? 0
      const slideIndex = state.live_slide_index ?? 0

      const section = presentation.sections[sectionIndex]
      if (!section) {
        setCurrentSlide(null)
        return
      }

      const slide = section.slides[slideIndex]
      if (!slide) {
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

  useEffect(() => {
    // ── Check for ?room=PASSWORD query param (OBS / direct link mode) ────────
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')

    const startRoomConnection = (roomId: string) => {
      setConnectionStatus('connecting')

      getRoomState(roomId).then((state) => {
        if (state) {
          setConnectionStatus('connected')
          renderRoomState(state)
        } else {
          setConnectionStatus('error')
        }
      })

      const unsub = subscribeToRoomState(roomId, (state) => {
        setConnectionStatus('connected')
        renderRoomState(state)
      })

      return unsub
    }

    let unsubscribeRoom: (() => void) | null = null

    // Priority 1: ?room=PASSWORD param — auto-join silently (for OBS)
    if (roomParam && !joinedRef.current) {
      joinedRef.current = true
      setConnectionStatus('connecting')

      joinRoom(roomParam.toUpperCase()).then((room) => {
        if (room) {
          const storedRoomId = room.id
          unsubscribeRoom = startRoomConnection(storedRoomId)
        } else {
          console.error('[ViewPage] Failed to join room from URL param:', roomParam)
          setConnectionStatus('error')
        }
      })
    }
    // Priority 2: Already in a room (localStorage) — non-owner viewer
    else {
      const { roomId, isOwner } = getCurrentRoom()

      if (roomId && !isOwner) {
        unsubscribeRoom = startRoomConnection(roomId)
      } else {
        // Priority 3: BroadcastChannel — same-device tabs mode
        setConnectionStatus('broadcast')
      }
    }

    // ── BroadcastChannel: same-device/tab mode (always listen as fallback) ──
    const bc = new BroadcastChannel('song-viewer')
    bc.onmessage = (event) => {
      const message = event.data
      if (message.type === 'SELECT_BLOCK' && message.blockId === 'dynamic') {
        // Only use BroadcastChannel if NOT in room mode
        if (connectionStatus !== 'connected') {
          setConnectionStatus('broadcast')
          if (message.lines && message.lines.length > 0) {
            setCurrentSlide({
              lines: message.lines,
              sectionTitle: message.title ?? ''
            })
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

  const statusDot = connectionStatus === 'connected'
    ? 'bg-green-400 animate-pulse'
    : connectionStatus === 'broadcast'
      ? 'bg-blue-400'
      : connectionStatus === 'error'
        ? 'bg-red-400'
        : 'bg-yellow-400 animate-pulse'

  const statusLabel = connectionStatus === 'connected'
    ? 'ROOM'
    : connectionStatus === 'broadcast'
      ? 'LOCAL'
      : connectionStatus === 'error'
        ? 'ERR'
        : '...'

  return (
    <div className="flex h-screen w-screen bg-transparent items-end justify-center pb-[12vh] overflow-hidden select-none">
      {currentSlide ? (
        <div
          key={currentSlide.lines.join('|')}
          className="text-center max-w-6xl px-12 animate-[fadeIn_0.3s_ease]"
        >
          <div className="flex flex-col gap-5">
            {currentSlide.lines.map((line, index) => (
              <div
                key={index}
                className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-normal text-white drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)] opacity-0 animate-[slideUp_0.35s_ease_forwards]"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Tiny connection indicator — top-left, barely visible */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-20 hover:opacity-70 transition-opacity">
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
        <span className="text-[10px] text-white font-mono">{statusLabel}</span>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default ViewPage
