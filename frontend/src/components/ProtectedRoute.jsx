import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'

function ProtectedRoute({ children }) {
  const { user, loading, initializing } = useSupabase()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (loading || initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    // Save the intended destination to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Render protected content if authenticated
  return children
}

export default ProtectedRoute 