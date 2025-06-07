import React from 'react'
import { Link } from 'react-router-dom'

function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg p-8">
          {/* Header */}
          <div className="border-b border-gray-200 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="mt-2 text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content */}
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-6">
              By accessing and using our knowledge base service, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Use License</h2>
            <p className="text-gray-700 mb-6">
              Permission is granted to temporarily access the materials on our knowledge base for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <p className="text-gray-700 mb-6">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Privacy</h2>
            <p className="text-gray-700 mb-6">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Content</h2>
            <p className="text-gray-700 mb-6">
              All content provided through our knowledge base is for informational purposes only. We make no representations about the accuracy or completeness of the content.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-700 mb-6">
              In no event shall our company be liable for any special, incidental, indirect, or consequential damages whatsoever arising out of or in connection with your use of our service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Changes to Terms</h2>
            <p className="text-gray-700 mb-6">
              We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through our service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
            <p className="text-gray-700 mb-6">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@example.com" className="text-blue-600 hover:text-blue-500">
                legal@example.com
              </a>
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <div className="flex items-center justify-between">
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                ← Back to registration
              </Link>
              <Link
                to="/privacy"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Privacy Policy →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Terms 