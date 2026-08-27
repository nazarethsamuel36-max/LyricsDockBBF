import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { joinRoom } from '../services/RoomService'

function JoinPage() {
  const { password } = useParams<{ password: string }>()
  const navigate = useNavigate()
  const [isJoining, setIsJoining] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const joinRoomWithPassword = async () => {
      if (!password) {
        setError('No room password provided')
        setIsJoining(false)
        return
      }

      const room = await joinRoom(password.toUpperCase())
      
      if (room) {
        // Successfully joined, navigate to view
        navigate('/view')
      } else {
        setError('Room not found or inactive')
        setIsJoining(false)
      }
    }

    joinRoomWithPassword()
  }, [password, navigate])

  const handleGoToLanding = () => {
    navigate('/')
  }

  return (
    <div className="flex justify-center h-screen bg-black">
      <div className="flex flex-col w-full max-w-md md:max-w-5xl lg:max-w-7xl bg-[#121214] overflow-hidden md:border-x md:border-zinc-850">
        
        {/* Header */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <h1 className="text-3xl font-semibold text-zinc-100 mb-2">
            Worship Runtime
          </h1>
          <p className="text-sm text-zinc-500 mb-12">
            Presentation Controller System
          </p>

          {/* Status */}
          <div className="w-full max-w-sm">
            {isJoining ? (
              <div className="bg-[#1a1a1e] rounded-xl p-6 border border-zinc-800/80 text-center">
                <div className="w-12 h-12 border-4 border-zinc-600 border-t-zinc-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-zinc-200 text-sm">
                  Joining room {password?.toUpperCase()}...
                </p>
              </div>
            ) : error ? (
              <div className="bg-[#1a1a1e] rounded-xl p-6 border border-zinc-800/80 text-center">
                <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-400 text-sm mb-4">
                  {error}
                </p>
                <button
                  onClick={handleGoToLanding}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Go to Landing Page
                </button>
              </div>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  )
}

export default JoinPage
