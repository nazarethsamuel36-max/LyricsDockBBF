import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'

interface QrScannerProps {
  onScan: (value: string) => void
  onClose: () => void
}

function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is unavailable in this browser. Use HTTPS or localhost and try a supported browser.')
      return
    }

    let isClosed = false
    let stopScanner: (() => void) | undefined
    const reader = new BrowserQRCodeReader()

    void reader.decodeFromVideoDevice(undefined, video, (result, _error, controls) => {
      if (isClosed || !result) return
      controls.stop()
      onScanRef.current(result.getText())
    }).then((controls) => {
      stopScanner = () => controls.stop()
      if (isClosed) stopScanner()
    }).catch(() => {
      if (!isClosed) {
        setCameraError('Camera permission was denied or the camera is unavailable. Allow access in your browser settings and try again.')
      }
    })

    return () => {
      isClosed = true
      stopScanner?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-[#171719] p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="qr-scanner-title" className="text-base font-semibold text-zinc-100">Scan room QR code</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close scanner"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline />
        </div>
        <p className="mt-3 text-center text-sm text-zinc-300">Point the camera at the QR code on the other device.</p>
        {cameraError && (
          <p role="alert" className="mt-3 rounded-lg border border-red-900/70 bg-red-950/40 p-3 text-sm text-red-300">
            {cameraError}
          </p>
        )}
      </div>
    </div>
  )
}

export default QrScanner