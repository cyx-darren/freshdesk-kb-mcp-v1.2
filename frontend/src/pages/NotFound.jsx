import React from 'react'
import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="space-x-4">
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
          <Link to="/search" className="btn-secondary">
            Search Knowledge Base
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound 