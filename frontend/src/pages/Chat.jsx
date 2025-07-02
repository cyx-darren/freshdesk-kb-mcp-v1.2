import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import { useNavigate } from 'react-router-dom'
import { useAdminHelpers } from '../utils/adminHelpers.js'
import { utils } from '../services/api.js'
import ChatMessage from '../components/ChatMessage.jsx'
import ChatInput from '../components/ChatInput.jsx'
import ChatSidebar from '../components/ChatSidebar.jsx'
import LoadingDots from '../components/LoadingDots.jsx'
import ArticleModal from '../components/ArticleModal.jsx'
import useChats from '../hooks/useChats.js'
import elsaAvatar from '../assets/images/elsa-avatar.png'
import elsaAvatarMedium from '../assets/images/elsa-avatar-medium.png'
import elsaAvatarLarge from '../assets/images/elsa-avatar-large.png'

const Chat = () => {
  const [loadingState, setLoadingState] = useState({ isLoading: false, step: '', progress: 0 })
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarKey, setSidebarKey] = useState(0) // Force refresh key for sidebar
  const [showAdminDropdown, setShowAdminDropdown] = useState(false)
  const messagesEndRef = useRef(null)
  
  const { user, logout } = useSupabase()
  const navigate = useNavigate()
  const { hasAdminAccess } = useAdminHelpers()
  
  // Callback to refresh sidebar when new session is created
  const handleSessionCreated = useCallback((sessionId) => {
    console.log('📢 [Chat] New session created, refreshing sidebar:', sessionId)
    // Force the sidebar to refresh its session list
    setSidebarKey(prev => prev + 1)
  }, [])

  // Use the chat hook for session management
  const {
    currentSessionId,
    messages,
    loading,
    error,
    loadSession,
    startNewChat,
    sendMessage,
    clearMessages,
    clearError
  } = useChats(handleSessionCreated)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Close admin dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminDropdown && !event.target.closest('.admin-dropdown')) {
        setShowAdminDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAdminDropdown])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleSendMessage = async (message) => {
    console.log('🚀 handleSendMessage called with:', message)
    if (!message.trim()) {
      console.log('❌ Empty message, returning early')
      return
    }

    console.log('📤 Sending message:', message)
    console.log('👤 Current user:', user?.email)

    setLoadingState({ isLoading: true, step: 'ELSA is searching...', progress: 30 })

    try {
      // Simulate progress steps
      setTimeout(() => {
        setLoadingState(prev => ({ ...prev, step: 'Analyzing relevant articles...', progress: 60 }))
      }, 500)

      setTimeout(() => {
        setLoadingState(prev => ({ ...prev, step: 'Generating response...', progress: 90 }))
      }, 1000)

      console.log('🌐 Calling API...')
      // Use the chat hook's sendMessage which handles session management
      await sendMessage(message)
      console.log('✅ Message sent successfully')
    
    } catch (err) {
      console.error('❌ Chat error:', err)
    } finally {
      setLoadingState({ isLoading: false, step: '', progress: 0 })
      console.log('🏁 handleSendMessage completed')
    }
  }

  const handleClearChat = () => {
    clearMessages()
  }

  const handleNewChat = () => {
    startNewChat()
    setSidebarOpen(false) // Close sidebar on mobile after starting new chat
  }

  const handleSessionSelect = (sessionId) => {
    loadSession(sessionId)
    setSidebarOpen(false) // Close sidebar on mobile after selecting session
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleExampleClick = (question) => {
    handleSendMessage(question)
  }

  const handleArticleClick = (articleId) => {
    // This will be enhanced to fetch and show full article content
    setSelectedArticle({ id: articleId, title: `Article #${articleId}`, content: 'Loading...' })
    setShowArticleModal(true)
  }

  const closeArticleModal = () => {
    setShowArticleModal(false)
    setSelectedArticle(null)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Chat Sidebar */}
      <ChatSidebar
        key={sidebarKey}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onSessionSelect={handleSessionSelect}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-3">
                {/* Hamburger menu for mobile sidebar */}
                <button
                  onClick={toggleSidebar}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Toggle chat history"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm md:text-base">EP</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg md:text-xl font-bold text-gray-900">
                    ELSA
                  </h1>
                  <p className="text-xs text-gray-500">Easyprint Learning & Support Assistant</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-lg font-bold text-gray-900">
                    ELSA
                  </h1>
                </div>
              </div>
            
              <div className="flex items-center space-x-2 md:space-x-4">
                <span className="text-sm text-gray-600 hidden md:block">Welcome, {user.email}</span>
                
                {/* Admin Dashboard Dropdown - Only shown for actual admins */}
                {hasAdminAccess && (
                  <div className="relative admin-dropdown">
                    <button
                      onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                      className="px-3 py-2 md:px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs md:text-sm flex items-center"
                      title="Admin Dashboard"
                    >
                      <span className="hidden sm:inline">Admin</span>
                      <svg className="w-4 h-4 sm:hidden md:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <svg className="w-4 h-4 ml-1 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showAdminDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                        <button
                          onClick={() => {
                            navigate('/admin/dashboard')
                            setShowAdminDropdown(false)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Dashboard
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/admin/questions')
                            setShowAdminDropdown(false)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Questions
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/admin/bugs')
                            setShowAdminDropdown(false)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            Bug Reports
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/admin/features')
                            setShowAdminDropdown(false)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Feature Requests
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="px-3 py-2 text-xs md:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Clear Chat History"
                  >
                    <span className="hidden sm:inline">Clear</span>
                    <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 md:px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs md:text-sm"
                  title="Sign Out"
                >
                  <span className="hidden sm:inline">Sign Out</span>
                  <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 scrollbar-custom pr-2">
              {messages.length === 0 ? (
                // Enhanced Welcome Screen
                <div className="h-full flex items-center justify-center animate-fade-in">
                  <div className="text-center max-w-2xl mx-4">
                    <div className="relative mx-auto mb-6 w-28 h-28 group">
                      <img 
                        src={elsaAvatarLarge} 
                        alt="ELSA - Easyprint Learning & Support Assistant"
                        className="elsa-avatar elsa-avatar-large w-full h-full rounded-full border-4 border-blue-200 shadow-2xl animate-bounce-in group-hover:border-blue-300"
                        onError={(e) => {
                          // Fallback to EP logo if image fails to load
                          e.target.style.display = 'none'
                          const fallback = e.target.nextElementSibling
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                      {/* Fallback avatar */}
                      <div 
                        className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce-in" 
                        style={{ display: 'none' }}
                      >
                        <span className="text-white font-bold text-2xl">EP</span>
                      </div>
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 animate-glow-pulse blur-xl pointer-events-none"></div>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 animate-slide-up">
                      Hi, I'm ELSA! 👋
                    </h2>
                    <p className="text-gray-600 mb-8 text-lg animate-slide-up-delay">
                      I'm ELSA - your Easyprint Learning & Support Assistant. Ask me anything about EasyPrint products, services, or technical support!
                    </p>
                    
                    {/* Example Questions */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Try these popular questions:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
                        {[
                          { icon: "🏷️", question: "What is the MOQ for lanyards?" },
                          { icon: "🖨️", question: "How do I troubleshoot printer issues?" },
                          { icon: "⏰", question: "What are your support hours?" },
                          { icon: "📦", question: "How long does shipping take?" },
                          { icon: "💰", question: "What payment methods do you accept?" },
                          { icon: "🔧", question: "Help me with product installation" }
                        ].map((item, index) => (
                          <button
                            key={index}
                            onClick={() => handleExampleClick(item.question)}
                            className="bg-white p-4 rounded-xl border border-gray-200 text-left hover:border-blue-300 hover:shadow-md transition-all duration-200 transform hover:scale-105 group animate-slide-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <div className="flex items-start space-x-3">
                              <span className="text-2xl">{item.icon}</span>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {item.question}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Click to ask</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                      <div className="bg-white rounded-lg shadow-sm p-6 border animate-slide-up">
                        <div className="text-3xl mb-4">⚡</div>
                        <h3 className="font-semibold text-lg mb-2">Instant Answers</h3>
                        <p className="text-gray-600 text-sm">
                          Get immediate responses powered by ELSA's comprehensive knowledge base
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg shadow-sm p-6 border animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="text-3xl mb-4">🎯</div>
                        <h3 className="font-semibold text-lg mb-2">Accurate Information</h3>
                        <p className="text-gray-600 text-sm">
                          AI-powered responses with citations to source articles
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg shadow-sm p-6 border animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <div className="text-3xl mb-4">🔄</div>
                        <h3 className="font-semibold text-lg mb-2">Always Updated</h3>
                        <p className="text-gray-600 text-sm">
                          Real-time access to the latest support information
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Chat Messages
                <>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onCitationClick={handleArticleClick}
                      loadingState={message.sender === 'ai' ? loadingState : undefined}
                    />
                  ))}
                  
                  {/* Enhanced Loading Indicator */}
                  {loadingState.isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center space-x-3 max-w-md">
                        <div className="flex-shrink-0 w-10 h-10">
                          <img 
                            src={elsaAvatarMedium} 
                            alt="ELSA is thinking..."
                            className="elsa-avatar w-full h-full rounded-full border-2 border-blue-200 shadow-lg animate-pulse"
                            onError={(e) => {
                              // Fallback to text if image fails to load
                              e.target.style.display = 'none'
                              const fallback = e.target.nextElementSibling
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                          {/* Fallback avatar */}
                          <div 
                            className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0" 
                            style={{ display: 'none' }}
                          >
                            <span className="text-xs font-medium text-gray-600">AI</span>
                          </div>
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border flex-1">
                          <div className="flex items-center space-x-3">
                            <LoadingDots variant="typing" />
                            <div className="flex-1">
                              <div className="text-sm text-gray-700 font-medium">{loadingState.step}</div>
                              <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${loadingState.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Auto-scroll anchor */}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-red-600 mr-2">⚠️</span>
                  <span className="text-red-700 text-sm">{error}</span>
                  <button
                    onClick={clearError}
                    className="ml-auto text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="flex-shrink-0">
              <ChatInput
                onSendMessage={handleSendMessage}
                loading={loadingState.isLoading}
                placeholder="Hi! Ask me anything about EasyPrint..."
              />
            </div>
          </div>
        </div>
        
        {/* Article Modal */}
        <ArticleModal
          isOpen={showArticleModal}
          onClose={closeArticleModal}
          article={selectedArticle}
        />
      </div>
    </div>
  )
}

export default Chat 