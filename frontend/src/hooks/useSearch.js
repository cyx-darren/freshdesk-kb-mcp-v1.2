import { useState, useCallback, useRef } from 'react'
import { articleService } from '../services'

export const useSearch = () => {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [totalResults, setTotalResults] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOptions, setSearchOptions] = useState({})
  
  // Ref to track the latest search request
  const searchController = useRef(null)

  const search = useCallback(async (query, options = {}) => {
    // Cancel previous search if still in progress
    if (searchController.current) {
      searchController.current.abort()
    }

    // Create new AbortController for this search
    searchController.current = new AbortController()

    const trimmedQuery = query?.trim() || ''
    
    if (!trimmedQuery) {
      setResults([])
      setTotalResults(0)
      setSearchQuery('')
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setSearchQuery(trimmedQuery)
    setSearchOptions(options)

    try {
      const response = await articleService.searchArticles(trimmedQuery, {
        ...options,
        signal: searchController.current.signal // Add abort signal
      })

      // Check if this request was cancelled
      if (searchController.current.signal.aborted) {
        return
      }

      if (response.success) {
        setResults(response.data.articles || [])
        setTotalResults(response.data.total_results || 0)
        setError(null)
      } else {
        setError(response.error || 'Search failed')
        setResults([])
        setTotalResults(0)
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError') {
        console.log('Search cancelled')
        return
      }

      console.error('Search error:', err)
      setError(err.response?.data?.message || err.message || 'Search failed')
      setResults([])
      setTotalResults(0)
    } finally {
      setLoading(false)
      searchController.current = null
    }
  }, [])

  const advancedSearch = useCallback(async (filters = {}) => {
    // Cancel previous search if still in progress
    if (searchController.current) {
      searchController.current.abort()
    }

    searchController.current = new AbortController()

    setLoading(true)
    setError(null)
    setSearchQuery(filters.query || '')
    setSearchOptions(filters)

    try {
      const response = await articleService.advancedSearch({
        ...filters,
        signal: searchController.current.signal
      })

      if (searchController.current.signal.aborted) {
        return
      }

      if (response.success) {
        setResults(response.data.articles || [])
        setTotalResults(response.data.total_results || 0)
        setError(null)
      } else {
        setError(response.error || 'Advanced search failed')
        setResults([])
        setTotalResults(0)
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Advanced search cancelled')
        return
      }

      console.error('Advanced search error:', err)
      setError(err.response?.data?.message || err.message || 'Advanced search failed')
      setResults([])
      setTotalResults(0)
    } finally {
      setLoading(false)
      searchController.current = null
    }
  }, [])

  const clearResults = useCallback(() => {
    // Cancel any ongoing search
    if (searchController.current) {
      searchController.current.abort()
    }

    setResults([])
    setTotalResults(0)
    setError(null)
    setSearchQuery('')
    setSearchOptions({})
  }, [])

  const retrySearch = useCallback(() => {
    if (searchQuery) {
      search(searchQuery, searchOptions)
    }
  }, [search, searchQuery, searchOptions])

  return {
    // State
    results,
    loading,
    error,
    totalResults,
    searchQuery,
    searchOptions,
    
    // Actions
    search,
    advancedSearch,
    clearResults,
    retrySearch,
    
    // Utility
    hasResults: results.length > 0,
    hasError: !!error,
    isSearching: loading,
    canRetry: !!error && !!searchQuery
  }
}

// Hook for getting article categories
export const useCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCategories = useCallback(async (options = {}) => {
    setLoading(true)
    setError(null)

    try {
      const response = await articleService.getCategories(options)
      
      if (response.success) {
        setCategories(response.data.categories || [])
        setError(null)
      } else {
        setError(response.error || 'Failed to fetch categories')
        setCategories([])
      }
    } catch (err) {
      console.error('Categories error:', err)
      setError(err.message || 'Failed to fetch categories')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    categories,
    loading,
    error,
    fetchCategories,
    hasCategories: categories.length > 0
  }
}

// Hook for getting a single article
export const useArticle = (articleId) => {
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchArticle = useCallback(async (id = articleId, options = {}) => {
    if (!id) {
      setError('Article ID is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await articleService.getArticle(id, options)
      
      if (response.success) {
        setArticle(response.data)
        setError(null)
        
        // Record view for analytics
        await articleService.recordView(id).catch(err => 
          console.warn('Failed to record view:', err)
        )
      } else {
        setError(response.error || 'Failed to fetch article')
        setArticle(null)
      }
    } catch (err) {
      console.error('Article fetch error:', err)
      setError(err.message || 'Failed to fetch article')
      setArticle(null)
    } finally {
      setLoading(false)
    }
  }, [articleId])

  const submitFeedback = useCallback(async (feedback) => {
    if (!articleId) return

    try {
      const response = await articleService.submitFeedback(articleId, feedback)
      return response
    } catch (err) {
      console.error('Feedback submission error:', err)
      throw err
    }
  }, [articleId])

  return {
    article,
    loading,
    error,
    fetchArticle,
    submitFeedback,
    hasArticle: !!article
  }
}

export default useSearch 