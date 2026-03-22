import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Prompts from './pages/Prompts'
import ReviewInstance from './pages/ReviewInstance'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/review/:id" element={<ReviewInstance />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
