import { useNavigate } from 'react-router-dom'
import PresentationPanel from '../components/PresentationPanel'

function SongPresenterPage() {
  const navigate = useNavigate()

  return (
    <div className="flex justify-center h-screen bg-black">
      <div className="flex flex-col w-full max-w-md bg-[#121214] overflow-hidden md:border-x md:border-zinc-850">

        {/* Thin top bar — just a back arrow, nothing else */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-zinc-800/80">
          <button
            onClick={() => navigate('/songs')}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Library
          </button>
        </div>

        {/* Presentation panel fills everything */}
        <div className="flex-1 overflow-hidden">
          <PresentationPanel />
        </div>

      </div>
    </div>
  )
}

export default SongPresenterPage
