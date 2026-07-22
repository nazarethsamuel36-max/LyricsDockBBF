import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getCurrentRoom, leaveRoom, endRoom } from '../services/RoomService'

function RoomManager() {
  const { roomId, password, isOwner } = getCurrentRoom()
  const [copied, setCopied] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  if (!roomId || !password) {
    return null
  }

  const base = window.location.origin
  const joinUrl = `${base}/join/${password}`
  // OBS URL: direct view with auto-join — no redirect, works in OBS browser source
  const obsUrl = `${base}/view?room=${password}`

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
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
          <span className="text-xs text-zinc-400 font-mono tracking-widest">{password}</span>
        </div>
      </div>

      {/* QR Code — points to join URL for phones */}
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

      {/* OBS Link — highlighted prominently */}
      <div className="mb-3 p-3 bg-zinc-900 rounded-lg border border-zinc-700/60">
        <div className="flex items-center gap-1.5 mb-1.5">
          {/* OBS icon-ish dot */}
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">OBS Browser Source</span>
        </div>
        <code className="block text-[10px] text-zinc-500 break-all mb-2 leading-snug">
          {obsUrl}
        </code>
        <button
          onClick={() => handleCopy(obsUrl, 'obs')}
          className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            copied === 'obs'
              ? 'bg-purple-700 text-white'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          {copied === 'obs' ? '✓ Copied!' : 'Copy OBS Link'}
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => handleCopy(password, 'password')}
          className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
        >
          {copied === 'password' ? '✓ Password Copied!' : 'Copy Password'}
        </button>

        <button
          onClick={() => handleCopy(joinUrl, 'join')}
          className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
        >
          {copied === 'join' ? '✓ Link Copied!' : 'Copy Join Link'}
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
