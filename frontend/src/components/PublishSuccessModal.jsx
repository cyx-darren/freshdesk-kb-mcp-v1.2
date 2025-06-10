import React from 'react'

const PublishSuccessModal = ({ 
  isOpen, 
  onClose, 
  articleTitle, 
  articleId, 
  onViewArticle, 
  onCreateAnother, 
  onBackToQuestions 
}) => {
  if (!isOpen) return null

  const handleViewArticle = () => {
    if (articleId) {
      window.open(`https://easyprint.freshdesk.com/a/solutions/articles/${articleId}`, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            ✅ Article Published Successfully!
          </h2>
          <p className="text-gray-600 text-center text-sm">
            ELSA has successfully published your article to Freshdesk and it's now live.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Article Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Article Title:</span>
                  <p className="text-sm text-gray-900 font-medium">"{articleTitle}"</p>
                </div>
                {articleId && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Article ID:</span>
                    <p className="text-sm text-gray-900 font-mono">#{articleId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Direct link */}
            {articleId && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Article URL:
                </p>
                <a 
                  href={`https://easyprint.freshdesk.com/a/solutions/articles/${articleId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  https://easyprint.freshdesk.com/a/solutions/articles/{articleId}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 rounded-b-xl">
          <div className="space-y-3">
            {/* Primary action */}
            <button
              onClick={handleViewArticle}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M17 8l4-4m0 0l-4-4m4 4H7" />
              </svg>
              View Article in Freshdesk
            </button>

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCreateAnother}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Another
              </button>
              <button
                onClick={onBackToQuestions}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Questions
              </button>
            </div>

            {/* Tertiary action */}
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
            >
              Continue Editing
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublishSuccessModal 