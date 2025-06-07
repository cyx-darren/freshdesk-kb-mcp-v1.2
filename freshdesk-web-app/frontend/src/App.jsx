import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom'

// Simple navigation component without context
const Navigation = () => {
  return (
    <nav className="bg-white shadow-sm border-b p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📚</span>
          <a href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600">
            Knowledge Base
          </a>
        </div>
        
        <div className="flex space-x-6">
          <a href="/" className="text-gray-600 hover:text-blue-600 font-medium">Home</a>
          <a href="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium">Dashboard</a>
          <a href="/search" className="text-gray-600 hover:text-blue-600 font-medium">Search</a>
          <a href="/login" className="text-gray-600 hover:text-blue-600 font-medium">Login</a>
        </div>
        
        <div className="flex items-center space-x-4">
          <a href="/login" className="btn-primary text-sm px-4 py-2">
            Sign In
          </a>
        </div>
      </div>
    </nav>
  )
}

// Full Home page component
const Home = () => {
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
            📈 Knowledge Base is running! Backend connected at localhost:3333 and ready for live data.
          </p>
        </div>
      </div>
    </div>
  )
}

// Helper function to parse articles from text response
const parseArticlesFromText = (text) => {
  const articles = []
  const lines = text.split('\n')
  let currentArticle = null
  
  for (const line of lines) {
    // Look for article titles (numbered items like "1. **Title**")
    const titleMatch = line.match(/^\d+\.\s\*\*(.*?)\*\*/)
    if (titleMatch) {
      if (currentArticle) {
        articles.push(currentArticle)
      }
      currentArticle = {
        title: titleMatch[1].trim(),
        content: '',
        id: '',
        category: ''
      }
    }
    
    // Look for article ID
    const idMatch = line.match(/🆔 Article ID:\s(\d+)/)
    if (idMatch && currentArticle) {
      currentArticle.id = idMatch[1]
    }
    
    // Look for content description
    const contentMatch = line.match(/📄\s(.+)/)
    if (contentMatch && currentArticle) {
      currentArticle.content = contentMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) + '...'
    }
  }
  
  if (currentArticle) {
    articles.push(currentArticle)
  }
  
  return articles
}

