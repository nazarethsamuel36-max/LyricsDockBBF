import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getSongs } from '../services/DataService'
import { SearchEngine } from '../utils/SearchEngine'
import type { SongIndex } from '../db/Database'

interface SongLibraryProps {
  onSongSelect?: (songId: number) => void
}

function SongLibrary({ onSongSelect }: SongLibraryProps) {
  const selectedLanguage = useStore((s) => s.selectedLanguage)
  const searchQuery = useStore((s) => s.searchQuery)
  const addToSetlist = useStore((s) => s.addToSetlist)

  const [allSongs, setAllSongs] = useState<SongIndex[]>([])
  const [filteredSongs, setFilteredSongs] = useState<(SongIndex & { score?: number; matchType?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadSongs() }, [])

  useEffect(() => {
    if (allSongs.length === 0) return
    let songs = allSongs
    if (selectedLanguage !== 'All') {
      songs = songs.filter(s => s.language?.toLowerCase() === selectedLanguage.toLowerCase())
    }
    if (searchQuery.trim()) {
      setFilteredSongs(SearchEngine.searchWithLimit(songs, searchQuery, 50))
    } else {
      setFilteredSongs(songs)
    }
  }, [selectedLanguage, searchQuery, allSongs])

  const loadSongs = async () => {
    try {
      setLoading(true)
      const songs = await getSongs()
      setAllSongs(songs)
      if (songs.length > 0) await SearchEngine.indexSongs(songs)
      setFilteredSongs(songs)
    } catch (err) {
      console.error('Failed to load songs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToSetlist = (e: React.MouseEvent, song: SongIndex) => {
    e.stopPropagation()
    addToSetlist({ id: crypto.randomUUID(), type: 'song', songId: song.id, order: 0 })
  }

  return (
    <div className="flex flex-col h-full bg-[#121214]">
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-500 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin" />
            Loading…
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            {searchQuery ? 'No songs match your search' : 'No songs available'}
          </div>
        ) : (
          filteredSongs.map((song, index) => (
            <div key={song.id}>
              <div
                onClick={() => onSongSelect?.(song.id)}
                className="flex items-center gap-3 px-4 py-3 active:bg-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
              >
                {/* Song number */}
                <span className="flex-shrink-0 w-10 text-right text-xs font-mono text-zinc-500 tabular-nums">
                  #{song.songNumber}
                </span>

                {/* Title + language */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-200 truncate leading-snug">
                    {song.title}
                  </div>
                  {(song.language || song.artist) && (
                    <div className="text-xs text-zinc-500 truncate mt-0.5">
                      {[song.language, song.artist].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                {/* Add to setlist */}
                <button
                  onClick={(e) => handleAddToSetlist(e, song)}
                  title="Add to setlist"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Thin divider — skip after last item */}
              {index < filteredSongs.length - 1 && (
                <div className="h-px bg-zinc-800/60 mx-4" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default SongLibrary
