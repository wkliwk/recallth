import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './screens/Landing'
import Chat from './screens/Chat'
import Cabinet from './screens/Cabinet'
import CabinetAdd from './screens/CabinetAdd'
import CabinetDetail from './screens/CabinetDetail'
import Profile from './screens/Profile'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/cabinet" element={<ProtectedRoute><Cabinet /></ProtectedRoute>} />
        <Route path="/cabinet/add" element={<ProtectedRoute><CabinetAdd /></ProtectedRoute>} />
        <Route path="/cabinet/:id" element={<ProtectedRoute><CabinetDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}
