import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import Navigation from './Navigation'

function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main content */}
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout 