import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navigation from '../components/Navigation.jsx'
import ArticleEditorWorking from '../components/ArticleEditorWorking.jsx'

const ArticleEditorPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [sampleData, setSampleData] = useState({
    originalQuestion: "What is the minimum order quantity (MOQ) for custom lanyards?",
    aiResponse: `<p>The minimum order quantity (MOQ) for custom lanyards varies depending on the type and customization options:</p>

<h3>Standard Lanyards</h3>
<ul>
<li><strong>Polyester Lanyards:</strong> 100 pieces minimum</li>
<li><strong>Nylon Lanyards:</strong> 100 pieces minimum</li>
<li><strong>Cotton Lanyards:</strong> 250 pieces minimum</li>
</ul>

<h3>Premium Options</h3>
<ul>
<li><strong>Woven Lanyards:</strong> 500 pieces minimum</li>
<li><strong>Leather Lanyards:</strong> 100 pieces minimum</li>
<li><strong>Eco-friendly Lanyards:</strong> 250 pieces minimum</li>
</ul>

<h3>Customization Options</h3>
<p>All lanyards can be customized with:</p>
<ul>
<li>Your company logo</li>
<li>Custom text</li>
<li>Choice of colors</li>
<li>Various attachment options (badge clips, key rings, etc.)</li>
</ul>

<p><strong>Note:</strong> For orders below the MOQ, please contact our sales team for special pricing and availability.</p>`,
    initialDraft: null
  })

  // Check for navigation state from AdminQuestions
  useEffect(() => {
    if (location.state) {
      const { originalQuestion, aiResponse, feedbackType, feedbackId } = location.state
      if (originalQuestion) {
        setSampleData({
          originalQuestion,
          aiResponse: aiResponse || '',
          feedbackType,
          feedbackId,
          initialDraft: null
        })
        setIsEditorOpen(true) // Auto-open the editor
        
        // Clear the navigation state to prevent reopening on refresh
        navigate(location.pathname, { replace: true })
      }
    }
  }, [location.state, navigate, location.pathname])

  const handleOpenEditor = () => {
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
  }

  const handleOpenWithDraft = () => {
    setSampleData(prev => ({
      ...prev,
      initialDraft: {
        id: 'draft-123',
        title: 'Lanyard MOQ Guidelines',
        content: prev.aiResponse,
        category: 'products',
        subcategory: 'lanyards',
        tags: 'MOQ, lanyards, minimum order',
        updated_at: new Date().toISOString()
      }
    }))
    setIsEditorOpen(true)
  }

  // Show different content if coming from AdminQuestions
  const isFromAdminQuestions = location.state?.feedbackId

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isFromAdminQuestions ? 'Create Knowledge Base Article' : 'Article Editor Demo'}
          </h1>
          <p className="text-gray-600">
            {isFromAdminQuestions 
              ? 'Create a comprehensive article to address the feedback question'
              : 'Test the article editor component with sample data from a chat conversation.'
            }
          </p>
          {isFromAdminQuestions && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">From Admin Questions:</span> This question was marked as "{sampleData.feedbackType?.replace('_', ' ')}" and needs a knowledge base article.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Question Context - Always show if we have data */}
        {(sampleData.originalQuestion || sampleData.aiResponse) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {isFromAdminQuestions ? 'Feedback Question Context' : 'Sample Chat Context'}
            </h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900 mb-2">User Question:</h3>
                <p className="text-gray-700">{sampleData.originalQuestion}</p>
              </div>
              
              {sampleData.aiResponse && (
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {isFromAdminQuestions ? 'Previous AI Response (needs improvement):' : 'AI Response:'}
                  </h3>
                  <div 
                    className="text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sampleData.aiResponse }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Only show if not from admin questions or editor is closed */}
        {(!isFromAdminQuestions || !isEditorOpen) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {isFromAdminQuestions ? 'Article Editor' : 'Test Article Editor'}
            </h2>
            
            <div className="flex flex-wrap gap-4">
              {isFromAdminQuestions ? (
                <button
                  onClick={handleOpenEditor}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Open Article Editor</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleOpenEditor}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Create New Article</span>
                  </button>
                  
                  <button
                    onClick={handleOpenWithDraft}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Edit Existing Draft</span>
                  </button>
                </>
              )}
              
              <button
                onClick={() => navigate(isFromAdminQuestions ? '/admin/questions' : '/chat')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to {isFromAdminQuestions ? 'Admin Questions' : 'Chat'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Features Overview - Only show for demo mode */}
        {!isFromAdminQuestions && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Article Editor Features</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Rich Text Editing</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Bold, italic, highlight formatting</li>
                  <li>• Headings and lists</li>
                  <li>• Links and images</li>
                  <li>• Live preview mode</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Knowledge Base Integration</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Category and subcategory selection</li>
                  <li>• Tag management</li>
                  <li>• Freshdesk publishing</li>
                  <li>• Draft saving to Supabase</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Context Preservation</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Original question display</li>
                  <li>• AI response reference</li>
                  <li>• Auto-save functionality</li>
                  <li>• Session persistence</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">User Experience</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Responsive design</li>
                  <li>• Keyboard shortcuts</li>
                  <li>• Loading states</li>
                  <li>• Error handling</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Article Editor Modal */}
      <ArticleEditorWorking
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        originalQuestion={sampleData.originalQuestion}
        aiResponse={sampleData.aiResponse}
        initialDraft={sampleData.initialDraft}
      />
    </div>
  )
}

export default ArticleEditorPage