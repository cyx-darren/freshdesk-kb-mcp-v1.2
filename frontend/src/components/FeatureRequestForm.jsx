import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Lightbulb, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Trash2, 
  HelpCircle,
  ChevronRight,
  Save
} from 'lucide-react'
import FormModal from './shared/FormModal.jsx'
import RichTextEditor from './shared/RichTextEditor.jsx'

const FeatureRequestForm = ({ isOpen, onClose, onSubmit }) => {
  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    description_text: '',
    use_case: '',
    use_case_text: '',
    priority: 'nice_to_have',
    category: '',
    user_name: ''
  })
  
  // UI state
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [attachments, setAttachments] = useState([])
  const [isDraftSaved, setIsDraftSaved] = useState(false)

  // Form configuration
  const totalSteps = 3
  const DRAFT_KEY = 'feature_request_draft'

  const priorityOptions = [
    { 
      value: 'must_have', 
      label: 'Must Have', 
      description: 'Essential feature needed for core functionality',
      color: 'text-red-600'
    },
    { 
      value: 'nice_to_have', 
      label: 'Nice to Have', 
      description: 'Would improve user experience significantly',
      color: 'text-blue-600'
    },
    { 
      value: 'future', 
      label: 'Future Enhancement', 
      description: 'Interesting idea for future consideration',
      color: 'text-gray-600'
    }
  ]

  const categoryOptions = [
    { value: 'ui_ux', label: 'UI/UX Design', description: 'Interface improvements and user experience' },
    { value: 'functionality', label: 'New Functionality', description: 'New features and capabilities' },
    { value: 'integration', label: 'Integration', description: 'Third-party service connections' },
    { value: 'performance', label: 'Performance', description: 'Speed and efficiency improvements' },
    { value: 'mobile', label: 'Mobile', description: 'Mobile app or responsive design features' },
    { value: 'reporting', label: 'Reporting', description: 'Analytics and reporting features' },
    { value: 'other', label: 'Other', description: 'Features not covered by other categories' }
  ]

  const stepTitles = [
    'Basic Information',
    'Detailed Description',
    'Additional Details'
  ]

  // Load draft from localStorage on component mount
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft)
          setFormData(parsedDraft)
          setIsDraftSaved(true)
        } catch (error) {
          console.error('Error loading draft:', error)
        }
      }
    }
  }, [isOpen])

  // Auto-save draft to localStorage
  useEffect(() => {
    if (isOpen && formData.title) {
      const timer = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
        setIsDraftSaved(true)
        setTimeout(() => setIsDraftSaved(false), 2000)
      }, 2000) // Save after 2 seconds of inactivity

      return () => clearTimeout(timer)
    }
  }, [formData, isOpen])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleRichTextChange = (field) => (html, text) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: html,
      [`${field}_text`]: text
    }))
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(file.type)
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      return isValidType && isValidSize
    })

    if (validFiles.length !== files.length) {
      setErrors(prev => ({ 
        ...prev, 
        attachments: 'Some files were skipped. Only images and PDFs under 10MB are allowed.'
      }))
    }

    const newAttachments = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name
    }))

    setAttachments(prev => [...prev, ...newAttachments].slice(0, 5)) // Max 5 files
  }

  const removeAttachment = (index) => {
    setAttachments(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Revoke object URL to prevent memory leaks
      if (prev[index].preview) {
        URL.revokeObjectURL(prev[index].preview)
      }
      return updated
    })
  }

  const validateCurrentStep = () => {
    const newErrors = {}
    
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required'
      } else if (formData.title.trim().length < 5) {
        newErrors.title = 'Title must be at least 5 characters'
      }
      
      if (!formData.description_text.trim()) {
        newErrors.description = 'Description is required'
      } else if (formData.description_text.trim().length < 20) {
        newErrors.description = 'Description must be at least 20 characters'
      }
    }

    if (currentStep === 2) {
      if (!formData.use_case_text.trim()) {
        newErrors.use_case = 'Use case is required'
      } else if (formData.use_case_text.trim().length < 10) {
        newErrors.use_case = 'Use case must be at least 10 characters'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateCurrentStep()) {
      return
    }

    setLoading(true)
    setErrors({})
    setSuccessMessage('')

    try {
      const formDataToSubmit = new FormData()
      
      // Add text fields
      formDataToSubmit.append('title', formData.title.trim())
      formDataToSubmit.append('description', formData.description_text.trim())
      formDataToSubmit.append('use_case', formData.use_case_text.trim())
      formDataToSubmit.append('priority', formData.priority)
      if (formData.category) {
        formDataToSubmit.append('category', formData.category)
      }
      if (formData.user_name?.trim()) {
        formDataToSubmit.append('user_name', formData.user_name.trim())
      }

      // Add attachments
      attachments.forEach(attachment => {
        formDataToSubmit.append('attachments', attachment.file)
      })

      // Call the onSubmit prop if provided, otherwise use the API directly
      let result
      if (onSubmit) {
        result = await onSubmit(formDataToSubmit)
      } else {
        // Fallback to direct API call
        const response = await fetch('/api/features', {
          method: 'POST',
          body: formDataToSubmit,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to submit feature request')
        }

        result = await response.json()
      }

      setSuccessMessage(`Feature request submitted successfully! Ticket number: ${result.data?.ticket_number || 'Assigned'}`)
      
      // Clear draft from localStorage
      localStorage.removeItem(DRAFT_KEY)
      
      // Reset form after successful submission
      setTimeout(() => {
        handleReset()
        onClose()
      }, 3000)
      
    } catch (error) {
      console.error('Feature request submission error:', error)
      setErrors({ submit: error.message || 'Failed to submit feature request. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      description_text: '',
      use_case: '',
      use_case_text: '',
      priority: 'nice_to_have',
      category: '',
      user_name: ''
    })
    setAttachments([])
    setCurrentStep(1)
    setErrors({})
    setSuccessMessage('')
    setLoading(false)
    setIsDraftSaved(false)
    localStorage.removeItem(DRAFT_KEY)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const getStepProgress = () => (currentStep / totalSteps) * 100

  const Tooltip = ({ children, text }) => (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {text}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </div>
    </div>
  )

  const StepIndicator = () => (
    <div className="mb-8">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2 rounded-full mb-4">
        <motion.div 
          className="bg-blue-600 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${getStepProgress()}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Steps */}
      <div className="flex justify-between">
        {stepTitles.map((title, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          
          return (
            <div key={stepNumber} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                isCompleted 
                  ? 'bg-green-100 text-green-600' 
                  : isActive 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {isCompleted ? <CheckCircle size={16} /> : stepNumber}
              </div>
              <span className={`text-xs text-center ${
                isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}>
                {title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Feature Title *
                </label>
                <Tooltip text="A clear, concise title that summarizes your feature request">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description of the requested feature"
                disabled={loading}
                maxLength={100}
              />
              <div className="flex justify-between mt-1">
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title}</p>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {formData.title.length}/100
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Feature Description *
                </label>
                <Tooltip text="Describe what the feature should do and how it would work">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <RichTextEditor
                content={formData.description}
                onChange={handleRichTextChange('description')}
                placeholder="Describe the feature in detail. What problem does it solve? How should it work?"
                maxLength={2000}
                minLength={20}
                error={!!errors.description}
                disabled={loading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Use Case */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Use Case *
                </label>
                <Tooltip text="Explain specific scenarios where this feature would be useful">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <RichTextEditor
                content={formData.use_case}
                onChange={handleRichTextChange('use_case')}
                placeholder="Describe specific situations where this feature would be useful. Include examples of how you or others would use it."
                maxLength={1500}
                minLength={10}
                error={!!errors.use_case}
                disabled={loading}
              />
              {errors.use_case && (
                <p className="mt-1 text-sm text-red-600">{errors.use_case}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Priority *
                </label>
                <Tooltip text="How important is this feature for your workflow?">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <div className="space-y-3">
                {priorityOptions.map(option => (
                  <label
                    key={option.value}
                    className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.priority === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={option.value}
                      checked={formData.priority === option.value}
                      onChange={handleInputChange}
                      className="mt-1"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${option.color}`}>
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Category */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <Tooltip text="What type of feature is this?">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Select a category (optional)</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* User Name */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="user_name" className="block text-sm font-medium text-gray-700">
                  Your Name
                </label>
                <Tooltip text="Optional: Help us personalize follow-up communications">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <input
                type="text"
                id="user_name"
                name="user_name"
                value={formData.user_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name for follow-up communication"
                disabled={loading}
                maxLength={100}
              />
            </div>

            {/* File Attachments */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mockups & Files
                </label>
                <Tooltip text="Upload images, mockups, or PDFs to illustrate your feature idea">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={loading || attachments.length >= 5}
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer ${loading || attachments.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {attachments.length >= 5 
                      ? 'Maximum 5 files allowed'
                      : 'Click to upload files or drag and drop'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Images and PDFs up to 10MB each
                  </p>
                </label>
              </div>

              {errors.attachments && (
                <p className="mt-1 text-sm text-red-600">{errors.attachments}</p>
              )}

              {/* Attachment Previews */}
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {attachment.preview && (
                          <img
                            src={attachment.preview}
                            alt={attachment.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Request a Feature"
      icon={<Lightbulb className="text-yellow-500" size={24} />}
      loading={loading}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Auto-save indicator */}
        {isDraftSaved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center gap-2 text-sm text-green-600"
          >
            <Save size={14} />
            Draft saved automatically
          </motion.div>
        )}

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2"
          >
            <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm">{successMessage}</p>
          </motion.div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2"
          >
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm">{errors.submit}</p>
          </motion.div>
        )}

        {/* Step Indicator */}
        <StepIndicator />

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {currentStep > 1 && (
              <motion.button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Previous
              </motion.button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>

            {currentStep < totalSteps ? (
              <motion.button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Next
                <ChevronRight size={16} />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Submitting...' : 'Submit Feature Request'}
              </motion.button>
            )}
          </div>
        </div>
      </form>
    </FormModal>
  )
}

export default FeatureRequestForm