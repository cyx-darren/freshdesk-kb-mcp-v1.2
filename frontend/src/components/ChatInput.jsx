import React, { useState, useRef, useEffect } from 'react'

const ChatInput = ({ 
  onSendMessage, 
  loading = false, 
  placeholder = "Type your message here... (Press Enter to send, Shift+Enter for new line)" 
}) => {
  const [inputText, setInputText] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      
      // Calculate the number of lines
      const lineHeight = 24 // Approximate line height in pixels
      const minHeight = lineHeight * 1 // 1 row minimum
      const maxHeight = lineHeight * 4 // 4 rows maximum
      
      // Set height based on content, but within min/max bounds
      const scrollHeight = textarea.scrollHeight
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      
      textarea.style.height = `${newHeight}px`
    }
  }

  // Adjust height when text changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [inputText])

  // Handle input change
  const handleInputChange = (e) => {
    setInputText(e.target.value)
  }

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle send message
  const handleSend = () => {
    const trimmedText = inputText.trim()
    console.log('🎯 ChatInput handleSend called with:', trimmedText)
    
    if (!trimmedText || loading) {
      console.log('❌ ChatInput: Empty text or loading, returning early')
      return
    }

    // Call the parent's send message function
    if (onSendMessage) {
      console.log('📞 ChatInput: Calling onSendMessage prop')
      onSendMessage(trimmedText)
    } else {
      console.error('❌ ChatInput: onSendMessage prop is missing!')
    }

    // Clear the input after sending
    setInputText('')
    console.log('🧹 ChatInput: Input cleared')
  }

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault()
    handleSend()
  }

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      <form onSubmit={handleSubmit} className="flex space-x-4">
        {/* Input area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors overflow-y-auto"
            style={{ 
              minHeight: '48px',
              maxHeight: '120px', // 4 rows * ~30px per row
              lineHeight: '24px'
            }}
            disabled={loading}
            rows="1"
          />
          
          {/* Character count (optional) */}
          {inputText.length > 500 && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {inputText.length}/1000
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 self-end"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="hidden sm:inline">Sending...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </button>
      </form>

      {/* Helper text */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>💡 Press Enter to send</span>
          <span>⏎ Shift+Enter for new line</span>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center space-x-2">
          {loading && (
            <div className="flex items-center space-x-1 text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>Typing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInput 