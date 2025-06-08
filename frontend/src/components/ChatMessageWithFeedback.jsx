import React, { useState } from 'react'
import { AiResponseFeedback } from './Feedback'

const ChatMessageWithFeedback = ({ message, userQuestion, onCitationClick, onFeedbackSubmitted }) => {
  const [copied, setCopied] = useState(false)
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Parse text for article citations and make them clickable
  const parseTextWithCitations = (text) => {
    const citationPattern = /\[(?:Article\s+)?(?:ID:\s*)?(\d+)\]/gi
    
    const parts = []
    let lastIndex = 0
    let match

    while ((match = citationPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      
      const articleId = match[1]
      parts.push(
        <button
          key={`citation-${match.index}`}
          onClick={() => onCitationClick && onCitationClick(articleId)}
          className="inline-flex items-center px-2 py-1 mx-0.5 sm:mx-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors cursor-pointer border border-blue-300 touch-manipulation"
          title={`View Article ${articleId}`}
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Article {articleId}
        </button>
      )
      
      lastIndex = match.index + match[0].length
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
  }

  // Basic markdown parsing for common formatting
  const parseMarkdown = (text) => {
    if (typeof text !== 'string') return text
    
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>')
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
    text = text.replace(/_(.*?)_/g, '<em>$1</em>')
    text = text.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    text = text.replace(/\n/g, '<br>')
    
    return text
  }

  // Render message content with markdown and citations
  const renderMessageContent = (text) => {
    const citationParts = parseTextWithCitations(text)
    
    return citationParts.map((part, index) => {
      if (React.isValidElement(part)) {
        return part
      } else {
        const markdownText = parseMarkdown(part)
        return (
          <span 
            key={index}
            dangerouslySetInnerHTML={{ __html: markdownText }}
          />
        )
      }
    })
  }

  const isUser = message.sender === 'user'
  const isError = message.isError
  const isAI = message.sender === 'ai' || message.sender === 'assistant'

  // Copy message to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Handle feedback submission
  const handleFeedbackSubmitted = (feedbackData, feedbackType) => {
    console.log('Feedback submitted for message:', { feedbackData, feedbackType, messageId: message.id })
    
    // Call parent callback if provided
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted(feedbackData, feedbackType, message)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-message-in group px-1 sm:px-0`}>
      <div className="flex items-end space-x-2 max-w-[85%] sm:max-w-xs lg:max-w-md xl:max-w-2xl relative">
        {/* Avatar for AI messages */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mb-1">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : isError
              ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-sm'
              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm hover:border-gray-300'
          }`}
        >
          {/* Message content */}
          <div className="text-sm leading-relaxed">
            {renderMessageContent(message.text)}
          </div>

          {/* Timestamp */}
          <div
            className={`text-xs mt-2 ${
              isUser
                ? 'text-blue-100'
                : isError
                ? 'text-red-500'
                : 'text-gray-500'
            }`}
          >
            {formatTimestamp(message.timestamp)}
          </div>

          {/* Action buttons for AI messages */}
          {!isUser && !isError && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
              {/* Copy button */}
              <button
                onClick={copyToClipboard}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded flex items-center space-x-1"
                title={copied ? "Copied!" : "Copy message"}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-green-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Feedback Component for AI responses */}
          {isAI && !isError && userQuestion && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <AiResponseFeedback
                question={userQuestion}
                aiResponse={message.text}
                onFeedbackSubmitted={handleFeedbackSubmitted}
                showLabels={true}
                className="w-full"
              />
            </div>
          )}

          {/* Message status indicators for user messages */}
          {message.sender === 'user' && (
            <div className="flex justify-end mt-1">
              <svg className="w-3 h-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Avatar for user messages */}
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mb-1">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessageWithFeedback 