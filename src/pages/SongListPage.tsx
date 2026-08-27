import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import SongLibrary from '../components/SongLibrary'
import BottomNavigation from '../components/BottomNavigation'

function SongListPage() {
  const navigate = useNavigate()
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const setCurrentSongId = useStore((s) => s.setCurrentSongId)

  const handleSongSelect = (songId: number) => {
    setCurrentSongId(songId)
    navigate('/presenter')
  }

  return (
    <div className="flex justify-center h-screen bg-black">
      <div className="flex flex-col w-full max-w-md md:max-w-5xl lg:max-w-7xl bg-[#121214] overflow-hidden md:border-x md:border-zinc-850">

        {/* ── Region 1: Song List ── fills remaining space ── */}
        <div className="flex-1 overflow-hidden">
          <SongLibrary onSongSelect={handleSongSelect} />
        </div>

        {/* ── Bottom Sheet ── thumb-reachable controls ── */}
        <div className="flex-shrink-0 bg-[#121214] border-t border-zinc-800/80 shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">

          {/* ── Region 2: Search ── */}
          <div className="px-4 py-3">
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search songs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1e] rounded-xl text-sm text-zinc-200 placeholder-zinc-500 border border-zinc-800/80 focus:outline-none focus:border-zinc-700 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Bottom Navigation ── */}
          <BottomNavigation />
        </div>

      </div>
    </div>
  )
}

export default SongListPage
