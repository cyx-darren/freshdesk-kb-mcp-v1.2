import React from 'react'
import AiResponseFeedback from './AiResponseFeedback.jsx'

// Example component showing how to use AiResponseFeedback
const FeedbackExample = () => {
  const sampleQuestion = "How do I reset my password?"
  const sampleAiResponse = "To reset your password, follow these steps:\n1. Go to the login page\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your email for reset instructions\n5. Follow the link in the email to create a new password"

  const handleFeedbackSubmitted = (feedbackData, feedbackType) => {
    console.log('Feedback submitted:', { feedbackData, feedbackType })
    // You can add custom logic here, like showing a toast notification
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">AI Response Example</h2>
      
      {/* User Question */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Question:</h3>
        <p className="text-gray-600 bg-gray-50 p-3 rounded-md">{sampleQuestion}</p>
      </div>

      {/* AI Response */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-2">AI Response:</h3>
        <div className="text-gray-600 bg-blue-50 p-3 rounded-md whitespace-pre-line">
          {sampleAiResponse}
        </div>
      </div>

      {/* Feedback Component */}
      <div className="border-t pt-4">
        <AiResponseFeedback
          question={sampleQuestion}
          aiResponse={sampleAiResponse}
          onFeedbackSubmitted={handleFeedbackSubmitted}
          showLabels={true}
          className="w-full"
        />
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h4 className="font-semibold text-gray-700 mb-2">How to integrate:</h4>
        <pre className="text-sm text-gray-600 overflow-x-auto">
{`import { AiResponseFeedback } from '../components/Feedback'

// In your component:
<AiResponseFeedback
  question={userQuestion}
  aiResponse={aiResponseText}
  onFeedbackSubmitted={(data, type) => {
    console.log('Feedback:', data, type)
  }}
  showLabels={true}
  className="mt-4"
/>`}
        </pre>
      </div>
    </div>
  )
}

export default FeedbackExample 