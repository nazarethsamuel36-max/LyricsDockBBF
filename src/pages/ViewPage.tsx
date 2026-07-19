import { useEffect, useState, useRef } from 'react'
import { getCurrentRoom, getRoomState, subscribeToRoomState } from '../services/RoomService'
import type { RoomState } from '../services/RoomService'
import { getSongById } from '../services/DataService'
import { PresentationRenderer } from '../presentation/PresentationRenderer'

interface CurrentSlide {
  lines: string[]
  sectionTitle: string
}

function ViewPage() {
  const [currentSlide, setCurrentSlide] = useState<CurrentSlide | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'broadcast'>('connecting')
  const prevSlideKey = useRef<string>('')

  const { roomId, isOwner } = getCurrentRoom()

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

      // Use same renderer as PresentationPanel, with density from room state
      const density = (state.presentation_density === 2 ? 2 : 4) as 4 | 2
      const presentation = PresentationRenderer.render(song.display, density)

      const sectionIndex = state.live_section_index ?? 0
      const slideIndex = state.live_slide_index ?? 0

      const section = presentation.sections[sectionIndex]
      if (!section) {
        console.warn('[ViewPage] Section not found at index', sectionIndex)
        setCurrentSlide(null)
        return
      }

      const slide = section.slides[slideIndex]
      if (!slide) {
        console.warn('[ViewPage] Slide not found at index', slideIndex)
        setCurrentSlide(null)
        return
      }

      const key = `${state.live_song_id}-${sectionIndex}-${slideIndex}`
      if (key === prevSlideKey.current) return // Avoid re-renders for same slide
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
    // ── BroadcastChannel: same-device mode (no room) ────────────────────────
    // This handles same-device use: controller & view in separate tabs/windows
    const bc = new BroadcastChannel('song-viewer')

    bc.onmessage = (event) => {
      const message = event.data
      if (message.type === 'SELECT_BLOCK' && message.blockId === 'dynamic') {
        setConnectionStatus('broadcast')
        setIsConnected(true)
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

    // ── Supabase Realtime: cross-device mode (room joined) ──────────────────
    let unsubscribeRoom: (() => void) | null = null

    if (roomId && !isOwner) {
      setConnectionStatus('connecting')

      // Fetch initial state immediately so viewer shows current slide on load
      getRoomState(roomId).then((state) => {
        if (state) {
          setIsConnected(true)
          setConnectionStatus('connected')
          renderRoomState(state)
        }
      })

      // Subscribe to live state changes via Supabase Realtime
      unsubscribeRoom = subscribeToRoomState(roomId, (state) => {
        setIsConnected(true)
        setConnectionStatus('connected')
        renderRoomState(state)
      })
    } else if (!roomId) {
      // No room — just listening to BroadcastChannel
      setConnectionStatus('broadcast')
      setIsConnected(true)
    }

    return () => {
      bc.close()
      if (unsubscribeRoom) unsubscribeRoom()
    }
  }, [roomId, isOwner])

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

      {/* Connection indicator (top-left, barely visible) */}
      {isConnected && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-20 hover:opacity-60 transition-opacity">
          <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`} />
          <span className="text-[10px] text-white font-mono">
            {connectionStatus === 'connected' ? 'ROOM' : 'LOCAL'}
          </span>
        </div>
      )}

      {/* Embedded CSS for animations */}
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
