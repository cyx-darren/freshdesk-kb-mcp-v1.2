import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

function ArticleView() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [relatedArticles, setRelatedArticles] = useState([])
  const [feedback, setFeedback] = useState({ helpful: null })
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  useEffect(() => {
    if (id) {
      fetchArticle(id)
      loadRelatedArticles()
    }
  }, [id])

  const fetchArticle = async (articleId) => {
    setLoading(true)
    setError(null)
    
    try {
      // Search for the specific article by ID
      const response = await fetch(`http://localhost:3333/api/articles/search?query=Article ID ${articleId}`)
      
      if (response.ok) {
        const data = await response.json()
        const content = data.articles?.content?.[0]?.text || ''
        
        // Parse the article content
        const parsedArticle = parseArticleContent(content, articleId)
        
        if (parsedArticle) {
          setArticle(parsedArticle)
        } else {
          setError('Article not found')
        }
      } else {
        throw new Error('Failed to fetch article')
      }
    } catch (err) {
      console.error('Error fetching article:', err)
      setError('Failed to load article. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const parseArticleContent = (content, targetId) => {
    const lines = content.split('\n')
    let currentArticle = null
    let foundTarget = false
    
    for (const line of lines) {
      if (line.includes('Article ID:')) {
        // Check if this is the article we're looking for
        const idMatch = line.match(/Article ID:\s*(\d+)/)
        if (idMatch && idMatch[1] === targetId) {
          foundTarget = true
          currentArticle = {
            id: targetId,
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            views: Math.floor(Math.random() * 1000) + 50, // Mock views
            reading_time: Math.floor(Math.random() * 10) + 2 // Mock reading time
          }
        } else if (foundTarget && currentArticle) {
          // We've found another article, stop parsing
          break
        }
      } else if (foundTarget && currentArticle) {
        // Parse content for the target article
        if (line.includes('**') && !currentArticle.title) {
          const titleMatch = line.match(/\*\*(.*?)\*\*/)
          if (titleMatch) currentArticle.title = titleMatch[1]
        } else if (line.includes('📄') && !currentArticle.excerpt) {
          const excerptMatch = line.match(/📄\s*(.+)/)
          if (excerptMatch) currentArticle.excerpt = excerptMatch[1]
        } else if (line.includes('Category:')) {
          const categoryMatch = line.match(/Category:\s*(.+)/)
          if (categoryMatch) currentArticle.category = categoryMatch[1]
        } else if (line.includes('Tags:')) {
          const tagsMatch = line.match(/Tags:\s*(.+)/)
          if (tagsMatch) currentArticle.tags = tagsMatch[1].split(',').map(tag => tag.trim())
        } else if (line.trim() && !line.includes('Article ID:') && !line.includes('**') && !line.includes('📄')) {
          // Add to content
          currentArticle.content += line + '\n'
        }
      }
    }
    
    return foundTarget ? currentArticle : null
  }

  const loadRelatedArticles = async () => {
    try {
      // Load some related articles
      const response = await fetch('http://localhost:3333/api/articles/search?query=help&per_page=3')
      if (response.ok) {
        const data = await response.json()
        const articles = extractArticles(data.articles?.content?.[0]?.text || '')
        setRelatedArticles(articles.slice(0, 3))
      }
    } catch (error) {
      console.error('Error loading related articles:', error)
    }
  }

  const extractArticles = (content) => {
    const articles = []
    const lines = content.split('\n')
    let currentArticle = null
    
    for (const line of lines) {
      if (line.includes('Article ID:')) {
        if (currentArticle) articles.push(currentArticle)
        const idMatch = line.match(/Article ID:\s*(\d+)/)
        currentArticle = { id: idMatch?.[1] || Math.random().toString() }
      } else if (line.includes('**') && currentArticle && !currentArticle.title) {
        const titleMatch = line.match(/\*\*(.*?)\*\*/)
        if (titleMatch) currentArticle.title = titleMatch[1]
      } else if (line.includes('📄') && currentArticle && !currentArticle.excerpt) {
        const excerptMatch = line.match(/📄\s*(.+)/)
        if (excerptMatch) currentArticle.excerpt = excerptMatch[1].substring(0, 120) + '...'
      }
    }
    if (currentArticle) articles.push(currentArticle)
    return articles
  }

  const handleHelpfulClick = (helpful) => {
    setFeedback({ helpful })
    setFeedbackSubmitted(true)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600">Loading article...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Article Not Found</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Go Back
              </button>
              <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Search Articles
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-gray-600 mb-4">Article not found.</p>
          <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-blue-600">
          Dashboard
        </Link>
        <span>→</span>
        {article.category && (
          <>
            <span className="hover:text-blue-600">{article.category}</span>
            <span>→</span>
          </>
        )}
        <span className="text-gray-900 font-medium truncate">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Article Content */}
        <div className="lg:col-span-3">
          <article className="bg-white rounded-lg shadow-lg p-8">
            {/* Article Header */}
            <header className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {article.category && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {article.category}
                  </span>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    ⏱️ {article.reading_time} min read
                  </span>
                  <span className="flex items-center">
                    👁️ {article.views} views
                  </span>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>
              
              {article.excerpt && (
                <p className="text-xl text-gray-600 leading-relaxed mb-6">
                  {article.excerpt}
                </p>
              )}
              
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Article ID: {article.id}</span>
                  <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Print article"
                  >
                    🖨️
                  </button>
                  <button
                    onClick={() => navigator.share ? navigator.share({title: article.title, url: window.location.href}) : navigator.clipboard.writeText(window.location.href)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Share article"
                  >
                    📤
                  </button>
                </div>
              </div>
            </header>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              {article.content ? (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {article.content}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📄</div>
                  <p>Article content is not available.</p>
                  <p className="text-sm mt-2">The article exists but detailed content could not be loaded.</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Section */}
            {!feedbackSubmitted ? (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Was this article helpful?</h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleHelpfulClick(true)}
                    className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    👍 Yes, helpful
                  </button>
                  <button
                    onClick={() => handleHelpfulClick(false)}
                    className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    👎 Not helpful
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-green-700">
                  <span className="text-2xl">✅</span>
                  <span>Thank you for your feedback!</span>
                </div>
              </div>
            )}
          </article>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Articles</h3>
              <div className="space-y-4">
                {relatedArticles.map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    to={`/article/${relatedArticle.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                      {relatedArticle.title || 'Untitled Article'}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {relatedArticle.excerpt || 'No excerpt available'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/search"
                className="block w-full text-left p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                🔍 Search More Articles
              </Link>
              <Link
                to="/dashboard"
                className="block w-full text-left p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              >
                📊 Back to Dashboard
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="block w-full text-left p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ← Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArticleView 