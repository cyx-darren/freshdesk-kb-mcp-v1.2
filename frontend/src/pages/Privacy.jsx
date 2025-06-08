import React from 'react'
import { Link } from 'react-router-dom'

function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg p-8">
          {/* Header */}
          <div className="border-b border-gray-200 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="mt-2 text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content */}
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 mb-6">
              We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include your name, email address, and any other information you choose to provide.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the information we collect to:</p>
            <ul className="text-gray-700 mb-6 list-disc list-inside space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Communicate with you about products, services, and events</li>
              <li>Monitor and analyze trends and usage</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Information Sharing</h2>
            <p className="text-gray-700 mb-6">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with trusted service providers who assist us in operating our website and conducting our business.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
            <p className="text-gray-700 mb-6">
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-6">
              We use cookies and similar tracking technologies to enhance your experience on our website. You can choose to disable cookies through your browser settings, but this may limit your ability to use certain features.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-6">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="text-gray-700 mb-6 list-disc list-inside space-y-2">
              <li>Access and update your personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your personal information</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-700 mb-6">
              We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Contact Us</h2>
            <p className="text-gray-700 mb-6">
              If you have any questions about this privacy policy, please contact us at{' '}
              <a href="mailto:privacy@example.com" className="text-blue-600 hover:text-blue-500">
                privacy@example.com
              </a>
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <div className="flex items-center justify-between">
              <Link
                to="/terms"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                ← Terms of Service
              </Link>
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Back to registration →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Privacy 