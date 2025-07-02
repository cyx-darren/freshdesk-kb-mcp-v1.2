import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SupabaseProvider from './contexts/SupabaseContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Footer from './components/Footer.jsx'
import Login from './pages/Login.jsx'
import Chat from './pages/Chat.jsx'
import AdminQuestions from './pages/AdminQuestions.jsx'
import AdminQuestionsTest from './pages/AdminQuestionsTest.jsx'
import AdminBugReports from './pages/AdminBugReports.jsx'
import AdminFeatureRequests from './pages/AdminFeatureRequests.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ArticleEditorPage from './pages/ArticleEditorPage.jsx'
import PlaywrightDemo from './components/PlaywrightDemo.jsx'

function App() {
  return (
    <BrowserRouter>
      <SupabaseProvider>
      <div className="min-h-screen bg-gray-50 pb-16">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute><AdminQuestions /></ProtectedRoute>} />
            <Route path="/admin/test" element={<ProtectedRoute><AdminQuestionsTest /></ProtectedRoute>} />
            <Route path="/admin/bugs" element={<ProtectedRoute><AdminBugReports /></ProtectedRoute>} />
            <Route path="/admin/features" element={<ProtectedRoute><AdminFeatureRequests /></ProtectedRoute>} />
            <Route path="/admin/playwright" element={<ProtectedRoute><PlaywrightDemo /></ProtectedRoute>} />
            <Route path="/article-editor" element={<ProtectedRoute><ArticleEditorPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Footer />
          </div>
      </SupabaseProvider>
    </BrowserRouter>
  )
}

export default App 