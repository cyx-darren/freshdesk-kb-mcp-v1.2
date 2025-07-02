import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [totalResults, setTotalResults] = useState(0)

  useEffect(() => {
    const queryParam = searchParams.get('q')
    if (queryParam) {
      setQuery(queryParam)
      performSearch(queryParam)
    }
  }, [searchParams])

  const extractArticles = (content) => {
    const articles = []
    const lines = content.split('\n')
    let currentArticle = null
    
    for (const line of lines) {
      if (line.includes('Article ID:')) {
        if (currentArticle) articles.push(currentArticle)
        const idMatch = line.match(/Article ID:\s*(\d+)/)
        currentArticle = { 
          id: idMatch?.[1] || Math.random().toString(),
          created_at: new Date().toISOString() // Default date
        }
      } else if (line.includes('**') && currentArticle && !currentArticle.title) {
        const titleMatch = line.match(/\*\*(.*?)\*\*/)
        if (titleMatch) currentArticle.title = titleMatch[1]
      } else if (line.includes('📄') && currentArticle && !currentArticle.description) {
        const excerptMatch = line.match(/📄\s*(.+)/)
        if (excerptMatch) {
          currentArticle.description = excerptMatch[1].substring(0, 200) + '...'
        }
      } else if (line.includes('Created:') && currentArticle) {
        const dateMatch = line.match(/Created:\s*(.+)/)
        if (dateMatch) {
          // Try to parse the date, fallback to current date if parsing fails
          try {
            currentArticle.created_at = new Date(dateMatch[1]).toISOString()
          } catch (e) {
            currentArticle.created_at = new Date().toISOString()
          }
        }
      }
    }
    if (currentArticle) articles.push(currentArticle)
    
    return articles
  }

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`http://localhost:3333/api/articles/search?query=${encodeURIComponent(searchQuery)}&per_page=20`)
      
      if (response.ok) {
        const data = await response.json()
        const articles = extractArticles(data.articles?.content?.[0]?.text || '')
        setResults(articles)
        setTotalResults(data.search?.total_results || articles.length)
      } else {
        throw new Error('Search failed')
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search. Please try again.')
      setResults([])
      setTotalResults(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchParams({ q: query.trim() })
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setTotalResults(0)
    setSearchParams({})
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🔍 Search Knowledge Base</h1>
        
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, guides, troubleshooting..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '🔍 Searching...' : 'Search'}
          </button>
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-3 text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          )}
        </form>

        {/* Search Info */}
        {searchParams.get('q') && !loading && (
          <div className="text-sm text-gray-600 mb-6">
            {totalResults > 0 ? (
              <p>Found <strong>{totalResults}</strong> results for "<strong>{searchParams.get('q')}</strong>"</p>
            ) : (
              <p>No results found for "<strong>{searchParams.get('q')}</strong>"</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Searching knowledge base...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-6">
          {results.map((article) => (
            <div key={article.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-3 hover:text-blue-600">
                <Link to={`/article/${article.id}`}>
                  {article.title || 'Untitled Article'}
                </Link>
              </h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {article.description || 'No description available'}
              </p>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Article ID: {article.id}</span>
                <span>
                  {new Date(article.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="mt-4">
                <Link
                  to={`/article/${article.id}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  Read Full Article
                  <span className="ml-1">→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && searchParams.get('q') && !error && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600 mb-6">
            We couldn't find any articles matching "<strong>{searchParams.get('q')}</strong>"
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Try:</p>
            <ul className="space-y-1">
              <li>• Using different keywords</li>
              <li>• Checking your spelling</li>
              <li>• Using broader search terms</li>
            </ul>
          </div>
          <div className="mt-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse All Articles
            </Link>
          </div>
        </div>
      )}

      {!loading && !searchParams.get('q') && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Search Knowledge Base</h3>
          <p className="text-gray-600 mb-6">
            Enter a search term above to find articles, guides, and troubleshooting tips
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-md mx-auto">
            <button
              onClick={() => setQuery('getting started')}
              className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm"
            >
              Getting Started
            </button>
            <button
              onClick={() => setQuery('troubleshooting')}
              className="p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm"
            >
              Troubleshooting
            </button>
            <button
              onClick={() => setQuery('setup')}
              className="p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm"
            >
              Setup
            </button>
            <button
              onClick={() => setQuery('help')}
              className="p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 text-sm"
            >
              Help
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Search 