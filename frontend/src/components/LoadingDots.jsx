import React from 'react'

const LoadingDots = ({ size = 'sm', className = '' }) => {
  // Size variants
  const sizeClasses = {
    xs: 'w-1 h-1',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const dotClass = sizeClasses[size] || sizeClasses.sm

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div 
        className={`${dotClass} bg-gray-400 rounded-full animate-bounce`}
        style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
      ></div>
      <div 
        className={`${dotClass} bg-gray-400 rounded-full animate-bounce`}
        style={{ animationDelay: '160ms', animationDuration: '1.4s' }}
      ></div>
      <div 
        className={`${dotClass} bg-gray-400 rounded-full animate-bounce`}
        style={{ animationDelay: '320ms', animationDuration: '1.4s' }}
      ></div>
    </div>
  )
}

// Alternative pulsing dots version
export const PulsingDots = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    xs: 'w-1 h-1',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const dotClass = sizeClasses[size] || sizeClasses.sm

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div 
        className={`${dotClass} bg-blue-500 rounded-full animate-pulse`}
        style={{ animationDelay: '0ms' }}
      ></div>
      <div 
        className={`${dotClass} bg-blue-500 rounded-full animate-pulse`}
        style={{ animationDelay: '200ms' }}
      ></div>
      <div 
        className={`${dotClass} bg-blue-500 rounded-full animate-pulse`}
        style={{ animationDelay: '400ms' }}
      ></div>
    </div>
  )
}

// Typing indicator with message
export const TypingIndicator = ({ message = "Assistant is thinking...", className = '' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <LoadingDots size="sm" />
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  )
}

// Wave loading animation
export const WaveDots = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    xs: 'w-1 h-1',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const dotClass = sizeClasses[size] || sizeClasses.sm

  return (
    <div className={`flex items-end space-x-1 ${className}`}>
      <div 
        className={`${dotClass} bg-blue-500 rounded-full`}
        style={{
          animation: 'wave 1.2s ease-in-out infinite',
          animationDelay: '0s'
        }}
      ></div>
      <div 
        className={`${dotClass} bg-blue-500 rounded-full`}
        style={{
          animation: 'wave 1.2s ease-in-out infinite',
          animationDelay: '0.1s'
        }}
      ></div>
      <div 
        className={`${dotClass} bg-blue-500 rounded-full`}
        style={{
          animation: 'wave 1.2s ease-in-out infinite',
          animationDelay: '0.2s'
        }}
      ></div>
      <div 
        className={`${dotClass} bg-blue-500 rounded-full`}
        style={{
          animation: 'wave 1.2s ease-in-out infinite',
          animationDelay: '0.3s'
        }}
      ></div>

      <style jsx>{`
        @keyframes wave {
          0%, 40%, 100% {
            transform: scaleY(0.4);
          }
          20% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  )
}

// Loading message component for chat
export const ChatLoadingMessage = ({ className = '' }) => {
  return (
    <div className={`flex justify-start ${className}`}>
      <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
        {/* AI Avatar */}
        <div className="flex-shrink-0 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mb-1">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Loading bubble */}
        <div className="bg-white text-gray-800 border border-gray-200 shadow-sm px-4 py-3 rounded-lg rounded-bl-sm">
          <TypingIndicator />
        </div>
      </div>
    </div>
  )
}

export default LoadingDots 