import React, { useState } from 'react'
import { X, Upload, AlertCircle, CheckCircle, FileImage, Trash2 } from 'lucide-react'

const BugReportForm = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    user_name: ''
  })
  
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const severityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600', description: 'Minor issue, doesn\'t affect functionality' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600', description: 'Moderate issue, some functionality affected' },
    { value: 'high', label: 'High', color: 'text-orange-600', description: 'Significant issue, major functionality affected' },
    { value: 'critical', label: 'Critical', color: 'text-red-600', description: 'Severe issue, system unusable or data loss' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    
    // Validate file count
    if (attachments.length + files.length > 3) {
      setErrors(prev => ({ ...prev, files: 'Maximum 3 files allowed' }))
      return
    }

    // Validate file types and size
    const validFiles = []
    for (const file of files) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, files: 'Only image files are allowed' }))
        continue
      }
      
      // Check file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, files: 'Files must be smaller than 5MB' }))
        continue
      }

      // Create preview URL
      const fileWithPreview = {
        file,
        preview: URL.createObjectURL(file),
        id: Date.now() + Math.random()
      }
      validFiles.push(fileWithPreview)
    }

    setAttachments(prev => [...prev, ...validFiles])
    // Clear file errors if we have valid files
    if (validFiles.length > 0) {
      setErrors(prev => ({ ...prev, files: '' }))
    }
    
    // Reset file input
    e.target.value = ''
  }

  const removeAttachment = (id) => {
    setAttachments(prev => {
      const updated = prev.filter(att => att.id !== id)
      // Revoke object URL to prevent memory leaks
      const removed = prev.find(att => att.id === id)
      if (removed) {
        URL.revokeObjectURL(removed.preview)
      }
      return updated
    })
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    }
    
    if (!formData.severity) {
      newErrors.severity = 'Severity is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})
    setSuccessMessage('')

    try {
      const submitData = new FormData()
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key])
        }
      })

      // Add file attachments
      attachments.forEach(attachment => {
        submitData.append('attachments', attachment.file)
      })

      const result = await onSubmit(submitData)
      
      if (result.success) {
        setSuccessMessage(`Bug report submitted successfully! Ticket number: ${result.data.ticket_number}`)
        // Reset form after successful submission
        setTimeout(() => {
          handleReset()
          onClose()
        }, 3000)
      } else {
        setErrors({ submit: result.error || 'Failed to submit bug report' })
      }
    } catch (error) {
      console.error('Bug submission error:', error)
      setErrors({ submit: 'Failed to submit bug report. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      user_name: ''
    })
    
    // Clean up attachment previews
    attachments.forEach(att => {
      URL.revokeObjectURL(att.preview)
    })
    setAttachments([])
    setErrors({})
    setSuccessMessage('')
    setLoading(false)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Report a Bug</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-2">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
              <p className="text-green-800 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Bug Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Brief description of the bug"
              disabled={loading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Please describe the bug in detail. Include steps to reproduce, expected behavior, and actual behavior."
              disabled={loading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Severity */}
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
              Severity *
            </label>
            <select
              id="severity"
              name="severity"
              value={formData.severity}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.severity ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            {errors.severity && (
              <p className="mt-1 text-sm text-red-600">{errors.severity}</p>
            )}
          </div>

          {/* User Name (Optional) */}
          <div>
            <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              id="user_name"
              name="user_name"
              value={formData.user_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your name for follow-up communication"
              disabled={loading}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Screenshots (Optional)
            </label>
            <div className="space-y-3">
              {/* Upload Button */}
              <div className="flex items-center justify-center w-full">
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${
                  loading ? 'cursor-not-allowed opacity-50' : ''
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-6 h-6 mb-2 text-gray-400" />
                    <p className="text-xs text-gray-500">
                      {attachments.length < 3 ? 'Click to upload images' : 'Maximum 3 files reached'}
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={loading || attachments.length >= 3}
                  />
                </label>
              </div>

              {/* File Errors */}
              {errors.files && (
                <p className="text-sm text-red-600">{errors.files}</p>
              )}

              {/* File Previews */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="relative border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={attachment.preview}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Bug Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BugReportForm 