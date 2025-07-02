import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'

const AdminNavigation = ({ 
  rightActions = [], 
  showUserInfo = true
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useSupabase()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const navigationItems = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard'
    },
    {
      path: '/admin/questions',
      label: 'Questions'
    },
    {
      path: '/admin/bugs',
      label: 'Bug Reports'
    },
    {
      path: '/admin/features',
      label: 'Feature Requests'
    },
    {
      path: '/admin/playwright',
      label: 'Playwright'
    }
  ]

  const isActivePath = (path) => {
    return location.pathname === path
  }

  // Navigation tab styles - professional button design
  const getNavTabStyles = (isActive) => {
    const baseStyles = `
      inline-flex items-center justify-center 
      px-5 h-9 
      bg-gray-100 border border-gray-300 
      rounded-lg text-sm font-medium 
      cursor-pointer transition-all duration-200 
      text-gray-700 no-underline
      min-w-[90px]
      hover:bg-gray-200 hover:transform hover:-translate-y-0.5
    `
    
    if (isActive) {
      return `${baseStyles.replace('bg-gray-100 border-gray-300 text-gray-700', 'bg-blue-50 border-blue-500 text-blue-900')} 
        font-semibold shadow-[0_0_0_3px_rgba(59,130,246,0.1)]`
    }
    
    return baseStyles
  }

  return (
    <header className="bg-white border-b border-gray-200 flex-shrink-0">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between max-w-full">
          {/* Logo and Title Section */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* ELSA Logo - Matching Chat page exactly */}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">EP</span>
            </div>
            
            {/* ELSA Title and Subtitle */}
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">ELSA</h1>
              <p className="text-xs text-gray-500">Easyprint Learning & Support Assistant</p>
            </div>
            
            {/* Mobile Title */}
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-gray-900">ELSA</h1>
            </div>
          </div>

          {/* Navigation Tabs - Center */}
          <div className="flex items-center justify-center flex-1 px-8">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => {
                const isActive = isActivePath(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={getNavTabStyles(isActive)}
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>

            {/* Mobile Navigation - Stacked layout */}
            <nav className="md:hidden flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
              {navigationItems.map((item) => {
                const isActive = isActivePath(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`
                      inline-flex items-center justify-center 
                      px-3 h-8 
                      ${isActive 
                        ? 'bg-blue-50 border border-blue-500 text-blue-900 font-semibold' 
                        : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                      }
                      rounded-lg text-xs 
                      cursor-pointer transition-all duration-200 
                      min-w-[70px]
                    `}
                  >
                    {item.label.includes(' ') ? item.label.split(' ')[0] : item.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Right Actions Section */}
          <div className="flex items-center space-x-8 flex-shrink-0">
            {/* User Info */}
            {showUserInfo && user && (
              <div className="hidden lg:block">
                <span className="text-sm text-gray-600 font-medium">
                  {user.email}
                </span>
              </div>
            )}

            {/* Action Buttons Group */}
            <div className="flex items-center gap-3">
              {/* Custom Right Actions */}
              {rightActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="
                    inline-flex items-center justify-center 
                    px-4 h-9 
                    bg-gray-100 border border-gray-300 text-gray-700 
                    rounded-lg text-sm font-medium 
                    cursor-pointer transition-all duration-200 
                    hover:bg-gray-200 hover:border-gray-400
                  "
                  title={action.title}
                >
                  {action.label}
                </button>
              ))}

              {/* Back to Chat Button */}
              <button
                onClick={() => navigate('/chat')}
                className="
                  inline-flex items-center justify-center 
                  px-5 h-9 
                  bg-blue-600 text-white 
                  rounded-lg text-sm font-medium 
                  cursor-pointer transition-all duration-200 
                  hover:bg-blue-700 shadow-sm
                "
              >
                <span className="hidden sm:inline">Back to Chat</span>
                <span className="sm:hidden">Chat</span>
              </button>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="
                  inline-flex items-center justify-center 
                  px-5 h-9 
                  bg-red-500 text-white 
                  rounded-lg text-sm font-medium 
                  cursor-pointer transition-all duration-200 
                  hover:bg-red-600 shadow-sm
                "
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminNavigation 