import React, { useState, useEffect } from 'react'
import { chatService } from '../services/api.js'
import LoadingDots from './LoadingDots.jsx'

const CreateFolderModal = ({ 
  isOpen, 
  onClose, 
  onFolderCreated,
  categories = [],
  folders = []
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [skipCategorySelection, setSkipCategorySelection] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    parent_folder_id: '',
    visibility: 2 // Public by default
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [error, setError] = useState(null)

  // Ensure categories and folders are always arrays
  const safeCategories = Array.isArray(categories) ? categories : []
  const safeFolders = Array.isArray(folders) ? folders : []

  // Extract categories from folders if no categories are provided
  const categoriesFromFolders = React.useMemo(() => {
    if (safeCategories.length > 0) return safeCategories
    
    // Extract unique categories from folders
    const categoryMap = new Map()
    safeFolders.forEach(folder => {
      if (folder.category_id && folder.category_name) {
        categoryMap.set(folder.category_id, {
          id: folder.category_id,
          name: folder.category_name
        })
      }
    })
    
    return Array.from(categoryMap.values())
  }, [safeCategories, safeFolders])

  // Filter parent folders for the selected category
  const availableParentFolders = React.useMemo(() => {
    if (!formData.category_id) return []
    
    return safeFolders.filter(folder => {
      return !folder.is_child && 
             folder.category_id && 
             folder.category_id.toString() === formData.category_id.toString()
    })
  }, [safeFolders, formData.category_id])

  // Set timeout for categories loading
  useEffect(() => {
    if (isOpen && categoriesFromFolders.length === 0 && !loadingTimeout) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
      }, 10000) // 10 second timeout
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, categoriesFromFolders.length, loadingTimeout])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        category_id: '',
        parent_folder_id: '',
        visibility: 2
      })
      setValidationErrors({})
      setError(null)
      setLoadingTimeout(false)
      setSkipCategorySelection(false)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const validateForm = () => {
    const errors = {}

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Folder name is required'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Folder name must be at least 2 characters'
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Folder name must be less than 100 characters'
    }

    // Category validation - only required if not skipping and categories are available
    if (!skipCategorySelection && categoriesFromFolders.length > 0 && !formData.category_id) {
      errors.category_id = 'Category is required'
    }

    // Parent folder validation (optional, but if provided, must be valid)
    if (formData.parent_folder_id && !availableParentFolders.some(f => f.id.toString() === formData.parent_folder_id.toString())) {
      errors.parent_folder_id = 'Invalid parent folder selected'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      // Prepare folder data
      const folderData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        visibility: parseInt(formData.visibility)
      }

      // Add category_id if available and not skipping
      if (!skipCategorySelection && formData.category_id) {
        folderData.category_id = parseInt(formData.category_id)
      }

      // Add parent_folder_id if selected
      if (formData.parent_folder_id) {
        folderData.parent_folder_id = parseInt(formData.parent_folder_id)
      }

      // Remove undefined fields
      Object.keys(folderData).forEach(key => {
        if (folderData[key] === undefined) {
          delete folderData[key]
        }
      })

      console.log('CreateFolderModal: Creating folder with data:', folderData)
      console.log('CreateFolderModal: Original form data:', formData)
      console.log('CreateFolderModal: Skip category selection:', skipCategorySelection)

      const response = await chatService.createFolder(folderData)
      
      console.log('CreateFolderModal: Response received:', response)
      
      if (response.success) {
        console.log('CreateFolderModal: Folder created successfully:', response.folder)
        
        // Call the success callback with the new folder
        if (onFolderCreated) {
          onFolderCreated(response.folder)
        }
        
        // Close the modal
        onClose()
        
        // Show success message
        alert(`Folder "${formData.name}" created successfully!`)
      } else {
        throw new Error(response.message || 'Failed to create folder')
      }
    } catch (error) {
      console.error('CreateFolderModal: Error creating folder:', error)
      console.error('CreateFolderModal: Error response:', error.response?.data)
      console.error('CreateFolderModal: Error status:', error.response?.status)
      
      // Enhanced error handling with more specific messaging
      let errorMessage = 'An unexpected error occurred while creating the folder.'
      
      if (error.response) {
        const status = error.response.status
        const responseData = error.response.data

        switch (status) {
          case 400:
            errorMessage = 'Bad Request: Please check your folder details and try again.'
            break
          case 401:
            errorMessage = 'Authentication Failed: Please check your API credentials.'
            break
          case 403:
            errorMessage = 'Access Denied: You don\'t have permission to create folders in this category.'
            break
          case 404:
            errorMessage = `Category Not Found: The selected category (ID: ${formData.category_id}) doesn't exist or you don't have access to it.\n\n✅ **Solution**: Please select a different category or contact your Freshdesk administrator.`
            break
          case 422:
            errorMessage = 'Validation Error: The folder name might already exist in this category or contains invalid characters.'
            break
          default:
            errorMessage = `API Error (${status}): ${error.response.statusText || 'Unknown error'}`
        }
      } else if (error.message?.includes('Category ID is required')) {
        errorMessage = `❌ **Category Required**: Folders must be created within a specific category.\n\n📋 **What happened?**: According to Freshdesk API documentation, all folders must belong to a category.\n\n✅ **Solution**: Please select a category from the dropdown above before creating the folder.`
      } else {
        errorMessage = `Network Error: Unable to connect to the server. Please check your internet connection and try again.`
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleSkipCategories = () => {
    setSkipCategorySelection(true)
    setFormData(prev => ({ ...prev, category_id: '', parent_folder_id: '' }))
  }

  // Helper function to render form field with error
  const renderFormField = (id, label, children, required = false, error = null, helpText = null) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {helpText && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  )

  if (!isOpen) return null

  // Debug logging
  console.log('CreateFolderModal rendering with:', { 
    isOpen, 
    categoriesCount: safeCategories.length, 
    foldersCount: safeFolders.length,
    categoriesFromFolders: categoriesFromFolders.length,
    loadingTimeout,
    skipCategorySelection
  })
  
  // Show loading state if categories are not loaded yet and timeout hasn't occurred
  if (categoriesFromFolders.length === 0 && !loadingTimeout && !skipCategorySelection) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Loading Folders</h2>
          <p className="text-gray-600 mb-6 text-center">Please wait while we load the folder structure from Freshdesk...</p>
          <div className="flex justify-center mb-6">
            <LoadingDots />
          </div>
          <div className="space-y-3">
            <button
              onClick={handleSkipCategories}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Folder at Root Level
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 <strong>Note:</strong> You can create a folder at the root level if folder loading takes too long.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show main form
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create New Folder</h2>
                <p className="text-sm text-gray-600">
                  {skipCategorySelection ? 'Creating folder at root level' : 'Organize your knowledge base content'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Folder Name */}
            {renderFormField(
              'name',
              'Folder Name',
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="Enter folder name..."
                disabled={isLoading}
                maxLength={100}
              />,
              true,
              validationErrors.name,
              "Choose a descriptive name for your folder"
            )}

            {/* Description */}
            {renderFormField(
              'description',
              'Description',
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Optional: Describe what this folder will contain..."
                rows={3}
                disabled={isLoading}
                maxLength={500}
              />,
              false,
              null,
              "Optional: Brief description of the folder's purpose"
            )}

            {/* Category Selection - only show if not skipping and categories are available */}
            {!skipCategorySelection && categoriesFromFolders.length > 0 && renderFormField(
              'category_id',
              'Category',
              <select
                id="category_id"
                value={formData.category_id}
                onChange={(e) => handleInputChange('category_id', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  validationErrors.category_id ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                disabled={isLoading}
              >
                <option value="">📂 Select category...</option>
                {categoriesFromFolders.map((category) => (
                  <option key={category.id} value={category.id}>
                    📂 {category.name}
                  </option>
                ))}
              </select>,
              !skipCategorySelection,
              validationErrors.category_id,
              "Choose which category this folder belongs to"
            )}

            {/* Parent Folder Selection - only show if category is selected */}
            {formData.category_id && availableParentFolders.length > 0 && renderFormField(
              'parent_folder_id',
              'Parent Folder',
              <select
                id="parent_folder_id"
                value={formData.parent_folder_id}
                onChange={(e) => handleInputChange('parent_folder_id', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isLoading}
              >
                <option value="">📁 Create at category root</option>
                {availableParentFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>,
              false,
              validationErrors.parent_folder_id,
              "Optional: Choose a parent folder to create this folder inside"
            )}

            {/* Visibility */}
            {renderFormField(
              'visibility',
              'Visibility',
              <select
                id="visibility"
                value={formData.visibility}
                onChange={(e) => handleInputChange('visibility', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isLoading}
              >
                <option value={1}>🔒 Private - Only agents can access</option>
                <option value={2}>🌐 Public - Everyone can access</option>
                <option value={3}>👥 Logged in users only</option>
                <option value={4}>🎯 Selected companies only</option>
              </select>,
              false,
              null,
              "Choose who can see this folder and its content"
            )}

            {/* Skip Categories Option */}
            {!skipCategorySelection && categoriesFromFolders.length === 0 && loadingTimeout && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800">Categories not loading</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      We couldn't load the categories from Freshdesk. You can create a folder at the root level instead.
                    </p>
                    <button
                      type="button"
                      onClick={handleSkipCategories}
                      className="mt-2 text-sm text-yellow-800 hover:text-yellow-900 underline"
                    >
                      Continue without category selection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Root Level Notice */}
            {skipCategorySelection && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800">Creating at root level</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This folder will be created at the root level. You can organize it into categories later using Freshdesk.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Error Creating Folder</h4>
                    <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
                    
                    {/* Additional help for 404 errors */}
                    {error.includes('404') && (
                      <div className="mt-4 pt-4 border-t border-red-200">
                        <h5 className="text-sm font-medium text-red-800 mb-2">💡 Alternative Solutions:</h5>
                        <div className="text-sm text-red-700 space-y-2">
                          <div>• <strong>Create via Freshdesk Admin Panel:</strong> Go to Solutions &gt; Categories &gt; Add Folder</div>
                          <div>• <strong>Use the Article Editor:</strong> You can still create articles even if folder creation fails</div>
                          <div>• <strong>Contact Support:</strong> Ask your admin to create the folder or check API permissions</div>
                        </div>
                        <a 
                          href="https://support.freshdesk.com/support/solutions/articles/156521-understanding-the-three-level-solutions-hierarchy" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-red-600 hover:text-red-800 mt-3"
                        >
                          📖 Learn more about Freshdesk folder management
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {error?.includes('404') ? 'Close & Try Alternative' : 'Cancel'}
              </button>
              
              <div className="flex space-x-3">
                {error?.includes('404') ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        window.open('https://easyprint.freshdesk.com/support/solutions', '_blank')
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      🌐 Open Freshdesk Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      🔄 Try Again
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || (!formData.name.trim())}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Create Folder'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateFolderModal 