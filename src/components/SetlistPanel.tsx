import { useStore } from '../store/useStore'
import type { SetlistItem } from '../db/Database'

interface SetlistPanelProps {
  onSongSelect?: (songId: number) => void
}

function SetlistPanel({ onSongSelect }: SetlistPanelProps) {
  const setlist = useStore((s) => s.setlist)
  const removeFromSetlist = useStore((s) => s.removeFromSetlist)
  const reorderSetlist = useStore((s) => s.reorderSetlist)
  const currentSongId = useStore((s) => s.currentSongId)
  const setCurrentSongId = useStore((s) => s.setCurrentSongId)

  const handleSelect = (songId: number) => {
    setCurrentSongId(songId)
    onSongSelect?.(songId)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (dragIndex !== dropIndex) reorderSetlist(dragIndex, dropIndex)
  }

  return (
    <div className="flex flex-col h-full bg-[#121214]">

      {/* Setlist header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Setlist</span>
        {setlist.length > 0 && (
          <span className="text-xs text-zinc-500">{setlist.length} song{setlist.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="h-px bg-zinc-800 mx-4 mb-1" />

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {setlist.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            No songs yet — add from the Songs tab
          </div>
        ) : (
          setlist.map((item: SetlistItem, index: number) => {
            const isActive = currentSongId === item.songId
            return (
              <div key={item.id}>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => item.songId && handleSelect(item.songId)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-zinc-800/80'
                      : 'hover:bg-zinc-800/30 active:bg-zinc-800/50'
                  }`}
                >
                  {/* Drag handle */}
                  <span className="text-zinc-500 cursor-grab select-none text-sm leading-none">⠿</span>

                  {/* Order index */}
                  <span className={`flex-shrink-0 w-5 text-right text-xs font-mono tabular-nums ${
                    isActive ? 'text-white font-bold' : 'text-zinc-500'
                  }`}>
                    {index + 1}
                  </span>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate leading-snug ${
                      isActive ? 'text-white' : 'text-zinc-300'
                    }`}>
                      {item.type === 'marker' ? item.label : `Song #${item.songId}`}
                    </div>
                    {item.transpose && item.transpose !== 0 && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Capo {item.transpose > 0 ? '+' : ''}{item.transpose}
                      </div>
                    )}
                  </div>

                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white" />
                  )}

                  {/* Remove */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromSetlist(item.id) }}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 active:scale-95 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {index < setlist.length - 1 && (
                  <div className="h-px bg-zinc-800/60 mx-4" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default SetlistPanel
