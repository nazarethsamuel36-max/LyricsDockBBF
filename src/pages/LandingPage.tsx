import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { createRoom, joinRoom } from '../services/RoomService'
import { batchDownloadSongs } from '../services/DataService'

function LandingPage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState<string | null>(null)
  const [roomPassword, setRoomPassword] = useState('')
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [isDownloadingSongs, setIsDownloadingSongs] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null)

  const base = window.location.origin
  const controllerUrl = `${base}/controller`
  const viewUrl = `${base}/view`

  const handleCopy = (url: string, type: string) => {
    navigator.clipboard.writeText(url)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true)
    setRoomError(null)
    
    const result = await createRoom()
    
    if (result) {
      // Navigate to controller with room context
      navigate('/controller')
    } else {
      setRoomError('Failed to create room. Please try again.')
    }
    
    setIsCreatingRoom(false)
  }

  const handleJoinRoom = async () => {
    if (!roomPassword.trim()) {
      setRoomError('Please enter a room password')
      return
    }
    
    setIsJoiningRoom(true)
    setRoomError(null)
    
    const room = await joinRoom(roomPassword.trim().toUpperCase())
    
    if (room) {
      // Navigate to view as a receiver
      navigate('/view')
    } else {
      setRoomError('Room not found or inactive. Please check the password.')
    }
    
    setIsJoiningRoom(false)
  }

  const handleDownloadSongs = async () => {
    setIsDownloadingSongs(true)
    setDownloadProgress(0)
    setDownloadMessage('Preparing download...')

    const result = await batchDownloadSongs((percent, message) => {
      setDownloadProgress(percent)
      setDownloadMessage(message)
    })

    if (result === 'completed' || result === 'skipped') {
      setDownloadProgress(100)
      setDownloadMessage(result === 'skipped' ? 'Songs are already ready in IndexedDB.' : 'All songs are ready in IndexedDB.')
    } else {
      setDownloadMessage('Download failed. Check your internet connection and try again.')
    }
    setIsDownloadingSongs(false)
  }

  return (
    <div className="flex justify-center h-screen bg-black">
      <div className="flex flex-col w-full max-w-md bg-[#121214] overflow-hidden md:border-x md:border-zinc-850">
        
        {/* Header */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <h1 className="text-3xl font-semibold text-zinc-100 mb-2">
            Worship Runtime
          </h1>
          <p className="text-sm text-zinc-500 mb-12">
            Presentation Controller System
          </p>

          {/* Join Room */}
          <div className="w-full mb-6 bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80">
            <label className="block text-xs text-zinc-400 mb-2">
              Enter Room Password
            </label>
            <input
              type="text"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value.toUpperCase())}
              placeholder="CHURCH24"
              className="w-full px-4 py-2.5 bg-[#121214] rounded-lg text-sm text-zinc-200 placeholder-zinc-500 border border-zinc-800/80 focus:outline-none focus:border-zinc-700 transition-all uppercase"
              maxLength={8}
            />
            <button
              onClick={handleJoinRoom}
              disabled={isJoiningRoom}
              className="w-full mt-3 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
            >
              {isJoiningRoom ? 'Joining Room...' : 'Join Room'}
            </button>
            {roomError && (
              <p className="mt-3 text-xs text-red-400 text-center">
                {roomError}
              </p>
            )}
          </div>

          {/* Controller Section */}
          <div className="w-full mb-6">
            <h2 className="text-lg font-medium text-zinc-200 mb-3">
              Controller (Dock)
            </h2>
            <div className="bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80">
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/controller')}
                  className="flex-1 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => handleCopy(controllerUrl, 'controller')}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
                >
                  {copied === 'controller' ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>

          {/* Presentation View Section */}
          <div className="w-full mb-8">
            <h2 className="text-lg font-medium text-zinc-200 mb-3">
              Presentation View
            </h2>
            <div className="bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80">
              <code className="block text-xs text-zinc-400 mb-4 break-all text-center">
                {viewUrl}
              </code>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/view')}
                  className="flex-1 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => handleCopy(viewUrl, 'view')}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
                >
                  {copied === 'view' ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>

          {/* Offline Song Download */}
          <div className="w-full mb-8">
            <h2 className="text-lg font-medium text-zinc-200 mb-3">
              Offline Songs
            </h2>
            <div className="bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80">
              <p className="text-xs text-zinc-500 mb-3">
                Download songs to this device so presentation loading can use IndexedDB.
              </p>
              <button
                onClick={handleDownloadSongs}
                disabled={isDownloadingSongs}
                className="w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isDownloadingSongs ? `Downloading ${downloadProgress}%...` : 'Download Songs'}
              </button>
              {downloadMessage && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${downloadProgress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">{downloadMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Presentation Room Section */}
          <div className="w-full">
            <h2 className="text-lg font-medium text-zinc-200 mb-3">
              Presentation Room
            </h2>
            
            {/* Create Room */}
            <div className="bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80 mb-3">
              <button
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
                className="w-full px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
              >
                {isCreatingRoom ? 'Creating Room...' : 'Create Room'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default LandingPage
