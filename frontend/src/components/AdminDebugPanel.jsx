import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import { useAdminHelpers } from '../utils/adminHelpers.js'

const AdminDebugPanel = ({ showIf = 'always' }) => {
  const navigate = useNavigate()
  const { user } = useSupabase()
  const { isAdmin, hasAdminAccess } = useAdminHelpers()

  // Control when to show the panel
  if (showIf === 'adminOnly' && !hasAdminAccess) return null
  if (showIf === 'never') return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-semibold text-sm text-gray-900 mb-2">🛠️ Admin Debug Panel</h3>
        
        <div className="space-y-2 text-xs">
          <div>
            <span className="font-medium">User:</span> {user?.email || 'Not logged in'}
          </div>
          <div>
            <span className="font-medium">Is Admin:</span> 
            <span className={isAdmin ? 'text-green-600' : 'text-red-600'}>
              {isAdmin ? ' ✅ Yes' : ' ❌ No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Has Admin Access:</span> 
            <span className={hasAdminAccess ? 'text-green-600' : 'text-red-600'}>
              {hasAdminAccess ? ' ✅ Yes' : ' ❌ No'}
            </span>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <button
            onClick={() => navigate('/admin/questions')}
            className="w-full px-3 py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Go to Admin Dashboard
          </button>
          
          <button
            onClick={() => navigate('/chat')}
            className="w-full px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go to Chat
          </button>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Add your email to <code>adminHelpers.js</code> for admin access
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminDebugPanel 