import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Bug, 
  Lightbulb, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Users,
  BarChart3,
  Download,
  AlertCircle
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { getAllBugReports, getBugAnalytics } from '../services/bugService'
import { getAllFeatureRequests, getFeatureAnalytics } from '../services/featureService'
import AdminNavigation from '../components/AdminNavigation.jsx'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState({
    bugs: null,
    features: null
  })
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load analytics data in parallel
      const [bugAnalytics, featureAnalytics] = await Promise.all([
        getBugAnalytics(),
        getFeatureAnalytics()
      ])

      setAnalytics({
        bugs: bugAnalytics.data,
        features: featureAnalytics.data
      })
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Prepare chart data for submissions over time
  const prepareSubmissionData = () => {
    if (!analytics.bugs?.submissionsByDate || !analytics.features?.submissionsByDate) {
      return []
    }

    const allDates = new Set([
      ...Object.keys(analytics.bugs.submissionsByDate),
      ...Object.keys(analytics.features.submissionsByDate)
    ])

    return Array.from(allDates)
      .sort()
      .slice(-30) // Last 30 days
      .map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bugs: analytics.bugs.submissionsByDate[date] || 0,
        features: analytics.features.submissionsByDate[date] || 0
      }))
  }

  // Prepare pie chart data for bug severity
  const prepareSeverityData = () => {
    if (!analytics.bugs?.severityDistribution) return []

    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e'
    }

    return Object.entries(analytics.bugs.severityDistribution).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: colors[severity] || '#6b7280'
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const submissionData = prepareSubmissionData()
  const severityData = prepareSeverityData()

  const bugSummary = analytics.bugs?.summary || {}
  const featureSummary = analytics.features?.summary || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Admin Navigation */}
      <AdminNavigation
        title="Admin Dashboard"
        subtitle="Overview of bug reports and feature requests"
        logoIcon={BarChart3}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            onClick={() => navigate('/admin/bugs')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bug className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Bug Reports
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {bugSummary.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/features')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Lightbulb className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Feature Requests
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {featureSummary.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/bugs?status=new,in_progress')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Items
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {(bugSummary.pending || 0) + (featureSummary.pending || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/bugs?status=resolved')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Resolved This Week
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {(bugSummary.resolved || 0) + (featureSummary.released || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Submissions Over Time */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Submissions Over Time (Last 30 Days)
              </h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={submissionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="bugs" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Bug Reports"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="features" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Feature Requests"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bug Severity Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Bug Severity Distribution
              </h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bug Reports */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Bug Reports</h3>
              <button
                onClick={() => navigate('/admin/bugs')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {analytics.bugs?.recentReports?.slice(0, 5).map(bug => (
                <div key={bug.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Bug className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {bug.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {bug.severity} • {bug.reporter_email} • {bug.formattedCreatedAt}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    bug.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    bug.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    bug.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {bug.status}
                  </span>
                </div>
              ))}
              {(!analytics.bugs?.recentReports || analytics.bugs.recentReports.length === 0) && (
                <p className="text-gray-500 text-center py-4">No recent bug reports</p>
              )}
            </div>
          </div>

          {/* Recent Feature Requests */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Feature Requests</h3>
              <button
                onClick={() => navigate('/admin/features')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {analytics.features?.recentRequests?.slice(0, 5).map(feature => (
                <div key={feature.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {feature.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {feature.priority} • {feature.user_email} • {new Date(feature.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    feature.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                    feature.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                    feature.status === 'approved' ? 'bg-green-100 text-green-800' :
                    feature.status === 'in_development' ? 'bg-purple-100 text-purple-800' :
                    feature.status === 'released' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {feature.status}
                  </span>
                </div>
              ))}
              {(!analytics.features?.recentRequests || analytics.features.recentRequests.length === 0) && (
                <p className="text-gray-500 text-center py-4">No recent feature requests</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard 