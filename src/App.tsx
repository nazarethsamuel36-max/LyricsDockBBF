import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import JoinPage from './pages/JoinPage'
import SongListPage from './pages/SongListPage'
import SetlistPage from './pages/SetlistPage'
import SongPresenterPage from './pages/SongPresenterPage'
import ViewPage from './pages/ViewPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/join/:password" element={<JoinPage />} />
        <Route path="/controller" element={<SongListPage />} />
        <Route path="/songs" element={<Navigate to="/controller" replace />} />
        <Route path="/setlist" element={<SetlistPage />} />
        <Route path="/presenter" element={<SongPresenterPage />} />
        <Route path="/view" element={<ViewPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
