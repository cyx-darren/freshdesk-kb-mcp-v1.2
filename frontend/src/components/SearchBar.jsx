import React, { useState, useEffect, useRef } from 'react'

function SearchBar({ 
  value = '', 
  onChange, 
  onSearch, 
  placeholder = 'Search articles...', 
  loading = false,
  showShortcuts = true,
  autoFocus = false 
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      
      // Escape to clear search and blur
      if (e.key === 'Escape' && isFocused) {
        e.preventDefault()
        handleClear()
        inputRef.current?.blur()
      }
    }

    if (showShortcuts) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFocused, showShortcuts])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange?.(newValue)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (localValue.trim()) {
      onSearch?.(localValue.trim())
    }
  }

  const handleClear = () => {
    setLocalValue('')
    onChange?.('')
    onSearch?.('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={`relative group ${isFocused ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} rounded-lg transition-all duration-200`}>
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          ) : (
            <svg 
              className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={loading}
          className={`
            w-full pl-12 pr-20 py-4 text-lg
            border border-gray-200 rounded-lg
            bg-white
            placeholder-gray-400 text-gray-900
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            hover:border-gray-300
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          `}
        />

        {/* Right Actions */}
        <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-4">
          {/* Clear Button */}
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Keyboard Shortcut Hint */}
          {showShortcuts && !isFocused && !localValue && (
            <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border">
              <span>⌘</span>
              <span>K</span>
            </div>
          )}

          {/* Search Button */}
          <button
            type="submit"
            disabled={loading || !localValue.trim()}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm
              transition-all duration-200
              ${localValue.trim() && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Searching...</span>
              </div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </div>

      {/* Search Suggestions/Recent Searches could go here */}
      {isFocused && localValue.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Quick searches</h4>
              <div className="space-y-1">
                {[
                  'getting started',
                  'troubleshooting',
                  'account settings',
                  'billing and payments'
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setLocalValue(suggestion)
                      onChange?.(suggestion)
                      onSearch?.(suggestion)
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {showShortcuts && (
              <div className="border-t border-gray-200 pt-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Keyboard shortcuts</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Focus search</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded">⌘ K</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Clear and close</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Search</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded">Enter</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  )
}

export default SearchBar 