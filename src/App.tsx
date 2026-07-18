import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SongListPage from './pages/SongListPage'
import SetlistPage from './pages/SetlistPage'
import SongPresenterPage from './pages/SongPresenterPage'
import ViewPage from './pages/ViewPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/songs" replace />} />
        <Route path="/songs" element={<SongListPage />} />
        <Route path="/setlist" element={<SetlistPage />} />
        <Route path="/presenter" element={<SongPresenterPage />} />
        <Route path="/view" element={<ViewPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
