import React, { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useSupabase } from '../contexts/SupabaseContext'

const ArticleEditorWorking = ({ 
  isOpen, 
  onClose, 
  originalQuestion = '', 
  aiResponse = '', 
  initialDraft = null 
}) => {
  const { user, supabase } = useSupabase()
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('')
  const [tags, setTags] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')

  // Simple rich text editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: aiResponse || '<p>Start writing your article here...</p>',
  })

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
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
  }, [isOpen, onClose])

  const handleSaveDraft = async () => {
    if (!user || !editor) {
      alert('Please log in and wait for editor to load')
      return
    }
    
    setIsSaving(true)
    
    try {
      const draftData = {
        title: title || 'Untitled Article',
        content: editor.getHTML(),
        original_question: originalQuestion,
        ai_response: aiResponse,
        category: folder,
        tags: tags,
        user_id: user.id,
        status: 'draft'
      }

      const { data, error } = await supabase
        .from('article_drafts')
        .insert([draftData])
        .select()
        .single()

      if (error) throw error

      alert('Draft saved successfully!')
    } catch (error) {
      console.error('Failed to save draft:', error)
      alert('Failed to save draft: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!editor || !title.trim()) {
      alert('Please enter a title')
      return
    }

    setIsPublishing(true)
    
    try {
      // For now, just save as draft since we're testing
      await handleSaveDraft()
      alert('Article would be published to Freshdesk (demo mode)')
    } catch (error) {
      console.error('Failed to publish article:', error)
      alert('Failed to publish article: ' + error.message)
    } finally {
      setIsPublishing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">New Article</h2>
              <p className="text-sm text-gray-500">Knowledge base • New article</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => alert('Save functionality coming soon!')}
              className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Save
            </button>
            <button
              onClick={() => alert('Publish functionality coming soon!')}
              disabled={!title.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Publish
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left panel - Context (optional) */}
          {(originalQuestion || aiResponse) && (
            <div className="w-1/4 border-r border-gray-200 p-6 overflow-y-auto bg-gray-50">
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
                  <h4 className="text-sm font-medium text-gray-700 mb-2">AI Response Preview</h4>
                  <div className="p-3 bg-white rounded-lg border text-sm text-gray-700 max-h-32 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: aiResponse }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Editor Area */}
          <div className={`${originalQuestion || aiResponse ? 'flex-1' : 'w-3/4'} flex flex-col`}>
            {/* Article Title */}
            <div className="p-6 border-b border-gray-200">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-2xl font-medium border-0 border-b-2 border-transparent focus:border-blue-500 focus:outline-none bg-transparent"
                placeholder="Title"
              />
            </div>

            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-2 rounded ${
                    editor?.isActive('bold') 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                  title="Bold"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 4v12h4.5c2.485 0 4.5-2.015 4.5-4.5S12.985 7 10.5 7H9v2h1.5c1.38 0 2.5 1.12 2.5 2.5S10.88 14 9.5 14H8V4h3.5C13.433 4 15 5.567 15 7.5c0 .677-.195 1.31-.53 1.846C15.414 9.85 16 10.642 16 11.5c0 1.933-1.567 3.5-3.5 3.5H6z"/>
                  </svg>
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded ${
                    editor?.isActive('italic') 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                  title="Italic"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.5 4h3l-1.5 8h3l-.5 2h-3l1.5-8h-3L8.5 4z"/>
                  </svg>
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleUnderline?.().run()}
                  className={`p-2 rounded ${
                    editor?.isActive('underline') 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                  title="Underline"
                >
                  <span className="underline font-medium">U</span>
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded ${
                    editor?.isActive('bulletList') 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                  title="Bullet List"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 6a2 2 0 110-4 2 2 0 010 4zM4 12a2 2 0 110-4 2 2 0 010 4zM4 18a2 2 0 110-4 2 2 0 010 4zM8 5h10v2H8V5zM8 11h10v2H8v-2zM8 17h10v2H8v-2z"/>
                  </svg>
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded ${
                    editor?.isActive('orderedList') 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                  title="Numbered List"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4h1v1H3V4zM3 7h1v1H3V7zM3 10h1v1H3v-1zM6 4h12v2H6V4zM6 9h12v2H6V9zM6 14h12v2H6v-2z"/>
                  </svg>
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`px-3 py-1 text-sm rounded ${
                    editor?.isActive('heading', { level: 2 }) 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`px-3 py-1 text-sm rounded ${
                    editor?.isActive('heading', { level: 3 }) 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                  title="Heading 3"
                >
                  H3
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 p-6 overflow-y-auto">
              <EditorContent 
                editor={editor} 
                className="prose prose-gray max-w-none min-h-full focus:outline-none"
              />
              {!editor?.getText() && (
                <p className="text-gray-500 text-sm mt-2">Type something...</p>
              )}
            </div>
          </div>

          {/* Right Sidebar - Article Properties */}
          <div className="w-80 border-l border-gray-200 overflow-y-auto bg-gray-50">
            {/* Article Properties */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Article Properties
              </h3>
              
              {/* Folder */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder <span className="text-red-500">*</span>
                </label>
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select folder</option>
                  <option value="general">General</option>
                  <option value="products">Products</option>
                  <option value="support">Support</option>
                  <option value="billing">Billing</option>
                  <option value="shipping">Shipping & Returns</option>
                  <option value="installation">Installation & Setup</option>
                  <option value="troubleshooting">Troubleshooting</option>
                  <option value="faq">FAQ</option>
                </select>
                <div className="flex items-center mt-2">
                  <button className="text-blue-600 text-sm hover:text-blue-800 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create new
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Add Tags"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
              </div>
            </div>

            {/* Search Engine Optimisation */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Search Engine Optimisation
              </h3>
              
              {/* SEO Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title for search engine
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Type article title for SEO"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {seoTitle.length}/60 characters
                </p>
              </div>

              {/* SEO Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description for search engine
                </label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  placeholder="Type article description for SEO"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {seoDescription.length}/160 characters
                </p>
              </div>
            </div>

            {/* Templates (placeholder) */}
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Templates (3)
              </h3>
              
              <div className="space-y-2">
                <div className="p-3 bg-white rounded border hover:shadow-sm cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">[Sample] User Guide template</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                <div className="p-3 bg-white rounded border hover:shadow-sm cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">[Sample] 'How to' template</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                <div className="p-3 bg-white rounded border hover:shadow-sm cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">[Sample] FAQ template</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArticleEditorWorking 