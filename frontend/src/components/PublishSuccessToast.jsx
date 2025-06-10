import React, { useState, useEffect } from 'react'

const PublishSuccessToast = ({ 
  isVisible, 
  onClose, 
  articleTitle, 
  articleId, 
  autoHide = true,
  duration = 5000 
}) => {
  const [isShowing, setIsShowing] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true)
      
      if (autoHide) {
        const timer = setTimeout(() => {
          handleClose()
        }, duration)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isVisible, autoHide, duration])

  const handleClose = () => {
    setIsShowing(false)
    setTimeout(() => {
      onClose()
    }, 300) // Allow animation to complete
  }

  const handleViewArticle = () => {
    if (articleId) {
      window.open(`https://easyprint.freshdesk.com/a/solutions/articles/${articleId}`, '_blank')
    }
  }

  if (!isVisible) return null

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
      isShowing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-sm w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  Article Published!
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {articleTitle}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-3">
            {articleId && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Article ID:</span>
                <span className="font-mono text-gray-700">#{articleId}</span>
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={handleViewArticle}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Article
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar for auto-hide */}
        {autoHide && (
          <div className="h-1 bg-gray-100 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all ease-linear"
              style={{ 
                animation: `shrink ${duration}ms linear`,
                transformOrigin: 'left'
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

export default PublishSuccessToast 