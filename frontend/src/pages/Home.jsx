import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Hero Section */}
        <div className="text-center py-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            📚 Freshdesk Knowledge Base
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Find answers to your questions quickly with our comprehensive knowledge base. 
            Search through articles, guides, and troubleshooting tips.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSearch} className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knowledge base..."
                className="flex-1 px-6 py-4 text-lg border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 shadow-sm"
              >
                Search
              </button>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mb-16">
            <Link
              to="/dashboard"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse All Articles
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Powerful Search
            </h3>
            <p className="text-gray-600">
              Find articles quickly with our advanced search functionality that searches through all content.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8 text-center hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Organized Categories
            </h3>
            <p className="text-gray-600">
              Browse articles organized by categories to find exactly what you're looking for.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8 text-center hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Live Updates
            </h3>
            <p className="text-gray-600">
              Get the latest information with live integration to our Freshdesk knowledge base.
            </p>
          </div>
        </div>

        {/* Sample Articles */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            📖 Popular Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Getting Started Guide
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Learn how to get started with our knowledge base and find the information you need.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                Read More 
                <span className="ml-1">→</span>
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Search Tips
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Discover advanced search techniques to find exactly what you're looking for quickly.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                Read More 
                <span className="ml-1">→</span>
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Troubleshooting
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Common issues and solutions to help you resolve problems quickly and efficiently.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                Read More 
                <span className="ml-1">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🚀 Quick Links
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/dashboard"
              className="p-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">Dashboard</div>
            </Link>
            <Link
              to="/search"
              className="p-4 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-medium">Search</div>
            </Link>
            <div className="p-4 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
              <div className="text-2xl mb-2">📁</div>
              <div className="font-medium">Categories</div>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
              <div className="text-2xl mb-2">❓</div>
              <div className="font-medium">Help</div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center mt-8 py-4">
          <p className="text-gray-600">
            📈 Knowledge Base is running! Backend connected and ready for live data.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home 