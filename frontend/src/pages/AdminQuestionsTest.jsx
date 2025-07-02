import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import TestModal from '../components/TestModal.jsx'

const AdminQuestionsTest = () => {
  const { user, logout } = useSupabase()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTestModal, setShowTestModal] = useState(false)

  const mockFeedback = [
    {
      id: 1,
      question: "What is the MOQ for lanyards?",
      ai_response: "The minimum order quantity for lanyards is typically 100 pieces...",
      feedback_type: "correct",
      status: "pending",
      created_at: new Date().toISOString(),
      assigned_to_email: null
    },
    {
      id: 2,
      question: "How do I troubleshoot printer issues?",
      ai_response: "To troubleshoot printer issues, first check the connection...",
      feedback_type: "needs_improvement",
      status: "in_progress",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      assigned_to_email: "admin@example.com"
    }
  ]

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    setTimeout(() => {
      setFeedback(mockFeedback)
      setLoading(false)
    }, 1000)
  }, [user, navigate])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Questions Dashboard (Test)</h1>
              <p className="text-sm text-gray-500">Testing version - accessible to all users</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTestModal(true)}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Test Article Links"
              >
                Test Article Links
              </button>
              <button
                onClick={() => navigate('/chat')}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Chat
              </button>
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm font-medium">🎯 Success! You've accessed the admin dashboard!</p>
          <p className="text-blue-700 text-sm mt-1">This shows the admin questions interface is working properly.</p>
          <p className="text-blue-700 text-sm mt-2">
            <strong>New Feature:</strong> Click "Test Article Links" to test the new clickable article references!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Feedback Submissions ({feedback.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading feedback submissions...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedback.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {item.question}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          {item.feedback_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Test Modal */}
      <TestModal 
        isOpen={showTestModal} 
        onClose={() => setShowTestModal(false)} 
      />
    </div>
  )
}

export default AdminQuestionsTest 