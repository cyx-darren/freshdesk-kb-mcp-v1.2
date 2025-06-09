import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SupabaseProvider from './contexts/SupabaseContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Chat from './pages/Chat.jsx'
import AdminQuestions from './pages/AdminQuestions.jsx'
import AdminQuestionsTest from './pages/AdminQuestionsTest.jsx'
import ArticleEditorPage from './pages/ArticleEditorPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <SupabaseProvider>
      <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute><AdminQuestions /></ProtectedRoute>} />
            <Route path="/admin/test" element={<ProtectedRoute><AdminQuestionsTest /></ProtectedRoute>} />
            <Route path="/article-editor" element={<ProtectedRoute><ArticleEditorPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </div>
      </SupabaseProvider>
    </BrowserRouter>
  )
}

export default App 