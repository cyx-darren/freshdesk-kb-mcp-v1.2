import React, { useState } from 'react'
import { Link } from 'react-router-dom'

function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  // Sample articles for testing
  const sampleArticles = [
    {
      id: '1',
      title: 'Getting Started with Your Account',
      excerpt: 'Learn how to set up and configure your account settings for the best experience.',
    },
    {
      id: '2',
      title: 'Troubleshooting Common Issues',
      excerpt: 'Quick solutions to the most frequently encountered problems and errors.',
    },
    {
      id: '3',
      title: 'Advanced Features Guide',
      excerpt: 'Discover powerful features that can help you get the most out of our platform.',
    },
  ]

  const categories = [
    { id: 1, name: 'Getting Started', article_count: 15 },
    { id: 2, name: 'Troubleshooting', article_count: 8 },
    { id: 3, name: 'Advanced Features', article_count: 12 },
    { id: 4, name: 'Account Management', article_count: 6 }
  ]

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          📚 Knowledge Base Dashboard
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Search through our comprehensive knowledge base to find answers quickly
        </p>
      </div>
      
      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, guides, troubleshooting..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </form>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Featured Articles */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📖 Featured Articles</h2>
          <div className="space-y-4">
            {sampleArticles.map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 mb-3">
                  {article.excerpt}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Article ID: {article.id}</span>
                  <Link
                    to={`/article/${article.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Read More →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Sidebar */}
        <div>
          {/* Categories */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📁 Categories</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-sm text-gray-500">{category.article_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/search"
                className="block w-full text-left p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                🔍 Advanced Search
              </Link>
              <div className="block w-full text-left p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer">
                📈 Recent Articles
              </div>
              <div className="block w-full text-left p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer">
                ⭐ Popular Articles
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Message */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          🚀 Dashboard ready! Backend API connected on port 3333.
        </p>
      </div>
    </div>
  )
}

export default Dashboard 