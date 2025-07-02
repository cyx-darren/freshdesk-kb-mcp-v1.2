import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

function Article() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await getArticle(id)
        // setArticle(response.data)
        
        // Mock article for now
        setTimeout(() => {
          setArticle({
            id: id,
            title: 'Getting Started with Freshdesk',
            content: `
              <h2>Welcome to Freshdesk</h2>
              <p>This comprehensive guide will help you get started with Freshdesk and make the most of its features.</p>
              
              <h3>Setting Up Your Account</h3>
              <p>Follow these steps to configure your Freshdesk account:</p>
              <ul>
                <li>Log in to your admin panel</li>
                <li>Configure your company settings</li>
                <li>Set up your email channels</li>
                <li>Customize your portal</li>
              </ul>
              
              <h3>Managing Tickets</h3>
              <p>Learn how to efficiently handle customer support tickets and maintain high customer satisfaction.</p>
            `,
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-16T14:30:00Z'
          })
          setLoading(false)
        }, 800)
      } catch (err) {
        setError('Failed to load article. Please try again.')
        setLoading(false)
      }
    }

    fetchArticle()
  }, [id])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading article...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Article not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <article className="card p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>
          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <span>Created: {new Date(article.created_at).toLocaleDateString()}</span>
            <span>Updated: {new Date(article.updated_at).toLocaleDateString()}</span>
          </div>
        </header>
        
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>
    </div>
  )
}

export default Article 