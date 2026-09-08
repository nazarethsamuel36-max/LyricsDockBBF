import BottomNavigation from '../components/BottomNavigation'
import RoomManager from '../components/RoomManager'

function RoomInfoPage() {
  return (
    <div className="flex justify-center h-dvh bg-black">
      <div className="flex flex-col min-h-0 w-full max-w-md md:max-w-5xl lg:max-w-7xl bg-[#121214] overflow-hidden md:border-x md:border-zinc-850">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-zinc-100">Room Info</h1>
            <p className="mt-1 text-xs text-zinc-500">QR code, room password, and presentation link</p>
          </div>
          <RoomManager />
        </div>
        <BottomNavigation />
      </div>
    </div>
  )
}

export default RoomInfoPage
