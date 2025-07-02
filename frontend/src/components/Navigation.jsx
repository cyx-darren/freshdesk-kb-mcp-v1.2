import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut, loading } = useSupabase()
  
  const navigation = [
    { name: 'Questions', href: '/admin/questions', current: location.pathname === '/admin/questions' },
    { name: 'Chat', href: '/chat', current: location.pathname === '/chat' },
    { name: 'Search', href: '/search', current: location.pathname === '/search' },
  ]

  // Add additional links for authenticated users
  if (user) {
    navigation.push(
      { 
        name: 'Article Editor', 
        href: '/article-editor', 
        current: location.pathname === '/article-editor' 
      },
      { 
        name: 'Dashboard', 
        href: '/dashboard', 
        current: location.pathname === '/dashboard' 
      }
    )
  }

  const handleSignOut = async () => {
    const result = await signOut()
    if (result.success) {
      navigate('/')
    }
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/admin/questions" className="text-xl font-bold text-gray-900">
                ELSA
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    item.current
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-700">
                  Welcome, {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="btn-primary"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200`}
              >
                {item.name}
              </Link>
            ))}
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <div className="space-y-1">
                <div className="px-4 py-2">
                  <p className="text-sm text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation 