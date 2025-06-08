import React, { useState, useEffect, useRef } from 'react'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import { useNavigate } from 'react-router-dom'
import { chatService, utils } from '../services/api.js'
import ChatMessage from '../components/ChatMessage.jsx'
import ChatInput from '../components/ChatInput.jsx'
import LoadingDots from '../components/LoadingDots.jsx'
import ArticleModal from '../components/ArticleModal.jsx'

const Chat = () => {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loadingState, setLoadingState] = useState({ isLoading: false, step: '', progress: 0 })
  const [error, setError] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const messagesEndRef = useRef(null)
  
  const { user, logout } = useSupabase()
  const navigate = useNavigate()

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

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setLoadingState({ isLoading: true, step: 'Searching knowledge base...', progress: 30 })
    setError('')

    try {
      // Simulate progress steps
      setTimeout(() => {
        setLoadingState(prev => ({ ...prev, step: 'Analyzing relevant articles...', progress: 60 }))
      }, 500)

      setTimeout(() => {
        setLoadingState(prev => ({ ...prev, step: 'Generating response...', progress: 90 }))
      }, 1000)

      console.log('🌐 Calling API...')
      // Send message to API
      const response = await chatService.sendMessage(message)
      console.log('✅ API response:', response)
      
      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        text: response.response || response.message || 'Sorry, I could not generate a response.',
        sender: 'ai',
        timestamp: new Date(),
        citations: response.citations || [],
        status: 'success'
      }
      
      setMessages(prev => [...prev, aiMessage])
      console.log('✅ AI message added to chat')
    } catch (err) {
      console.error('❌ Chat error:', err)
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        text: utils.getErrorMessage(err),
        sender: 'ai',
        timestamp: new Date(),
        status: 'error'
      }
      
      setMessages(prev => [...prev, errorMessage])
      setError(utils.getErrorMessage(err))
      console.log('⚠️ Error message added to chat')
    } finally {
      setLoadingState({ isLoading: false, step: '', progress: 0 })
      console.log('🏁 handleSendMessage completed')
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError('')
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm md:text-base">EP</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-bold text-gray-900">EasyPrint Knowledge Chat</h1>
                <p className="text-xs text-gray-500">AI-powered support assistant</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-gray-900">EasyPrint</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="text-sm text-gray-600 hidden lg:block">Welcome, {user.email}</span>
              
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="px-2 py-2 md:px-3 text-xs md:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Clear Chat"
                >
                  <span className="hidden sm:inline">Clear Chat</span>
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
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce-in">
                    <span className="text-white font-bold text-2xl">EP</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 animate-slide-up">
                    Welcome to EasyPrint Support
                  </h2>
                  <p className="text-gray-600 mb-8 text-lg animate-slide-up-delay">
                    I'm your AI assistant powered by our knowledge base. Ask me anything about EasyPrint products, services, or technical support!
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
                        Get immediate responses from our comprehensive knowledge base
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
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-gray-600">AI</span>
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
                  onClick={() => setError('')}
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
              placeholder="Ask me anything about EasyPrint..."
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
  )
}

export default Chat 