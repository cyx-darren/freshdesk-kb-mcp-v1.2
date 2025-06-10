import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import Blockquote from '@tiptap/extension-blockquote'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import OrderedList from '@tiptap/extension-ordered-list'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { useSupabase } from '../contexts/SupabaseContext.jsx'
import { chatService } from '../services/api.js'
import LoadingDots from './LoadingDots.jsx'
import CreateFolderModal from './CreateFolderModal.jsx'
import RichTextToolbar from './RichTextToolbar.jsx'

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
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  
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

  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)

  // Rich text editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default extensions we're replacing
        orderedList: false,
        taskList: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      // Text Styling
      TextStyle,
      Color,
      Underline,
      Strike,
      Superscript,
      Subscript,
      Code.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm',
        },
      }),
      // Content Blocks
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto',
        },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-gray-300 pl-4 my-4 italic text-gray-700',
        },
      }),
      HorizontalRule.configure({
        HTMLAttributes: {
          class: 'border-gray-300 my-6',
        },
      }),
      // Links and Images
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
      // Lists
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-inside ml-4',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'list-none ml-0',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'flex items-start',
        },
      }),
      // Text Alignment
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // Highlighting
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'px-1 rounded',
        },
      }),
      // Tables
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full border border-gray-300 my-4',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b border-gray-300',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-3 py-2',
        },
      }),
    ],
    content: aiResponse || '<p>Start writing your article here...</p>',
    onUpdate: ({ editor }) => {
      setIsDirty(true)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-gray max-w-none min-h-full p-4 focus:outline-none',
      },
      handleKeyDown: (view, event) => {
        // Custom keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case 's':
              event.preventDefault()
              handleSaveDraft(false)
              return true
            case 'Enter':
              if (event.shiftKey) {
                event.preventDefault()
                handlePublish()
                return true
              }
              break
          }
        }
        return false
      },
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
      loadCategories()
      
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
    if (!isDirty || !editor || !autoSaveEnabled) return
    
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

  const loadCategories = async () => {
    setCategoriesLoading(true)
    try {
      const response = await chatService.getCategories()
      if (response.success && response.categories) {
        setCategories(response.categories)
        console.log(`Loaded ${response.categories.length} categories`)
      } else {
        throw new Error(response.message || 'Failed to load categories')
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }

  const refreshFolders = () => {
    loadFolders()
  }

  const handleFolderCreated = (newFolder) => {
    console.log('New folder created:', newFolder)
    
    // Add the new folder to the folders list
    if (newFolder && newFolder.id) {
      // Create a folder object that matches the expected format
      const folderToAdd = {
        id: newFolder.id,
        name: newFolder.name,
        description: newFolder.description || null,
        category_id: newFolder.category_id,
        category_name: categories.find(cat => cat.id === newFolder.category_id)?.name || 'Unknown Category',
        parent_folder_id: newFolder.parent_folder_id || null,
        is_child: !!newFolder.parent_folder_id,
        visibility: newFolder.visibility || 2,
        created_at: newFolder.created_at || new Date().toISOString(),
        updated_at: newFolder.updated_at || new Date().toISOString()
      }
      
      setFolders(prevFolders => [...prevFolders, folderToAdd])
      
      // Auto-select the newly created folder
      setSelectedFolderId(newFolder.id.toString())
      setIsDirty(true)
      
      console.log('Auto-selected new folder:', newFolder.id)
    }
    
    // Optionally refresh the full folder list to ensure consistency
    // refreshFolders()
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
    const isValid = validateForm()
    
    if (!isValid) {
      const errorMessages = Object.entries(validationErrors)
        .filter(([key, error]) => error)
        .map(([key, error]) => `• ${error}`)
        .join('\n')
      
      alert(`Please fix the following validation errors before publishing:\n\n${errorMessages}`)
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

  // Debug logging
  console.log('ArticleEditor rendering with isOpen:', isOpen)
  console.log('Editor state:', editor ? 'initialized' : 'not initialized')
  
  // Early error boundary - if editor fails to initialize, show a fallback
  if (isOpen && !editor) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Loading Editor...</h2>
          <p className="text-gray-600 mb-4">The rich text editor is initializing. Please wait...</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

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

              {/* Validation Summary */}
              {Object.keys(validationErrors).filter(key => validationErrors[key]).length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.804-.833-2.574 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Required Fields Missing
                  </h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {Object.entries(validationErrors)
                      .filter(([key, error]) => error)
                      .map(([key, error]) => (
                        <li key={key} className="flex items-center">
                          <span className="text-red-500 mr-2">•</span>
                          {error}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

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
                  <div className="flex items-center justify-between">
                    <span>Folder <span className="text-red-500">*</span></span>
                    <button
                      type="button"
                      onClick={() => setShowCreateFolderModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center space-x-1"
                      disabled={foldersLoading || categoriesLoading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create new</span>
                    </button>
                  </div>,
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
                          📂 No folders found. You can create a new folder to get started.
                        </p>
                      </div>
                    )}
                    
                    {!foldersLoading && !foldersError && folders.length > 0 && (
                      <p className="text-green-600 text-xs">
                        ✅ {folders.length} folders loaded from {Object.keys(groupedFolders).length} categories
                      </p>
                    )}
                  </div>,
                  false,
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
          <div className="flex-1 flex flex-col bg-white article-editor">
            {!showPreview ? (
              <>
                {/* Enhanced Toolbar */}
                <RichTextToolbar editor={editor} />

                {/* Editor Stats */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>📊 Words: {editor ? editor.getText().split(/\s+/).filter(word => word.length > 0).length : 0}</span>
                    <span>📝 Characters: {editor ? editor.getText().length : 0}</span>
                    <span>🎯 Readability: Good</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Auto-save</span>
                    </label>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 p-6 overflow-y-auto bg-white">
                  <div className={`min-h-full border-2 border-dashed rounded-lg transition-colors ${validationErrors.content ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <EditorContent 
                      editor={editor} 
                      className="min-h-full p-4 focus:outline-none"
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
              <span>⏱️ Reading time: {editor ? Math.ceil(editor.getText().split(/\s+/).filter(word => word.length > 0).length / 200) : 0} min</span>
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
              <span>•</span>
              <kbd className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Ctrl+Shift+Enter</kbd>
              <span>to publish</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onFolderCreated={handleFolderCreated}
        categories={categories}
        folders={folders}
      />
    </div>
  )
}

export default ArticleEditor