import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './screens/Landing'
import Auth from './screens/Auth'
import Home from './screens/Home'
import Chat from './screens/Chat'
import Cabinet from './screens/Cabinet'
import Profile from './screens/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/home" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/cabinet" element={<Cabinet />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}
