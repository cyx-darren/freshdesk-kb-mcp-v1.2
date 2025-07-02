import React, { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useSupabase } from '../contexts/SupabaseContext'

const ArticleEditorSafe = ({ 
  isOpen, 
  onClose, 
  originalQuestion = '', 
  aiResponse = '', 
  initialDraft = null 
}) => {
  const { user, supabase } = useSupabase()
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState('')

  // Rich text editor with minimal config
  const editor = useEditor({
    extensions: [StarterKit],
    content: aiResponse || '<p>Start writing your article here...</p>',
    editable: true,
  })

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Article Editor (Safe Mode)</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter article title..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <div className="border border-gray-300 rounded-lg p-4">
              <EditorContent 
                editor={editor} 
                className="prose max-w-none min-h-96"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArticleEditorSafe 