import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../services/RoomService'

const QrScanner = lazy(() => import('../components/QrScanner'))

function LandingPage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState<string | null>(null)
  const [isCreatingQrRoom, setIsCreatingQrRoom] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)

  const base = window.location.origin
  const controllerUrl = `${base}/controller`
  const viewUrl = `${base}/view`

  const handleCopy = (url: string, type: string) => {
    navigator.clipboard.writeText(url)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCreateQrRoom = async () => {
    setIsCreatingQrRoom(true)
    setRoomError(null)

    const result = await createRoom()

    if (result) {
      navigate(`/view?room=${result.password}&qr=1`)
    } else {
      setRoomError('Failed to create room. Please try again.')
    }

    setIsCreatingQrRoom(false)
  }

  const handleQrScan = (value: string) => {
    setIsScannerOpen(false)

    try {
      const scannedUrl = new URL(value)
      const match = scannedUrl.pathname.match(/^\/join\/([a-z0-9-]+)\/?$/i)
      if (!match) throw new Error('Invalid room QR code')

      const role = scannedUrl.searchParams.get('role') === 'viewer' ? 'viewer' : 'controller'
      navigate(`/join/${encodeURIComponent(match[1])}?role=${role}`)
    } catch {
      setRoomError('Invalid room QR code. Scan a room QR code to connect.')
    }
  }

  return (
    <div className="flex justify-center h-screen bg-black">
      <div className="flex flex-col w-full max-w-md md:max-w-4xl lg:max-w-6xl min-h-screen bg-[#121214] overflow-y-auto md:border-x md:border-zinc-850">
        
        {/* Header */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 py-12">
          <h1 className="text-3xl font-semibold text-zinc-100 mb-2">
            Worship Runtime
          </h1>
          <p className="text-sm text-zinc-500 mb-12">
            Presentation Controller System
          </p>

          {/* Presentation Room */}
          <div className="w-full mb-6">
            <h2 className="text-lg font-medium text-zinc-200 mb-3">
              Presentation Room
            </h2>
            <div className="bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCreateQrRoom}
                  disabled={isCreatingQrRoom}
                  className="min-h-12 rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-colors hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {isCreatingQrRoom ? 'Creating...' : 'Create QR'}
                </button>
                <button
                  onClick={() => {
                    setRoomError(null)
                    setIsScannerOpen(true)
                  }}
                  disabled={isCreatingQrRoom}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-zinc-700 px-3 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" />
                    <path d="M8 8h3v3H8zM15 8h1M8 15h1M14 14h3v3h-3z" />
                  </svg>
                  Scan QR
                </button>
              </div>

            </div>
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

        </div>
      </div>
      {isScannerOpen && (
        <Suspense fallback={null}>
          <QrScanner
            onScan={handleQrScan}
            onClose={() => setIsScannerOpen(false)}
          />
        </Suspense>
      )}
    </div>

  )
}

export default LandingPage
