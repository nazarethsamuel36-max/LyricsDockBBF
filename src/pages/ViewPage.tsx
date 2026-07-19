import { useEffect, useState } from 'react'
import { getCurrentRoom, getRoomState, subscribeToRoomState } from '../services/RoomService'
import type { RoomState } from '../services/RoomService'

function ViewPage() {
  const [currentSlide, setCurrentSlide] = useState<{ lines: string[] } | null>(null)
  const { roomId, isOwner } = getCurrentRoom()

  useEffect(() => {
    // Listen to the direct song-viewer broadcast channel for dynamic slides
    const channel = new BroadcastChannel('song-viewer')
    
    channel.onmessage = (event) => {
      const message = event.data
      if (message.type === 'SELECT_BLOCK') {
        if (message.blockId === 'dynamic' && message.lines) {
          setCurrentSlide({
            lines: message.lines
          })
        }
      }
    }

    // If in a room and not the owner, subscribe to room state
    let unsubscribeRoom: (() => void) | null = null
    if (roomId && !isOwner) {
      // Get initial room state
      getRoomState(roomId).then((state) => {
        if (state) {
          syncRoomStateToStore(state)
        }
      })

      // Subscribe to room state updates
      unsubscribeRoom = subscribeToRoomState(roomId, (state) => {
        syncRoomStateToStore(state)
      })
    }

    return () => {
      channel.close()
      if (unsubscribeRoom) {
        unsubscribeRoom()
      }
    }
  }, [roomId, isOwner])

  // Sync room state to local store (this would need to be implemented)
  const syncRoomStateToStore = (state: RoomState) => {
    // This will sync the room state to the local presentation state
    // For now, we'll just log it - the actual sync logic depends on how
    // the presentation state is managed in ViewPage
    console.log('Room state update:', state)
  }

  return (
    <div className="flex h-screen w-screen bg-transparent items-end justify-center pb-[12vh] overflow-hidden select-none">
      {currentSlide ? (
        <div 
          key={currentSlide.lines.join('-')} 
          className="text-center max-w-6xl px-12 animate-[fadeIn_0.3s_ease]"
        >
          {/* Lyrics lines only - lower third, highly readable over video */}
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
