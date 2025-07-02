import React, { useState } from 'react'
import { ChatMessageFeedback } from './Feedback'
import elsaAvatar from '../assets/images/elsa-avatar.png'
import elsaAvatarSmall from '../assets/images/elsa-avatar-small.png'

const ChatMessage = ({ message, onCitationClick }) => {
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
    // Pattern to match existing citations like [Article 123] or [ID: 456]
    const citationPattern = /\[(?:Article\s+)?(?:ID:\s*)?(\d+)\]/gi
    // Pattern to match article references like "Article #123456" or "article #123456"
    const articleRefPattern = /\b(?:Article|article)\s*#(\d+)/gi
    
    const parts = []
    let lastIndex = 0
    
    // Create a combined pattern to find all matches in order
    const combinedPattern = /(\[(?:Article\s+)?(?:ID:\s*)?(\d+)\])|(\b(?:Article|article)\s*#(\d+))/gi
    let match

    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      
      if (match[1]) {
        // This is a citation pattern like [Article 123] - render as button for modal
        const articleId = match[2]
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
      } else if (match[3]) {
        // This is an article reference pattern like "Article #123456" - render as external link
        const articleId = match[4]
        const originalText = match[3] // The full matched text like "Article #123456"
        parts.push(
                     <a
             key={`article-link-${match.index}`}
             href={`https://easyprint.freshdesk.com/a/solutions/articles/${articleId}`}
             target="_blank"
             rel="noopener noreferrer"
             className="article-link"
             title={`Open ${originalText} in Freshdesk`}
           >
            {originalText}
            <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )
      }
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
  }

  // Basic markdown parsing for common formatting
  const parseMarkdown = (text) => {
    if (typeof text !== 'string') return text
    
    // Bold text: **text** or __text__
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>')
    
    // Italic text: *text* or _text_
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
    text = text.replace(/_(.*?)_/g, '<em>$1</em>')
    
    // Code: `code`
    text = text.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Line breaks
    text = text.replace(/\n/g, '<br>')
    
    return text
  }

  // Render message content with markdown and citations
  const renderMessageContent = (text) => {
    const citationParts = parseTextWithCitations(text)
    
    return citationParts.map((part, index) => {
      if (React.isValidElement(part)) {
        // This is a citation button
        return part
      } else {
        // This is text that might contain markdown
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

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-message-in group px-1 sm:px-0`}>
      <div className="flex items-end space-x-2 max-w-[85%] sm:max-w-xs lg:max-w-md xl:max-w-2xl relative">
        {/* Avatar for AI messages */}
        {!isUser && (
          <div className="flex-shrink-0 w-10 h-10 mb-1 group">
            <img 
              src={elsaAvatarSmall} 
              alt="ELSA - Easyprint Learning & Support Assistant"
              className="elsa-avatar w-full h-full rounded-full border-2 border-blue-200 shadow-lg hover:shadow-xl hover:border-blue-300"
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.target.style.display = 'none'
                const fallback = e.target.nextElementSibling
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            {/* Fallback avatar */}
            <div 
              className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg" 
              style={{ display: 'none' }}
            >
              <span className="text-white font-bold text-sm">ELSA</span>
            </div>
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

          {/* Copy button for AI messages */}
          {!isUser && !isError && (
            <div className="flex justify-end mt-2">
              <button
                onClick={copyToClipboard}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                title={copied ? "Copied!" : "Copy message"}
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Feedback buttons for AI messages */}
          {!isUser && !isError && message.originalQuestion && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <ChatMessageFeedback
                question={message.originalQuestion}
                aiResponse={message.text}
                messageId={message.id}
                onFeedbackSubmitted={(result, feedbackType) => {
                  console.log('Feedback submitted:', feedbackType, result)
                }}
              />
            </div>
          )}

          {/* Message status indicators */}
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

export default ChatMessage 