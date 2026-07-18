import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

function LandingPage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState<string | null>(null)

  const base = window.location.origin
  const controllerUrl = `${base}/controller`
  const viewUrl = `${base}/view`

  const handleCopy = (url: string, type: string) => {
    navigator.clipboard.writeText(url)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
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

          {/* Controller Section */}
          <div className="w-full mb-6">
            <h2 className="text-lg font-medium text-zinc-200 mb-3">
              Controller (Dock)
            </h2>
            <div className="bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80">
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    value={controllerUrl}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>
              <code className="block text-xs text-zinc-400 mb-4 break-all text-center">
                {controllerUrl}
              </code>
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
          <div className="w-full">
            <h2 className="text-lg font-medium text-zinc-200 mb-3">
              Presentation View
            </h2>
            <div className="bg-[#1a1a1e] rounded-xl p-4 border border-zinc-800/80">
              <code className="block text-xs text-zinc-400 mb-4 break-all">
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
    </div>
  )
}

export default LandingPage
