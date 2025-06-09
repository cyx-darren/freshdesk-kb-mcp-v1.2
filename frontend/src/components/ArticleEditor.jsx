import React, { useState, useEffect, useCallback } from 'react'
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
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  
  // Form state
  const [title, setTitle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [tags, setTags] = useState('')
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)

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

  // Load categories on mount
  useEffect(() => {
    if (isOpen) {
      loadCategories()
      
      // Initialize with draft data if provided
      if (initialDraft) {
        setTitle(initialDraft.title || '')
        setSelectedCategory(initialDraft.category || '')
        setSelectedSubcategory(initialDraft.subcategory || '')
        setTags(initialDraft.tags || '')
        setCurrentDraftId(initialDraft.id)
        setLastSaved(new Date(initialDraft.updated_at))
        
        if (editor && initialDraft.content) {
          editor.commands.setContent(initialDraft.content)
        }
      }
    }
  }, [isOpen, initialDraft, editor])

  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadSubcategories(selectedCategory)
    } else {
      setSubcategories([])
      setSelectedSubcategory('')
    }
  }, [selectedCategory])

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

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isPublishing && !isSaving) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isPublishing, isSaving, handleClose])

  const loadCategories = async () => {
    try {
      const response = await chatService.getCategories()
      setCategories(response.categories || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadSubcategories = async (categoryId) => {
    try {
      // This would be an API call to get subcategories
      // For now, using mock data
      const mockSubcategories = [
        { id: 'general', name: 'General' },
        { id: 'setup', name: 'Setup & Installation' },
        { id: 'troubleshooting', name: 'Troubleshooting' },
        { id: 'advanced', name: 'Advanced Topics' }
      ]
      setSubcategories(mockSubcategories)
    } catch (error) {
      console.error('Failed to load subcategories:', error)
    }
  }

  const handleSaveDraft = async (silent = false) => {
    if (!user || !editor) return
    
    if (!silent) setIsSaving(true)
    
    try {
      const draftData = {
        title: title || 'Untitled Article',
        content: editor.getHTML(),
        original_question: originalQuestion,
        ai_response: aiResponse,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        tags: tags,
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
  }

  const handlePublish = async () => {
    if (!editor || !title.trim() || !selectedCategory) {
      alert('Please fill in the title and select a category before publishing.')
      return
    }

    setIsPublishing(true)
    
    try {
      // First save as draft
      await handleSaveDraft(true)
      
      // Then publish to Freshdesk via MCP
      const articleData = {
        title: title.trim(),
        description: editor.getHTML(),
        category_id: selectedCategory,
        subcategory_id: selectedSubcategory || null,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        type: 1, // Solution article
        status: 2 // Published
      }

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
        
        alert('Article published successfully!')
        onClose()
      } else {
        throw new Error(response.message || 'Failed to publish article')
      }
    } catch (error) {
      console.error('Failed to publish article:', error)
      alert('Failed to publish article. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleClose = useCallback(() => {
    if (isDirty) {
      const shouldSave = confirm('You have unsaved changes. Save as draft before closing?')
      if (shouldSave) {
        handleSaveDraft(true)
      }
    }
    onClose()
  }, [isDirty, onClose])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Article Editor</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Knowledge Base Article</span>
                {lastSaved && (
                  <>
                    <span>•</span>
                    <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                  </>
                )}
                {isSaving && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">Saving...</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
          {/* Left panel - Context */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Context</h3>
            
            {originalQuestion && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Original Question</h4>
                <div className="p-3 bg-white rounded-lg border text-sm text-gray-700">
                  {originalQuestion}
                </div>
              </div>
            )}
            
            {aiResponse && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">AI Response</h4>
                <div className="p-3 bg-white rounded-lg border text-sm text-gray-700 max-h-40 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: aiResponse }} />
                </div>
              </div>
            )}

            {/* Article Metadata */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setIsDirty(true)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter article title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value)
                      setIsDirty(true)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category...</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory
                  </label>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => {
                      setSelectedSubcategory(e.target.value)
                      setIsDirty(true)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!selectedCategory}
                  >
                    <option value="">Select subcategory...</option>
                    {subcategories.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => {
                    setTags(e.target.value)
                    setIsDirty(true)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tag1, tag2, tag3..."
                />
                <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
              </div>
            </div>
          </div>

          {/* Right panel - Editor/Preview */}
          <div className="flex-1 flex flex-col">
            {!showPreview ? (
              <>
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <button
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      className={`px-3 py-1 text-sm rounded ${editor?.isActive('bold') ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'} border`}
                    >
                      Bold
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      className={`px-3 py-1 text-sm rounded ${editor?.isActive('italic') ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'} border`}
                    >
                      Italic
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleHighlight().run()}
                      className={`px-3 py-1 text-sm rounded ${editor?.isActive('highlight') ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'} border`}
                    >
                      Highlight
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300"></div>
                    
                    <button
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                      className={`px-3 py-1 text-sm rounded ${editor?.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'} border`}
                    >
                      H1
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                      className={`px-3 py-1 text-sm rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'} border`}
                    >
                      H2
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      className={`px-3 py-1 text-sm rounded ${editor?.isActive('bulletList') ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'} border`}
                    >
                      List
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300"></div>
                    
                    <button
                      onClick={insertLink}
                      className="px-3 py-1 text-sm rounded bg-white text-gray-700 hover:bg-gray-100 border"
                    >
                      Link
                    </button>
                    <button
                      onClick={insertImage}
                      className="px-3 py-1 text-sm rounded bg-white text-gray-700 hover:bg-gray-100 border"
                    >
                      Image
                    </button>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <EditorContent 
                    editor={editor} 
                    className="prose prose-gray max-w-none min-h-full focus:outline-none"
                  />
                </div>
              </>
            ) : (
              /* Preview Mode */
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-gray max-w-none">
                  <h1 className="text-3xl font-bold text-gray-900 mb-6">
                    {title || 'Untitled Article'}
                  </h1>
                  <div 
                    className="text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: editor?.getHTML() || '<p>No content</p>' 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {isDirty && <span className="text-orange-600">• Unsaved changes</span>}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleSaveDraft(false)}
                disabled={isSaving || isPublishing}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <LoadingDots size="sm" className="mr-2" />
                    Saving...
                  </span>
                ) : (
                  'Save Draft'
                )}
              </button>
              
              <button
                onClick={handlePublish}
                disabled={!title.trim() || !selectedCategory || isPublishing || isSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPublishing ? (
                  <span className="flex items-center">
                    <LoadingDots size="sm" className="mr-2" />
                    Publishing...
                  </span>
                ) : (
                  'Publish Article'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArticleEditor