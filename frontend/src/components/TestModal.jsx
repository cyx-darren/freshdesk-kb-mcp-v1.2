import React from 'react'
import ChatMessage from './ChatMessage.jsx'

const TestModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  // Test messages with different article reference patterns
  const testMessages = [
    {
      id: 1,
      text: "The MOQ for lanyards is 50 pieces [Article #151000016631]. This is a strict requirement because the printing machine produces 50 pieces at a time.",
      sender: 'ai',
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      text: "For more details about pricing, please see Article #151000020932. You can also check [Article 123] for additional information.",
      sender: 'ai',
      timestamp: new Date().toISOString()
    },
    {
      id: 3,
      text: "This message contains multiple references: Article #151000016631 and article #151000020932 as well as [ID: 456] for comparison.",
      sender: 'ai',
      timestamp: new Date().toISOString()
    }
  ]

  const handleCitationClick = (articleId) => {
    alert(`Citation clicked for Article ID: ${articleId}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Article Links Test</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Article Reference Patterns Test</h3>
            <p className="text-gray-600 mb-4">
              This test shows different patterns of article references:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-1">
              <li>• <code>Article #123456</code> → External Freshdesk link</li>
              <li>• <code>article #123456</code> → External Freshdesk link (case insensitive)</li>
              <li>• <code>[Article 123]</code> → Modal button (existing functionality)</li>
              <li>• <code>[ID: 456]</code> → Modal button (existing functionality)</li>
            </ul>
          </div>
          
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            {testMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onCitationClick={handleCitationClick}
              />
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Expected behavior:</strong><br/>
              • Links with hashtags (Article #123) should open in new tabs to Freshdesk<br/>
              • Bracketed references [Article 123] should show modal popup alerts<br/>
              • External links should have hover effects and external link icons
            </p>
          </div>
          
          <div className="mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close Test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestModal 