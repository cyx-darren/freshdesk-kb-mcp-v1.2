import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import { chatService } from '../services/api.js'
import LoadingDots from './LoadingDots.jsx'

const ArticleEditor = ({ 
  isOpen, 
  onClose, 
  originalQuestion = '', 
  aiResponse = '', 
  initialDraft = null 
}) => {
  const { user, supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [folders, setFolders] = useState([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [foldersError, setFoldersError] = useState(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [tags, setTags] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)

  // Validation state
  const [validationErrors, setValidationErrors] = useState({})

  // SEO limits (based on common SEO best practices)
  const SEO_LIMITS = {
    title: 60,
    description: 160
  }

  // Rich text editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-md',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 px-1 rounded',
        },
      }),
    ],
    content: aiResponse || '<p>Start writing your article here...</p>',
    onUpdate: ({ editor }) => {
      setIsDirty(true)
    },
  })

  // Validation function
  const validateForm = () => {
    const errors = {}

    // Title validation
    if (!title.trim()) {
      errors.title = 'Article title is required'
    }

    // Folder validation
    if (!selectedFolderId) {
      errors.folder = 'Folder is required'
    }

    // Tags validation
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean)
    if (tagsArray.length === 0) {
      errors.tags = 'At least one tag is required'
    }

    // SEO Title validation
    if (!seoTitle.trim()) {
      errors.seoTitle = 'SEO title is required'
    } else if (seoTitle.length > SEO_LIMITS.title) {
      errors.seoTitle = `SEO title must be ${SEO_LIMITS.title} characters or less`
    }

    // SEO Description validation
    if (seoDescription.length > SEO_LIMITS.description) {
      errors.seoDescription = `SEO description must be ${SEO_LIMITS.description} characters or less`
    }

    // Content validation
    if (!editor || editor.getHTML() === '<p>Start writing your article here...</p>' || !editor.getText().trim()) {
      errors.content = 'Article content is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Load folders on mount
  useEffect(() => {
    if (isOpen) {
      loadFolders()
      
      // Initialize with draft data if provided
      if (initialDraft) {
        setTitle(initialDraft.title || '')
        setSelectedFolderId(initialDraft.folder_id || '')
        setTags(initialDraft.tags || '')
        setSeoTitle(initialDraft.seo_title || '')
        setSeoDescription(initialDraft.seo_description || '')
        setCurrentDraftId(initialDraft.id)
        setLastSaved(new Date(initialDraft.updated_at))
        
        if (editor && initialDraft.content) {
          editor.commands.setContent(initialDraft.content)
        }
      }
    }
  }, [isOpen, initialDraft, editor])

  // handleSaveDraft function - defined early to be used in useEffect dependencies
  const handleSaveDraft = useCallback(async (silent = false) => {
    if (!user || !editor) return
    
    if (!silent) setIsSaving(true)
    
    try {
      const draftData = {
        title: title || 'Untitled Article',
        content: editor.getHTML(),
        original_question: originalQuestion,
        ai_response: aiResponse,
        folder_id: selectedFolderId,
        tags: tags,
        seo_title: seoTitle,
        seo_description: seoDescription,
        user_id: user.id,
        status: 'draft'
      }

      // Save to Supabase
      const { data, error } = currentDraftId
        ? await supabase
            .from('article_drafts')
            .update(draftData)
            .eq('id', currentDraftId)
            .select()
            .single()
        : await supabase
            .from('article_drafts')
            .insert([draftData])
            .select()
            .single()

      if (error) throw error

      setCurrentDraftId(data.id)
      setLastSaved(new Date())
      setIsDirty(false)
      
      if (!silent) {
        // Show success message briefly
        setTimeout(() => setIsSaving(false), 1000)
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      if (!silent) setIsSaving(false)
    }
  }, [user, editor, title, originalQuestion, aiResponse, selectedFolderId, tags, seoTitle, seoDescription, currentDraftId, supabase])

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty || !editor) return
    
    const autoSaveTimer = setTimeout(() => {
      try {
        if (title || (editor && editor.getHTML() !== '<p>Start writing your article here...</p>')) {
          handleSaveDraft(true) // silent save
        }
      } catch (error) {
        console.error('Auto-save error:', error)
      }
    }, 3000) // Auto-save after 3 seconds of inactivity
    
    return () => clearTimeout(autoSaveTimer)
  }, [isDirty, title, editor, handleSaveDraft])

  // Clear validation errors when fields change
  useEffect(() => {
    if (validationErrors.title && title.trim()) {
      setValidationErrors(prev => ({ ...prev, title: null }))
    }
  }, [title])

  useEffect(() => {
    if (validationErrors.folder && selectedFolderId) {
      setValidationErrors(prev => ({ ...prev, folder: null }))
    }
  }, [selectedFolderId])

  useEffect(() => {
    if (validationErrors.tags && tags.trim()) {
      setValidationErrors(prev => ({ ...prev, tags: null }))
    }
  }, [tags])

  useEffect(() => {
    if (validationErrors.seoTitle && seoTitle.trim()) {
      setValidationErrors(prev => ({ ...prev, seoTitle: null }))
    }
  }, [seoTitle])

  useEffect(() => {
    if (validationErrors.seoDescription) {
      setValidationErrors(prev => ({ ...prev, seoDescription: null }))
    }
  }, [seoDescription])

  // handleClose function - defined early to be used in useEffect dependencies
  const handleClose = useCallback(() => {
    if (isDirty) {
      const shouldSave = confirm('You have unsaved changes. Save as draft before closing?')
      if (shouldSave) {
        handleSaveDraft(true)
      }
    }
    onClose()
  }, [isDirty, onClose, handleSaveDraft])

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    const handleKeyDown = (e) => {
      // Handle Escape key
      if (e.key === 'Escape') {
        handleClose()
      }
      
      // Handle Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveDraft(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose, handleSaveDraft])

  const loadFolders = async () => {
    setFoldersLoading(true)
    setFoldersError(null)
    try {
      const response = await chatService.getFolders()
      if (response.success && response.folders) {
        setFolders(response.folders)
        console.log(`Loaded ${response.folders.length} folders from ${response.total_categories} categories`)
      } else {
        throw new Error(response.message || 'Failed to load folders')
      }
    } catch (error) {
      console.error('Failed to load folders:', error)
      setFoldersError(error.message || 'Failed to load folders')
      setFolders([])
    } finally {
      setFoldersLoading(false)
    }
  }

  const refreshFolders = () => {
    loadFolders()
  }

  // Group folders by category for hierarchical display
  const groupedFolders = useMemo(() => {
    return folders.reduce((groups, folder) => {
      const categoryName = folder.category_name || 'Uncategorized'
      if (!groups[categoryName]) {
        groups[categoryName] = []
      }
      groups[categoryName].push(folder)
      return groups
    }, {})
  }, [folders])

  const handlePublish = async () => {
    // Validate form before publishing
    if (!validateForm()) {
      alert('Please fix the validation errors before publishing.')
      return
    }

    setIsPublishing(true)
    
    try {
      // First save as draft
      await handleSaveDraft(true)
      
      // Prepare tags array
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean)
      
      // Then publish to Freshdesk via MCP
      const articleData = {
        title: title.trim(),
        description: editor.getHTML(),
        folder_id: parseInt(selectedFolderId),
        tags: tagsArray,
        seo_title: seoTitle.trim(),
        meta_description: seoDescription.trim(),
        status: 2 // Published
      }

      console.log('Publishing article with data:', articleData)

      const response = await chatService.createArticle(articleData)
      
      if (response.success) {
        // Update draft status
        if (currentDraftId) {
          await supabase
            .from('article_drafts')
            .update({ 
              status: 'published',
              freshdesk_id: response.article?.id,
              published_at: new Date().toISOString()
            })
            .eq('id', currentDraftId)
        }
        
        alert(`Article published successfully! Article ID: ${response.article?.id || 'Unknown'}`)
        onClose()
      } else {
        throw new Error(response.message || 'Failed to publish article')
      }
    } catch (error) {
      console.error('Failed to publish article:', error)
      alert(`Failed to publish article: ${error.message}. Please try again.`)
    } finally {
      setIsPublishing(false)
    }
  }

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:')
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  // Helper function to render form field with error
  const renderFormField = (id, label, children, required = false, error = null) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">📝 Knowledge Base Article Editor</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Create and publish to Freshdesk</span>
                {lastSaved && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">💾 Last saved: {lastSaved.toLocaleTimeString()}</span>
                  </>
                )}
                {isSaving && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 flex items-center gap-1">
                      <LoadingDots />
                      Saving draft...
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              {showPreview ? '✏️ Edit' : '👁️ Preview'}
            </button>
            
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white hover:bg-opacity-80 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left panel - Context & Form */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto bg-gray-50">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  🔍 Context & Settings
                </h3>
                
                {originalQuestion && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      💬 Original Question
                    </h4>
                    <div className="p-3 bg-white rounded-lg border text-sm text-gray-700 shadow-sm">
                      {originalQuestion}
                    </div>
                  </div>
                )}
                
                {aiResponse && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      🤖 AI Response
                    </h4>
                    <div className="p-3 bg-white rounded-lg border text-sm text-gray-700 max-h-40 overflow-y-auto shadow-sm">
                      <div dangerouslySetInnerHTML={{ __html: aiResponse }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Article Metadata */}
              <div className="space-y-5">
                <h4 className="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  📄 Article Details
                </h4>

                {renderFormField(
                  'title',
                  'Article Title',
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setIsDirty(true)
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter article title..."
                  />,
                  true,
                  validationErrors.title
                )}

                {renderFormField(
                  'folder',
                  'Folder',
                  <div className="space-y-2">
                    <div className="relative">
                      <select
                        value={selectedFolderId}
                        onChange={(e) => {
                          setSelectedFolderId(e.target.value)
                          setIsDirty(true)
                        }}
                        className={`w-full px-3 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.folder ? 'border-red-500' : 'border-gray-300'} text-sm`}
                        disabled={foldersLoading}
                      >
                        <option value="">
                          {foldersLoading ? '⏳ Loading folders...' : '📁 Select folder...'}
                        </option>
                        {foldersLoading ? (
                          <option disabled>Loading folders from Freshdesk...</option>
                        ) : folders.length > 0 ? (
                          Object.entries(groupedFolders).map(([category, categoryFolders]) => (
                            <optgroup key={category} label={`📂 ${category} (${categoryFolders.length} folders)`}>
                              {categoryFolders
                                .sort((a, b) => {
                                  // Parent folders first, then child folders
                                  if (a.is_child !== b.is_child) {
                                    return a.is_child ? 1 : -1
                                  }
                                  return a.name.localeCompare(b.name)
                                })
                                .map((folder) => (
                                  <option key={folder.id} value={folder.id}>
                                    {folder.is_child ? '  └─ ' : '📁 '}{folder.name}
                                    {folder.visibility === 1 ? ' (Private)' : ''}
                                  </option>
                                ))}
                            </optgroup>
                          ))
                        ) : (
                          <option disabled>No folders available</option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={refreshFolders}
                        disabled={foldersLoading}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Refresh folders"
                      >
                        {foldersLoading ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {foldersLoading && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <LoadingDots />
                        <span>Fetching {folders.length > 0 ? 'updated ' : ''}folders from Freshdesk...</span>
                      </div>
                    )}
                    
                    {foldersError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-xs font-medium">
                          ⚠️ Error loading folders: {foldersError}
                        </p>
                        <button 
                          type="button"
                          onClick={refreshFolders}
                          className="mt-1 text-xs text-red-700 underline hover:no-underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    
                    {!foldersLoading && !foldersError && folders.length === 0 && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700 text-xs">
                          📂 No folders found. Please check your Freshdesk configuration.
                        </p>
                      </div>
                    )}
                    
                    {!foldersLoading && !foldersError && folders.length > 0 && (
                      <p className="text-green-600 text-xs">
                        ✅ {folders.length} folders loaded from {Object.keys(groupedFolders).length} categories
                      </p>
                    )}
                  </div>,
                  true,
                  validationErrors.folder
                )}

                {renderFormField(
                  'tags',
                  'Tags',
                  <>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => {
                        setTags(e.target.value)
                        setIsDirty(true)
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.tags ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="tag1, tag2, tag3..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separate tags with commas. 
                      {tags && (
                        <span className="ml-1 font-medium">
                          ({tags.split(',').filter(tag => tag.trim()).length} tags)
                        </span>
                      )}
                    </p>
                  </>,
                  true,
                  validationErrors.tags
                )}

                {/* SEO Section */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    SEO Settings
                  </h4>

                  {renderFormField(
                    'seoTitle',
                    'SEO Title',
                    <>
                      <input
                        type="text"
                        value={seoTitle}
                        onChange={(e) => {
                          setSeoTitle(e.target.value)
                          setIsDirty(true)
                        }}
                        maxLength={SEO_LIMITS.title + 10} // Allow a bit over for warning
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.seoTitle ? 'border-red-500' : seoTitle.length > SEO_LIMITS.title ? 'border-yellow-500' : 'border-gray-300'}`}
                        placeholder="Title for search engines..."
                      />
                      <p className={`text-xs mt-1 ${seoTitle.length > SEO_LIMITS.title ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {seoTitle.length}/{SEO_LIMITS.title} characters
                        {seoTitle.length > SEO_LIMITS.title && ' (over limit)'}
                      </p>
                    </>,
                    true,
                    validationErrors.seoTitle
                  )}

                  {renderFormField(
                    'seoDescription',
                    'SEO Description',
                    <>
                      <textarea
                        value={seoDescription}
                        onChange={(e) => {
                          setSeoDescription(e.target.value)
                          setIsDirty(true)
                        }}
                        maxLength={SEO_LIMITS.description + 20} // Allow a bit over for warning
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.seoDescription ? 'border-red-500' : seoDescription.length > SEO_LIMITS.description ? 'border-yellow-500' : 'border-gray-300'}`}
                        placeholder="Description for search engines..."
                      />
                      <p className={`text-xs mt-1 ${seoDescription.length > SEO_LIMITS.description ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {seoDescription.length}/{SEO_LIMITS.description} characters
                        {seoDescription.length > SEO_LIMITS.description && ' (over limit)'}
                      </p>
                    </>,
                    false,
                    validationErrors.seoDescription
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel - Editor/Preview */}
          <div className="flex-1 flex flex-col bg-white">
            {!showPreview ? (
              <>
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      ✏️ Rich Text Editor
                    </h4>
                    <div className="text-xs text-gray-500">
                      {editor ? `${editor.getText().length} characters` : '0 characters'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    {/* Text Styling */}
                    <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border shadow-sm">
                      <button
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={`px-3 py-1.5 text-sm rounded transition-all ${editor?.isActive('bold') ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                        title="Bold (Ctrl+B)"
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={`px-3 py-1.5 text-sm rounded transition-all ${editor?.isActive('italic') ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                        title="Italic (Ctrl+I)"
                      >
                        <em>I</em>
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleHighlight().run()}
                        className={`px-3 py-1.5 text-sm rounded transition-all ${editor?.isActive('highlight') ? 'bg-yellow-400 text-black shadow-sm' : 'text-gray-700 hover:bg-yellow-100'}`}
                        title="Highlight"
                      >
                        🖍️
                      </button>
                    </div>
                    
                    {/* Headings */}
                    <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border shadow-sm">
                      <button
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`px-3 py-1.5 text-sm rounded font-semibold transition-all ${editor?.isActive('heading', { level: 1 }) ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                        title="Heading 1"
                      >
                        H1
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`px-3 py-1.5 text-sm rounded font-medium transition-all ${editor?.isActive('heading', { level: 2 }) ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                        title="Heading 2"
                      >
                        H2
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={`px-3 py-1.5 text-sm rounded transition-all ${editor?.isActive('bulletList') ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                        title="Bullet List"
                      >
                        📋
                      </button>
                    </div>
                    
                    {/* Media & Links */}
                    <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border shadow-sm">
                      <button
                        onClick={insertLink}
                        className="px-3 py-1.5 text-sm rounded text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all"
                        title="Insert Link"
                      >
                        🔗
                      </button>
                      <button
                        onClick={insertImage}
                        className="px-3 py-1.5 text-sm rounded text-gray-700 hover:bg-green-50 hover:text-green-700 transition-all"
                        title="Insert Image"
                      >
                        🖼️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 p-6 overflow-y-auto bg-white">
                  <div className={`min-h-full border-2 border-dashed rounded-lg transition-colors ${validationErrors.content ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <EditorContent 
                      editor={editor} 
                      className="prose prose-gray max-w-none min-h-full p-4 focus:outline-none"
                    />
                  </div>
                  {validationErrors.content && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">⚠️ {validationErrors.content}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Preview Mode */
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        👁️ Article Preview
                      </h3>
                      <p className="text-sm text-gray-600">This is how your article will appear in the knowledge base</p>
                    </div>
                    
                    <article className="prose prose-lg max-w-none">
                      <header className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                          {title || 'Untitled Article'}
                        </h1>
                        {seoTitle && (
                          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                            <p className="text-sm text-blue-800 mb-1">
                              <strong>🔍 SEO Title:</strong> {seoTitle}
                            </p>
                            {seoDescription && (
                              <p className="text-sm text-blue-700">
                                <strong>📝 SEO Description:</strong> {seoDescription}
                              </p>
                            )}
                          </div>
                        )}
                      </header>
                      
                      <div 
                        className="text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: editor?.getHTML() || '<p class="text-gray-500 italic">No content yet...</p>' 
                        }}
                      />
                      
                      {tags && (
                        <footer className="mt-8 pt-6 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">🏷️ Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {tags.split(',').map((tag, index) => {
                              const trimmedTag = tag.trim()
                              return trimmedTag ? (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm rounded-full border border-blue-200"
                                >
                                  {trimmedTag}
                                </span>
                              ) : null
                            })}
                          </div>
                        </footer>
                      )}
                    </article>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              {isDirty && (
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  ⚠️ Unsaved changes
                </span>
              )}
              {Object.keys(validationErrors).length > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  🚨 {Object.keys(validationErrors).length} validation error{Object.keys(validationErrors).length > 1 ? 's' : ''}
                </span>
              )}
              {!isDirty && Object.keys(validationErrors).length === 0 && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  ✅ Ready to publish
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleSaveDraft(false)}
                disabled={isSaving || isPublishing}
                className="px-6 py-2.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <LoadingDots size="sm" />
                    Saving...
                  </>
                ) : (
                  <>
                    💾 Save Draft
                  </>
                )}
              </button>
              
              <button
                onClick={handlePublish}
                disabled={isPublishing || isSaving || Object.keys(validationErrors).length > 0}
                className="px-6 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-medium flex items-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <LoadingDots size="sm" />
                    Publishing...
                  </>
                ) : (
                  <>
                    🚀 Publish Article
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Additional info row */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>📊 Words: {editor ? editor.getText().split(/\s+/).filter(word => word.length > 0).length : 0}</span>
              <span>📝 Characters: {editor ? editor.getText().length : 0}</span>
              {folders.length > 0 && (
                <span>📁 {folders.length} folders available</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Esc</kbd>
              <span>to close</span>
              <span>•</span>
              <kbd className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Ctrl+S</kbd>
              <span>to save</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArticleEditor