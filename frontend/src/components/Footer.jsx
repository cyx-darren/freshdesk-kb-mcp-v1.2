import React, { useState } from 'react'
import { MessageSquare, Bug } from 'lucide-react'
import BugReportForm from './BugReportForm.jsx'
import FeatureRequestForm from './FeatureRequestForm.jsx'
import { submitBugReport } from '../services/bugService.js'
import { submitFeatureRequest } from '../services/featureService.js'

function Footer() {
  const [isBugModalOpen, setIsBugModalOpen] = useState(false)
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false)

  const handleRequestFeature = () => {
    console.log('Request a Feature clicked')
    setIsFeatureModalOpen(true)
  }

  const handleReportBug = () => {
    console.log('Report a Bug clicked')
    setIsBugModalOpen(true)
  }

  const handleBugSubmit = async (formData) => {
    try {
      const result = await submitBugReport(formData)
      return result
    } catch (error) {
      console.error('Bug submission error:', error)
      return {
        success: false,
        error: 'Failed to submit bug report. Please try again.'
      }
    }
  }

  const handleFeatureSubmit = async (formData) => {
    try {
      const result = await submitFeatureRequest(formData)
      return result
    } catch (error) {
      console.error('Feature request submission error:', error)
      throw error // Let the form component handle the error
    }
  }

  const closeBugModal = () => {
    setIsBugModalOpen(false)
  }

  const closeFeatureModal = () => {
    setIsFeatureModalOpen(false)
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200 z-40" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex justify-center items-center space-x-4 sm:space-x-8">
          {/* Request Feature Link */}
          <button
            onClick={handleRequestFeature}
            className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200 hover:scale-105 transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-md px-2 py-1"
          >
            <MessageSquare size={16} className="flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Request a Feature</span>
          </button>

          {/* Separator */}
          <div className="h-4 w-px bg-gray-300"></div>

          {/* Report Bug Link */}
          <button
            onClick={handleReportBug}
            className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-red-600 transition-colors duration-200 hover:scale-105 transform focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-md px-2 py-1"
          >
            <Bug size={16} className="flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Report a Bug</span>
          </button>
        </div>
      </div>
      
      {/* Bug Report Modal */}
      <BugReportForm
        isOpen={isBugModalOpen}
        onClose={closeBugModal}
        onSubmit={handleBugSubmit}
      />
      
      {/* Feature Request Modal */}
      <FeatureRequestForm
        isOpen={isFeatureModalOpen}
        onClose={closeFeatureModal}
        onSubmit={handleFeatureSubmit}
      />
    </footer>
  )
}

export default Footer 