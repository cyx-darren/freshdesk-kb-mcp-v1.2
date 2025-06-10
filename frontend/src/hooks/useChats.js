import { useState, useEffect, useCallback } from 'react'
import { chatService } from '../services/api.js'

const useChats = (onSessionCreated = null) => {
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionTitle, setSessionTitle] = useState('')

  // Auto-save current session to localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('elsa_current_session_id', currentSessionId)
    } else {
      localStorage.removeItem('elsa_current_session_id')
    }
  }, [currentSessionId])

  // Load messages for a specific session
  const loadSession = useCallback(async (sessionId) => {
    if (!sessionId) return

    try {
      setLoading(true)
      setError('')
      
      const response = await chatService.getSessionMessages(sessionId)
      
      // Transform messages to match the expected format
      const transformedMessages = response.messages?.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role === 'user' ? 'user' : 'ai',
        timestamp: new Date(msg.created_at),
        citations: msg.metadata?.articles || [],
        status: 'success',
        originalQuestion: msg.role === 'assistant' ? 
          getPreviousUserMessage(response.messages, msg) : undefined
      })) || []

      setMessages(transformedMessages)
      setCurrentSessionId(sessionId)
      
      // Set session title from first user message
      const firstUserMessage = response.messages?.find(msg => msg.role === 'user')
      if (firstUserMessage) {
        setSessionTitle(generateSessionTitle(firstUserMessage.content))
      }
      
    } catch (error) {
      console.error('Failed to load session:', error)
      setError('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load saved session on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('elsa_current_session_id')
    if (savedSessionId) {
      loadSession(savedSessionId)
    }
  }, [loadSession])

  // Helper function to get the user message that prompted an assistant response
  const getPreviousUserMessage = (allMessages, assistantMessage) => {
    const messageIndex = allMessages.findIndex(msg => msg.id === assistantMessage.id)
    if (messageIndex > 0) {
      const previousMessage = allMessages[messageIndex - 1]
      return previousMessage.role === 'user' ? previousMessage.content : undefined
    }
    return undefined
  }

  // Start a new chat session
  const startNewChat = useCallback(() => {
    setCurrentSessionId(null)
    setMessages([])
    setError('')
    setSessionTitle('')
    localStorage.removeItem('elsa_current_session_id')
  }, [])

  // Send a message (creates session if needed)
  const sendMessage = useCallback(async (messageText) => {
    console.log('🚀 [useChats] sendMessage called with:', messageText)
    console.log('🔍 [useChats] Current session ID:', currentSessionId)
    console.log('📝 [useChats] Current session title:', sessionTitle)
    
    if (!messageText.trim()) return null

    // Add user message immediately to UI
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setError('')

    try {
      setLoading(true)
      
      console.log('📡 [useChats] Sending message to backend...')
      // Send message to backend (creates session if needed)
      const response = await chatService.sendMessage(messageText, currentSessionId)
      console.log('✅ [useChats] Backend response:', response)
      
      // Update current session ID if this was a new chat
      if (!currentSessionId && response.sessionId) {
        console.log('🆕 [useChats] New session created:', response.sessionId)
        setCurrentSessionId(response.sessionId)
        
        // Notify parent component that a new session was created
        if (onSessionCreated) {
          console.log('📢 [useChats] Notifying parent about new session')
          onSessionCreated(response.sessionId)
        }
      } else if (currentSessionId) {
        console.log('♻️ [useChats] Using existing session:', currentSessionId)
      } else {
        console.warn('⚠️ [useChats] No session ID in response!', response)
      }

      // Add AI response to messages
      const aiMessage = {
        id: Date.now() + 1,
        text: response.message || 'Sorry, I could not generate a response.',
        sender: 'ai',
        timestamp: new Date(),
        citations: response.articles || [],
        status: 'success',
        originalQuestion: messageText
      }
      
      setMessages(prev => [...prev, aiMessage])

      // Update session title if this is the first message
      if (!sessionTitle && !currentSessionId) {
        const newTitle = generateSessionTitle(messageText)
        console.log('🏷️ [useChats] Setting new session title:', newTitle)
        setSessionTitle(newTitle)
      }

      return response

    } catch (error) {
      console.error('❌ [useChats] Failed to send message:', error)
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        text: getErrorMessage(error),
        sender: 'ai',
        timestamp: new Date(),
        status: 'error'
      }
      
      setMessages(prev => [...prev, errorMessage])
      setError(getErrorMessage(error))
      
      throw error
    } finally {
      setLoading(false)
    }
  }, [currentSessionId, sessionTitle])

  // Delete current session
  const deleteCurrentSession = useCallback(async () => {
    if (!currentSessionId) return

    try {
      await chatService.deleteChatSession(currentSessionId)
      startNewChat()
    } catch (error) {
      console.error('Failed to delete session:', error)
      setError('Failed to delete conversation')
    }
  }, [currentSessionId, startNewChat])

  // Clear all messages (local only, doesn't delete session)
  const clearMessages = useCallback(() => {
    setMessages([])
    setError('')
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError('')
  }, [])

  // Update session title
  const updateSessionTitle = useCallback(async (newTitle) => {
    if (!currentSessionId || !newTitle) return

    try {
      await chatService.updateChatSession(currentSessionId, { title: newTitle })
      setSessionTitle(newTitle)
    } catch (error) {
      console.error('Failed to update session title:', error)
      setError('Failed to update conversation title')
    }
  }, [currentSessionId])

  // Helper function to generate session title
  const generateSessionTitle = (message) => {
    if (!message || typeof message !== 'string') {
      return 'New Conversation'
    }

    // Clean and truncate the message
    const cleanMessage = message
      .trim()
      .replace(/[^\w\s\-?!.]/g, '') // Remove special characters except basic punctuation
      .replace(/\s+/g, ' ') // Normalize spaces

    // Truncate to reasonable length
    if (cleanMessage.length <= 50) {
      return cleanMessage
    }

    // Find a good break point
    const truncated = cleanMessage.substring(0, 47)
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastSpace > 20) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    return truncated + '...'
  }

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error) => {
    if (error?.response?.status === 429) {
      return 'Too many requests. Please wait a moment before sending another message.'
    }
    
    if (error?.response?.status === 401) {
      return 'Your session has expired. Please refresh the page and log in again.'
    }
    
    if (error?.response?.status >= 500) {
      return 'Our service is temporarily unavailable. Please try again in a few moments.'
    }
    
    if (error?.message?.includes('rate limit')) {
      return 'Rate limit exceeded. Please wait before sending another message.'
    }
    
    if (error?.message?.includes('API key')) {
      return 'AI assistant is currently unavailable due to configuration issues.'
    }
    
    return error?.response?.data?.message || 
           error?.message || 
           'An unexpected error occurred. Please try again.'
  }

  return {
    // State
    currentSessionId,
    messages,
    loading,
    error,
    sessionTitle,
    
    // Actions
    loadSession,
    startNewChat,
    sendMessage,
    deleteCurrentSession,
    clearMessages,
    clearError,
    updateSessionTitle,
    
    // Utils
    hasActiveSession: !!currentSessionId,
    messageCount: messages.length,
    hasMessages: messages.length > 0
  }
}

export default useChats 