import { useLocation, useNavigate } from 'react-router-dom'

function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) =>
    path === '/songs' ? location.pathname === '/songs' || location.pathname === '/'
    : location.pathname === path

  return (
    <div className="flex border-t border-zinc-800 bg-[#121214]">
      {/* Songs Tab */}
      <button
        onClick={() => navigate('/songs')}
        className={`flex-1 py-4 text-center text-sm font-semibold tracking-wide transition-all ${
          isActive('/songs')
            ? 'text-white bg-[#1a1a1e]'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Songs
      </button>

      {/* Divider */}
      <div className="w-px bg-zinc-800" />

      {/* Setlist Tab */}
      <button
        onClick={() => navigate('/setlist')}
        className={`flex-1 py-4 text-center text-sm font-semibold tracking-wide transition-all ${
          isActive('/setlist')
            ? 'text-white bg-[#1a1a1e]'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Setlist
      </button>

      {/* Divider */}
      <div className="w-px bg-zinc-800" />

      {/* Room Info Tab */}
      <button
        onClick={() => navigate('/room-info')}
        title="Room Info"
        className={`flex-1 py-4 text-center text-sm font-semibold tracking-wide transition-all ${
          isActive('/room-info')
            ? 'text-white bg-[#1a1a1e]'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <span aria-hidden="true" className="mr-1">▣</span>
        Room Info
      </button>
    </div>
  )
}

export default BottomNavigation
