import { useNavigate } from 'react-router-dom'
import SetlistPanel from '../components/SetlistPanel'
import BottomNavigation from '../components/BottomNavigation'

function SetlistPage() {
  const navigate = useNavigate()

  const handleSongSelect = () => {
    navigate('/presenter')
  }

  return (
    <div className="flex justify-center h-screen bg-black">
      <div className="flex flex-col w-full max-w-md bg-[#121214] overflow-hidden md:border-x md:border-zinc-850">

        {/* ── Setlist fills all available space ── */}
        <div className="flex-1 overflow-hidden">
          <SetlistPanel onSongSelect={handleSongSelect} />
        </div>

        {/* ── Bottom Navigation ── */}
        <div className="flex-shrink-0 bg-[#121214] border-t border-zinc-800/80 shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
          <BottomNavigation />
        </div>

      </div>
    </div>
  )
}

export default SetlistPage
