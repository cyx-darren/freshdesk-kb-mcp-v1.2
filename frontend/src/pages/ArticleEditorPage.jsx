import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navigation from '../components/Navigation.jsx'
import ArticleEditor from '../components/ArticleEditor.jsx'
import DraftsManager from '../components/DraftsManager.jsx'

const ArticleEditorPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentView, setCurrentView] = useState('editor') // 'editor' or 'drafts'
  const [editorData, setEditorData] = useState({
    originalQuestion: '',
    aiResponse: '',
    initialDraft: null
  })

  // Check for navigation state from AdminQuestions or other sources
  useEffect(() => {
    if (location.state) {
      const { originalQuestion, aiResponse, feedbackType, feedbackId, showDrafts } = location.state
      if (originalQuestion || feedbackId) {
        setEditorData({
          originalQuestion: originalQuestion || '',
          aiResponse: aiResponse || '',
          feedbackType,
          feedbackId,
          initialDraft: null
        })
        
        // If showDrafts is true, start with drafts view
        setCurrentView(showDrafts ? 'drafts' : 'editor')
        
        // Clear the navigation state to prevent reopening on refresh
        navigate(location.pathname, { replace: true })
      }
    }
  }, [location.state, navigate, location.pathname])

  // Check if data was passed from admin questions
  const isFromAdminQuestions = location.state?.feedbackId

  const handleSwitchToEditor = (draftData = null) => {
    if (draftData) {
      setEditorData(prevData => ({
        ...prevData, // Preserve existing data including feedbackId
        originalQuestion: draftData.original_question || '',
        aiResponse: draftData.ai_response || '',
        initialDraft: draftData
      }))
    }
    setCurrentView('editor')
  }

  const handleSwitchToDrafts = () => {
    setCurrentView('drafts')
  }

  const handleEditDraft = (draft) => {
    setEditorData(prevData => ({
      ...prevData, // Preserve existing data including feedbackId
      originalQuestion: draft.original_question || '',
      aiResponse: draft.ai_response || '',
      initialDraft: draft
    }))
    setCurrentView('editor')
  }

  const handleCloseEditor = () => {
    // If came from admin questions, go back there
    if (isFromAdminQuestions) {
      navigate('/admin/questions')
    } else {
      // Otherwise, allow switching between views
      setCurrentView('drafts')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 py-2 text-sm text-gray-500">
            <button 
              onClick={() => navigate('/admin/questions')}
              className="hover:text-gray-700 transition-colors"
            >
              ELSA Admin
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">
              {currentView === 'drafts' ? 'My Drafts' : 'Article Editor'}
            </span>
          </div>
          
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {isFromAdminQuestions 
                  ? 'ELSA - Create Knowledge Base Article' 
                  : 'ELSA - Knowledge Base Article Editor'
                }
              </h1>
              
              {/* Context indicator */}
              {isFromAdminQuestions && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  From ELSA Admin
                </span>
              )}
            </div>

            {/* Navigation tabs - only show if not from admin questions */}
            {!isFromAdminQuestions && (
              <div className="flex items-center space-x-4">
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => handleSwitchToEditor()}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      currentView === 'editor'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    📝 New Article
                  </button>
                  <button
                    onClick={handleSwitchToDrafts}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      currentView === 'drafts'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    📄 My Drafts
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-64px)]"> {/* 64px for header */}
        {currentView === 'editor' ? (
          <ArticleEditor
            isOpen={true}
            onClose={handleCloseEditor}
            originalQuestion={editorData.originalQuestion}
            aiResponse={editorData.aiResponse}
            initialDraft={editorData.initialDraft}
            feedbackId={editorData.feedbackId}
          />
        ) : (
          <div className="h-full">
            <DraftsManager
              onEditDraft={handleEditDraft}
              onClose={() => setCurrentView('editor')}
              feedbackId={editorData.feedbackId}
              originalQuestion={editorData.originalQuestion}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ArticleEditorPage