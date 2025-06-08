import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SupabaseProvider from './contexts/SupabaseContext.jsx'
import Login from './pages/Login.jsx'
import Chat from './pages/Chat.jsx'

function App() {
  return (
    <BrowserRouter>
      <SupabaseProvider>
      <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </div>
      </SupabaseProvider>
    </BrowserRouter>
  )
}

export default App 