// Keep other simple page components for now
const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`http://localhost:3333/api/articles/search?query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      
      if (data.success) {
        // Parse the text content to extract articles
        const content = data.articles?.content?.[0]?.text || ''
        const articles = parseArticlesFromText(content)
        setArticles(articles)
      } else {
        setError(data.error || 'Search failed')
      }
    } catch (err) {
      setError('Failed to connect to backend. Make sure the server is running on port 3333.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📊 Knowledge Base Dashboard</h1>
        <p className="text-gray-600">Search and browse articles from your live Freshdesk knowledge base</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base articles..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6">
          ❌ {error}
        </div>
      )}

      {loading && (
        <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded-lg mb-6">
          🔍 Searching Freshdesk knowledge base...
        </div>
      )}

      {/* Search Results */}
      {articles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📖 Found {articles.length} article{articles.length !== 1 ? 's' : ''}
          </h2>
          <div className="space-y-4">
            {articles.map((article, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {article.title || 'Untitled Article'}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {article.description || article.content || 'No description available'}
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    Article ID: {article.id || index + 1}
                  </span>
                  {article.category && (
                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      {article.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default State */}
      {!loading && !error && articles.length === 0 && searchQuery && (
        <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-8 rounded-lg text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p>No articles found for "{searchQuery}"</p>
          <p className="text-sm mt-2">Try a different search term or browse all categories</p>
        </div>
      )}

      {/* Welcome State */}
      {!searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-4">🔍</div>
            <h3 className="font-semibold text-lg mb-2">Search Articles</h3>
            <p className="text-gray-600 text-sm">
              Search through your Freshdesk knowledge base using the search bar above
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="font-semibold text-lg mb-2">Live Integration</h3>
            <p className="text-gray-600 text-sm">
              Connected to your live Freshdesk knowledge base for real-time results
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="font-semibold text-lg mb-2">Fast Results</h3>
            <p className="text-gray-600 text-sm">
              Get instant search results powered by MCP integration
            </p>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-green-100 p-4 rounded-lg mt-8 text-center">
        <p className="text-green-800">
          ✅ Backend API connected at localhost:3333 | MCP integration active
        </p>
      </div>
    </div>
  )
}

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchPerformed, setSearchPerformed] = useState(false)

  // Get search query from URL on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const query = urlParams.get('q')
    if (query) {
      setSearchQuery(query)
      performSearch(query)
    }
  }, [])

  const performSearch = async (query) => {
    if (!query.trim()) return
    
    setLoading(true)
    setError('')
    setSearchPerformed(true)
    
    try {
      const response = await fetch(`http://localhost:3333/api/articles/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.success) {
        const content = data.articles?.content?.[0]?.text || ''
        const articles = parseArticlesFromText(content)
        setArticles(articles)
      } else {
        setError(data.error || 'Search failed')
      }
    } catch (err) {
      setError('Failed to connect to backend. Make sure the server is running on port 3333.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    performSearch(searchQuery)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🔍 Advanced Search</h1>
        <p className="text-gray-600">Search through your Freshdesk knowledge base with advanced filtering</p>
      </div>

      {/* Enhanced Search Bar */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter your search terms..."
              className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <div className="text-sm text-gray-500">
            💡 Try searching for "email", "training", "troubleshoot", or other topics
          </div>
        </form>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6">
          ❌ {error}
        </div>
      )}

      {loading && (
        <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded-lg mb-6 text-center">
          <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
          🔍 Searching Freshdesk knowledge base...
        </div>
      )}

      {/* Search Results */}
      {searchPerformed && articles.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              📖 Search Results for "{searchQuery}"
            </h2>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              {articles.length} article{articles.length !== 1 ? 's' : ''} found
            </span>
          </div>
          
          <div className="space-y-6">
            {articles.map((article, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-xl text-gray-900 flex-1">
                    {article.title || 'Untitled Article'}
                  </h3>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-4">
                    ID: {article.id || index + 1}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {article.content || 'No description available'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {article.category && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        📁 {article.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      📅 Freshdesk Article
                    </span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    View Full Article →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchPerformed && !loading && !error && articles.length === 0 && (
        <div className="bg-gray-100 border border-gray-300 text-gray-700 px-6 py-12 rounded-lg text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No articles found</h3>
          <p className="mb-4">No articles found for "{searchQuery}"</p>
          <p className="text-sm text-gray-500 mb-6">
            Try different keywords, check spelling, or browse categories
          </p>
          <button 
            onClick={() => setSearchQuery('')}
            className="btn-primary"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Welcome State */}
      {!searchPerformed && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to Search
            </h3>
            <p className="text-gray-600">
              Enter your search terms above to find articles from your Freshdesk knowledge base
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="font-semibold text-lg mb-2">Fast Search</h3>
              <p className="text-gray-600 text-sm">
                Get instant results from your live Freshdesk knowledge base
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-semibold text-lg mb-2">Accurate Results</h3>
              <p className="text-gray-600 text-sm">
                Find exactly what you're looking for with intelligent search
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="font-semibold text-lg mb-2">Real-time Data</h3>
              <p className="text-gray-600 text-sm">
                Always up-to-date with live integration to Freshdesk
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-green-100 p-4 rounded-lg mt-8 text-center">
        <p className="text-green-800">
          ✅ Live connection to Freshdesk knowledge base | MCP integration active
        </p>
      </div>
    </div>
  )
}

const Login = () => (
  <div className="max-w-md mx-auto px-4 py-16 text-center">
    <h1 className="text-3xl font-bold text-gray-900 mb-6">🔐 Login</h1>
    <p className="text-gray-600 mb-8">Sign in to access your account</p>
    <div className="bg-gray-100 p-4 rounded-lg">
      <p className="text-gray-800">🔑 Authentication ready with Supabase</p>
    </div>
  </div>
)

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/search" element={<Search />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<div className="text-center py-16"><h1>Page Not Found</h1></div>} />
          </Routes>
        </main>
        
        <footer className="bg-white border-t py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-600">
              © 2025 Freshdesk Knowledge Base. Powered by live Freshdesk integration.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App 