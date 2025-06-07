import React from 'react'
import { Link } from 'react-router-dom'

function ArticleList({ 
  articles = [], 
  loading = false, 
  emptyMessage = 'No articles found.',
  showExcerpt = true,
  showCategory = true,
  showMetadata = true,
  gridCols = 'sm:grid-cols-2 lg:grid-cols-3',
  layout = 'grid', // 'grid' or 'list'
  onArticleClick
}) {
  
  if (loading) {
    return (
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="space-y-4">
              {/* Category badge skeleton */}
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              
              {/* Title skeleton */}
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-full"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
              
              {/* Excerpt skeleton */}
              {showExcerpt && (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              )}
              
              {/* Metadata skeleton */}
              <div className="flex items-center space-x-4">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12">
        <svg 
          className="mx-auto h-16 w-16 text-gray-300 mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
        <p className="text-gray-500 max-w-md mx-auto">{emptyMessage}</p>
      </div>
    )
  }

  if (layout === 'list') {
    return (
      <div className="space-y-4">
        {articles.map((article, index) => (
          <ArticleListItem
            key={article.id || index}
            article={article}
            showExcerpt={showExcerpt}
            showCategory={showCategory}
            showMetadata={showMetadata}
            onArticleClick={onArticleClick}
            layout="list"
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
      {articles.map((article, index) => (
        <ArticleListItem
          key={article.id || index}
          article={article}
          showExcerpt={showExcerpt}
          showCategory={showCategory}
          showMetadata={showMetadata}
          onArticleClick={onArticleClick}
          layout="grid"
        />
      ))}
    </div>
  )
}

function ArticleListItem({ 
  article, 
  showExcerpt, 
  showCategory, 
  showMetadata, 
  onArticleClick, 
  layout 
}) {
  const handleClick = () => {
    onArticleClick?.(article)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return ''
    }
  }

  const formatReadingTime = (minutes) => {
    if (!minutes) return '3 min read' // Default fallback
    return `${minutes} min read`
  }

  const truncateText = (text, maxLength = 150) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  if (layout === 'list') {
    return (
      <Link
        to={`/article/${article.id}`}
        onClick={handleClick}
        className="block bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Category */}
              {showCategory && article.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-3">
                  {article.category}
                </span>
              )}
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                {article.title}
              </h3>
              
              {/* Excerpt */}
              {showExcerpt && article.excerpt && (
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {truncateText(article.excerpt, 120)}
                </p>
              )}
              
              {/* Metadata */}
              {showMetadata && (
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {article.updated_at && (
                    <span className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(article.updated_at)}
                    </span>
                  )}
                  
                  {article.reading_time && (
                    <span className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatReadingTime(article.reading_time)}
                    </span>
                  )}
                  
                  {article.views && (
                    <span className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {article.views} views
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Arrow icon */}
            <div className="ml-4 flex-shrink-0">
              <svg 
                className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Grid layout
  return (
    <Link
      to={`/article/${article.id}`}
      onClick={handleClick}
      className="block bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-gray-300 hover:-translate-y-1 transition-all duration-200 group overflow-hidden"
    >
      <div className="p-6 h-full flex flex-col">
        {/* Category */}
        {showCategory && article.category && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-3 self-start">
            {article.category}
          </span>
        )}
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-3">
          {article.title}
        </h3>
        
        {/* Excerpt */}
        {showExcerpt && article.excerpt && (
          <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
            {truncateText(article.excerpt)}
          </p>
        )}
        
        {/* Metadata */}
        {showMetadata && (
          <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-3">
              {article.updated_at && (
                <span className="flex items-center">
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(article.updated_at)}
                </span>
              )}
              
              {article.reading_time && (
                <span className="flex items-center">
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatReadingTime(article.reading_time)}
                </span>
              )}
            </div>
            
            {article.views && (
              <span className="flex items-center">
                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {article.views}
              </span>
            )}
          </div>
        )}
        
        {/* Read more indicator */}
        <div className="flex items-center justify-end mt-3 text-blue-600 group-hover:text-blue-700 transition-colors">
          <span className="text-sm font-medium">Read more</span>
          <svg className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

export default ArticleList 