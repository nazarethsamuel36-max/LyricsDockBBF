import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getCurrentRoom, leaveRoom, endRoom } from '../services/RoomService'

function RoomManager() {
  const { roomId, password, isOwner } = getCurrentRoom()
  const [copied, setCopied] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  if (!roomId || !password) {
    return null
  }

  const base = window.location.origin
  const joinUrl = `${base}/join/${password}`

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyJoinUrl = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeaveRoom = async () => {
    setIsLeaving(true)
    await leaveRoom()
    window.location.href = '/'
  }

  const handleEndRoom = async () => {
    if (!confirm('Are you sure you want to end this room? All participants will be disconnected.')) {
      return
    }
    setIsEnding(true)
    await endRoom(roomId)
    window.location.href = '/'
  }

  return (
    <div className="bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-200">
          Room Active
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-zinc-400">{password}</span>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-4">
        <div className="bg-white p-3 rounded-lg">
          <QRCodeSVG
            value={joinUrl}
            size={120}
            level="M"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleCopyPassword}
          className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? 'Password Copied!' : 'Copy Password'}
        </button>
        
        <button
          onClick={handleCopyJoinUrl}
          className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? 'Link Copied!' : 'Copy Join Link'}
        </button>

        {isOwner ? (
          <button
            onClick={handleEndRoom}
            disabled={isEnding}
            className="w-full px-4 py-2 bg-red-900/50 hover:bg-red-900/70 disabled:bg-red-900/30 disabled:text-red-400/50 text-red-200 rounded-lg text-sm font-medium transition-colors"
          >
            {isEnding ? 'Ending Room...' : 'End Room'}
          </button>
        ) : (
          <button
            onClick={handleLeaveRoom}
            disabled={isLeaving}
            className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
          >
            {isLeaving ? 'Leaving...' : 'Leave Room'}
          </button>
        )}
      </div>
    </div>
  )
}

export default RoomManager
