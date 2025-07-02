import React, { useState, useRef, useEffect } from 'react'

function CategoryFilter({ 
  categories = [], 
  selected = '', 
  onChange, 
  placeholder = 'All Categories',
  showCounts = true,
  multiSelect = false,
  maxDisplayed = 10,
  searchable = true,
  loading = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState(multiSelect ? [] : selected)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (multiSelect) {
      setSelectedItems(Array.isArray(selected) ? selected : [])
    } else {
      setSelectedItems(selected)
    }
  }, [selected, multiSelect])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const filteredCategories = categories.filter(category => 
    !searchTerm || 
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, maxDisplayed)

  const handleCategorySelect = (categoryId) => {
    if (multiSelect) {
      const newSelection = selectedItems.includes(categoryId)
        ? selectedItems.filter(id => id !== categoryId)
        : [...selectedItems, categoryId]
      
      setSelectedItems(newSelection)
      onChange?.(newSelection)
    } else {
      const newSelection = selectedItems === categoryId ? '' : categoryId
      setSelectedItems(newSelection)
      onChange?.(newSelection)
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  const handleClearAll = () => {
    const newSelection = multiSelect ? [] : ''
    setSelectedItems(newSelection)
    onChange?.(newSelection)
    if (!multiSelect) {
      setIsOpen(false)
    }
  }

  const getSelectedCategory = () => {
    if (multiSelect) {
      return selectedItems.length > 0 
        ? `${selectedItems.length} selected`
        : placeholder
    } else {
      const category = categories.find(cat => cat.id === selectedItems)
      return category ? category.name : placeholder
    }
  }

  const getSelectedCategories = () => {
    if (!multiSelect) return []
    return categories.filter(cat => selectedItems.includes(cat.id))
  }

  if (loading) {
    return (
      <div className="relative">
        <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button/Input */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-3 text-left border rounded-lg bg-white
          flex items-center justify-between
          transition-all duration-200
          ${isOpen 
            ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20' 
            : 'border-gray-200 hover:border-gray-300'
          }
          ${categories.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
        disabled={categories.length === 0}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {/* Category Icon */}
          <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          
          {/* Selected Text */}
          <span className="text-gray-900 truncate">
            {getSelectedCategory()}
          </span>
        </div>

        {/* Clear Button & Dropdown Arrow */}
        <div className="flex items-center space-x-2">
          {((multiSelect && selectedItems.length > 0) || (!multiSelect && selectedItems)) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClearAll()
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
              title="Clear selection"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <svg 
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Selected Categories (Multi-select) */}
      {multiSelect && selectedItems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {getSelectedCategories().map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {category.name}
              <button
                type="button"
                onClick={() => handleCategorySelect(category.id)}
                className="ml-1.5 h-3 w-3 text-blue-600 hover:text-blue-800"
              >
                <svg fill="currentColor" viewBox="0 0 8 8">
                  <path d="M1.41 0L0 1.41 2.59 4 0 6.59 1.41 8 4 5.41 6.59 8 8 6.59 5.41 4 8 1.41 6.59 0 4 2.59 1.41 0z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Search Input */}
          {searchable && categories.length > 5 && (
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="max-h-64 overflow-y-auto">
            {/* All Categories Option */}
            {!multiSelect && (
              <button
                type="button"
                onClick={() => handleCategorySelect('')}
                className={`
                  w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
                  flex items-center justify-between
                  ${!selectedItems ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${!selectedItems ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {!selectedItems && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span>All Categories</span>
                </div>
                {showCounts && (
                  <span className="text-sm text-gray-500">
                    {categories.reduce((sum, cat) => sum + (cat.article_count || 0), 0)}
                  </span>
                )}
              </button>
            )}

            {filteredCategories.length === 0 && searchTerm ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">No categories found</p>
              </div>
            ) : (
              filteredCategories.map((category) => {
                const isSelected = multiSelect 
                  ? selectedItems.includes(category.id)
                  : selectedItems === category.id

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategorySelect(category.id)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
                      flex items-center justify-between
                      ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                    `}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {/* Checkbox/Radio */}
                      <div className={`w-4 h-4 rounded ${multiSelect ? '' : 'rounded-full'} border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Category Name */}
                      <span className="truncate">{category.name}</span>
                    </div>

                    {/* Article Count */}
                    {showCounts && category.article_count !== undefined && (
                      <span className="text-sm text-gray-500 ml-2">
                        {category.article_count}
                      </span>
                    )}
                  </button>
                )
              })
            )}

            {/* Show More Button */}
            {categories.length > maxDisplayed && filteredCategories.length === maxDisplayed && !searchTerm && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600 text-center">
                  Showing {maxDisplayed} of {categories.length} categories
                  {searchable && (
                    <span className="block mt-1">Use search to find more categories</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryFilter 