import React, { useState, useEffect, useCallback } from 'react'
import { chatService } from '../services/api.js'

const ChatSidebar = ({ 
  isOpen, 
  onToggle, 
  onSessionSelect, 
  currentSessionId, 
  onNewChat 
}) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSessions, setFilteredSessions] = useState([])
  const [error, setError] = useState('')

  // Load chat sessions
  const loadSessions = useCallback(async () => {
    console.log('📂 [ChatSidebar] Loading chat sessions...')
    try {
      setLoading(true)
      setError('')
      const response = await chatService.getChatSessions(100) // Load more for better history
      console.log('📊 [ChatSidebar] Sessions response:', response)
      console.log('📋 [ChatSidebar] Sessions array:', response.sessions)
      setSessions(response.sessions || [])
    } catch (error) {
      console.error('❌ [ChatSidebar] Failed to load chat sessions:', error)
      setError('Failed to load chat history')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load sessions on mount and expose refresh function
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Expose loadSessions to parent component
  useEffect(() => {
    // Auto-refresh sessions every 30 seconds to catch new sessions
    const interval = setInterval(() => {
      console.log('🔄 [ChatSidebar] Auto-refreshing sessions...')
      loadSessions()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadSessions])

  // Filter sessions based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions)
    } else {
      const filtered = sessions.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSessions(filtered)
    }
  }, [sessions, searchTerm])

  // Group sessions by date
  const groupSessionsByDate = (sessions) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    }

    sessions.forEach(session => {
      const sessionDate = new Date(session.updated_at)
      const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())

      if (sessionDay.getTime() === today.getTime()) {
        groups.today.push(session)
      } else if (sessionDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(session)
      } else if (sessionDate >= weekAgo) {
        groups.thisWeek.push(session)
      } else {
        groups.older.push(session)
      }
    })

    return groups
  }

  const handleSessionClick = (session) => {
    onSessionSelect(session.id)
  }

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation()
    
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return
    }

    try {
      await chatService.deleteChatSession(sessionId)
      // Reload sessions
      await loadSessions()
      
      // If this was the current session, trigger new chat
      if (currentSessionId === sessionId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
      setError('Failed to delete conversation')
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const sessionGroups = groupSessionsByDate(filteredSessions)

  const renderSessionGroup = (title, sessions, showDate = false) => {
    if (sessions.length === 0) return null

    return (
      <div key={title} className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
          {title}
        </h3>
        <div className="space-y-1">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className={`group flex items-center justify-between px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 ${
                currentSessionId === session.id 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${
                  currentSessionId === session.id 
                    ? 'text-blue-900 font-medium' 
                    : 'text-gray-800'
                }`}>
                  {session.title}
                </p>
                <p className="text-xs text-gray-500">
                  {showDate ? formatDate(session.updated_at) : formatTime(session.updated_at)}
                </p>
              </div>
              
              <button
                onClick={(e) => handleDeleteSession(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                title="Delete conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto
        w-80 lg:w-80
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={loadSessions}
                className="mt-2 text-blue-600 text-sm hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="py-4">
              {searchTerm ? (
                // Show filtered results
                filteredSessions.length > 0 ? (
                  <div className="space-y-1">
                    {filteredSessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className={`group flex items-center justify-between px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 ${
                          currentSessionId === session.id 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${
                            currentSessionId === session.id 
                              ? 'text-blue-900 font-medium' 
                              : 'text-gray-800'
                          }`}>
                            {session.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(session.updated_at)}
                          </p>
                        </div>
                        
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                          title="Delete conversation"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">No conversations found</p>
                    </div>
                  )
                ) : (
                  // Show grouped results
                  <>
                    {renderSessionGroup('Today', sessionGroups.today)}
                    {renderSessionGroup('Yesterday', sessionGroups.yesterday)}
                    {renderSessionGroup('Last 7 days', sessionGroups.thisWeek, true)}
                    {renderSessionGroup('Older', sessionGroups.older, true)}
                    
                    {sessions.length === 0 && (
                      <div className="text-center py-8">
                        <div className="mb-4">
                          <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                        <p className="text-gray-500 text-sm mb-4">Start a new conversation to see your chat history here</p>
                        <button
                          onClick={onNewChat}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Start chatting
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </>
    )
  }

  export default ChatSidebar 