import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import nodemailer from 'nodemailer'
import { fileURLToPath } from 'url'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/feature-attachments')
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const fileExtension = path.extname(file.originalname)
    const fileName = `feature-${uniqueSuffix}${fileExtension}`
    cb(null, fileName)
  }
})

// File filter to allow images and PDFs for mockups
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain'
  ]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only image files and PDFs are allowed for feature mockups'), false)
  }
}

// Configure multer with size limit (10MB per file, max 5 files for mockups)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 files
  }
})

// Email transporter configuration
let emailTransporter = null

// Initialize email transporter if credentials are available
try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    console.log('📧 Email transporter configured')
  } else {
    console.log('⚠️  Email configuration not found, notifications will be skipped')
  }
} catch (error) {
  console.error('❌ Email transporter configuration failed:', error.message)
}

/**
 * Send email notification for new feature request
 * @param {Object} featureRequest - Feature request data
 * @returns {Promise<boolean>} Success status
 */
async function sendFeatureRequestNotification(featureRequest) {
  if (!emailTransporter) {
    console.log('📧 Email not configured, skipping notification')
    return false
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourcompany.com'
    const userEmail = featureRequest.user_email
    
    // Email to admin
    const adminMailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: adminEmail,
      subject: `New Feature Request: ${featureRequest.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Feature Request Submitted</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af;">Ticket: ${featureRequest.ticket_number}</h3>
            <p><strong>Title:</strong> ${featureRequest.title}</p>
            <p><strong>Priority:</strong> ${featureRequest.priority.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Category:</strong> ${featureRequest.category || 'Not specified'}</p>
            <p><strong>Requested by:</strong> ${featureRequest.user_name || featureRequest.user_email}</p>
            <p><strong>Email:</strong> ${featureRequest.user_email}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h4>Description:</h4>
            <div style="background: white; padding: 15px; border-left: 4px solid #2563eb; border-radius: 4px;">
              ${featureRequest.description.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="margin: 20px 0;">
            <h4>Use Case:</h4>
            <div style="background: white; padding: 15px; border-left: 4px solid #059669; border-radius: 4px;">
              ${featureRequest.use_case.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background: #f0f9ff; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Next Steps:</strong> Please review this feature request and update its status in the admin dashboard.
            </p>
          </div>
        </div>
      `
    }

    // Email confirmation to user
    const userMailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: userEmail,
      subject: `Feature Request Received: ${featureRequest.ticket_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Thank You for Your Feature Request!</h2>
          
          <p>Hi ${featureRequest.user_name || 'there'},</p>
          
          <p>We've received your feature request and it has been assigned ticket number <strong>${featureRequest.ticket_number}</strong>.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${featureRequest.title}</h3>
            <p><strong>Priority:</strong> ${featureRequest.priority.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Status:</strong> Submitted</p>
          </div>
          
          <p>Our team will review your suggestion and provide updates as the request progresses through our development pipeline.</p>
          
          <div style="margin: 30px 0; padding: 20px; background: #f0f9ff; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>What's Next?</strong> You'll receive email updates when the status of your feature request changes.
            </p>
          </div>
          
          <p>Thank you for helping us improve our product!</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions, please don't hesitate to reach out to our support team.
          </p>
        </div>
      `
    }

    // Send both emails
    await Promise.all([
      emailTransporter.sendMail(adminMailOptions),
      emailTransporter.sendMail(userMailOptions)
    ])

    console.log(`📧 Feature request notifications sent for ${featureRequest.ticket_number}`)
    return true
  } catch (error) {
    console.error('📧 Failed to send feature request notification:', error.message)
    return false
  }
}

/**
 * Generate a unique ticket number for feature requests
 * @returns {Promise<string>} Ticket number in format FEAT-YYYYMMDD-NNNN
 */
async function generateFeatureTicketNumber() {
  try {
    // Use the database function if available
    const { data, error } = await supabase.rpc('generate_feature_ticket_number')
    
    if (error) {
      console.warn('Database ticket generation failed, using fallback:', error.message)
      // Fallback to JavaScript implementation
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase()
      return `FEAT-${today}-${randomSuffix}`
    }
    
    return data
  } catch (error) {
    console.warn('Ticket generation error, using fallback:', error.message)
    // Fallback implementation
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `FEAT-${today}-${randomSuffix}`
  }
}

/**
 * Submit a new feature request
 * POST /api/features
 */
router.post('/', requireAuth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, description, use_case, priority, category, user_name } = req.body
    const user_email = req.user.email

    // Validation
    if (!title || !description || !use_case || !priority) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, use_case, and priority are required'
      })
    }

    // Validate priority
    const validPriorities = ['must_have', 'nice_to_have', 'future']
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      })
    }

    // Validate category if provided
    const validCategories = ['ui_ux', 'functionality', 'integration', 'performance', 'mobile', 'reporting', 'other']
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      })
    }

    // Generate ticket number
    const ticket_number = await generateFeatureTicketNumber()

    // Insert feature request into database
    const { data: featureRequest, error: featureError } = await supabase
      .from('feature_requests')
      .insert({
        title: title.trim(),
        description: description.trim(),
        use_case: use_case.trim(),
        priority,
        category: category || null,
        user_email,
        user_name: user_name?.trim() || null,
        ticket_number,
        status: 'submitted'
      })
      .select('*')
      .single()

    if (featureError) {
      console.error('Error creating feature request:', featureError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create feature request',
        details: featureError.message
      })
    }

    // Handle file attachments if any
    const attachments = []
    if (req.files && req.files.length > 0) {
      try {
        for (const file of req.files) {
          // Create relative URL for the uploaded file
          const file_url = `/uploads/feature-attachments/${file.filename}`
          
          // Insert attachment record
          const { data: attachment, error: attachmentError } = await supabase
            .from('feature_attachments')
            .insert({
              feature_request_id: featureRequest.id,
              file_url,
              file_name: file.originalname,
              file_size: file.size,
              file_type: file.mimetype
            })
            .select('*')
            .single()

          if (attachmentError) {
            console.error('Error creating attachment record:', attachmentError)
            // Continue with other attachments even if one fails
          } else {
            attachments.push(attachment)
          }
        }
      } catch (attachmentError) {
        console.error('Error processing attachments:', attachmentError)
        // Don't fail the entire request for attachment errors
      }
    }

    // Send email notifications
    try {
      await sendFeatureRequestNotification(featureRequest)
    } catch (emailError) {
      console.error('Email notification failed:', emailError)
      // Don't fail the request if email fails
    }

    console.log(`✅ Feature request created: ${ticket_number} by ${user_email}`)

    res.status(201).json({
      success: true,
      data: {
        ...featureRequest,
        attachments
      },
      message: `Feature request submitted successfully. Ticket number: ${ticket_number}`
    })

  } catch (error) {
    console.error('Feature request submission error:', error)
    
    // Clean up uploaded files if database operation failed
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path)
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError)
        }
      })
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to submit feature request'
    })
  }
})

/**
 * Get user's feature requests
 * GET /api/features
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const user_email = req.user.email
    const { page = 1, limit = 10, status, priority, category } = req.query

    let query = supabase
      .from('feature_requests')
      .select(`
        *,
        feature_attachments (
          id,
          file_url,
          file_name,
          file_size,
          file_type,
          uploaded_at
        )
      `)
      .eq('user_email', user_email)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (category) {
      query = query.eq('category', category)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: featureRequests, error } = await query

    if (error) {
      console.error('Error fetching feature requests:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch feature requests'
      })
    }

    res.json({
      success: true,
      data: featureRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: featureRequests.length
      }
    })

  } catch (error) {
    console.error('Error fetching feature requests:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Get a specific feature request by ticket number
 * GET /api/features/:ticketNumber
 */
router.get('/:ticketNumber', requireAuth, async (req, res) => {
  try {
    const { ticketNumber } = req.params
    const user_email = req.user.email

    const { data: featureRequest, error } = await supabase
      .from('feature_requests')
      .select(`
        *,
        feature_attachments (
          id,
          file_url,
          file_name,
          file_size,
          file_type,
          uploaded_at
        )
      `)
      .eq('ticket_number', ticketNumber)
      .eq('user_email', user_email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Feature request not found'
        })
      }
      console.error('Error fetching feature request:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch feature request'
      })
    }

    res.json({
      success: true,
      data: featureRequest
    })

  } catch (error) {
    console.error('Error fetching feature request:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Serve uploaded files
 * GET /uploads/feature-attachments/:filename
 */
router.get('/uploads/feature-attachments/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(__dirname, '../uploads/feature-attachments', filename)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      })
    }

    res.sendFile(filePath)
  } catch (error) {
    console.error('Error serving file:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// ===== ADMIN ENDPOINTS =====

/**
 * Get all feature requests for admin
 * GET /api/features/admin/all
 */
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      priority, 
      category,
      sort_by = 'created_at',
      sort_order = 'desc',
      assigned_to
    } = req.query

    let query = supabase
      .from('feature_requests')
      .select(`
        *,
        feature_attachments (
          id,
          file_url,
          file_name,
          file_size,
          file_type,
          uploaded_at
        )
      `)

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,user_email.ilike.%${search}%`)
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    // Apply sorting
    const ascending = sort_order === 'asc'
    query = query.order(sort_by, { ascending })

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('feature_requests')
      .select('*', { count: 'exact', head: true })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: featureRequests, error } = await query

    if (error) {
      console.error('Error fetching feature requests:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch feature requests'
      })
    }

    res.json({
      success: true,
      data: featureRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching admin feature requests:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Update feature request (admin only)
 * PUT /api/features/admin/:id
 */
router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { 
      status, 
      priority, 
      category, 
      assigned_to, 
      admin_notes, 
      duplicate_of,
      resolution_notes 
    } = req.body
    const adminEmail = req.user.email

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) {
      updateData.status = status
      updateData.status_changed_at = new Date().toISOString()
      updateData.status_changed_by = adminEmail
    }
    if (priority !== undefined) updateData.priority = priority
    if (category !== undefined) updateData.category = category
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes
    if (duplicate_of !== undefined) updateData.duplicate_of = duplicate_of
    if (resolution_notes !== undefined) updateData.resolution_notes = resolution_notes

    const { data: featureRequest, error } = await supabase
      .from('feature_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating feature request:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update feature request'
      })
    }

    // Log status change
    if (status !== undefined) {
      await supabase
        .from('feature_status_history')
        .insert({
          feature_request_id: id,
          old_status: req.body.old_status,
          new_status: status,
          changed_by: adminEmail,
          changed_at: new Date().toISOString(),
          notes: admin_notes
        })
    }

    res.json({
      success: true,
      data: featureRequest,
      message: 'Feature request updated successfully'
    })

  } catch (error) {
    console.error('Error updating feature request:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Bulk update feature requests (admin only)
 * PUT /api/features/admin/bulk
 */
router.put('/admin/bulk', requireAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body
    const adminEmail = req.user.email

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Feature request IDs are required'
      })
    }

    const updateData = {
      updated_at: new Date().toISOString(),
      ...updates
    }

    if (updates.status) {
      updateData.status_changed_at = new Date().toISOString()
      updateData.status_changed_by = adminEmail
    }

    const { data: updatedRequests, error } = await supabase
      .from('feature_requests')
      .update(updateData)
      .in('id', ids)
      .select()

    if (error) {
      console.error('Error bulk updating feature requests:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update feature requests'
      })
    }

    res.json({
      success: true,
      data: updatedRequests,
      message: `${updatedRequests.length} feature requests updated successfully`
    })

  } catch (error) {
    console.error('Error bulk updating feature requests:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Get feature request analytics
 * GET /api/features/admin/analytics
 */
router.get('/admin/analytics', requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query

    // Get basic counts
    const { data: totalCount } = await supabase
      .from('feature_requests')
      .select('id', { count: 'exact' })

    const { data: pendingCount } = await supabase
      .from('feature_requests')
      .select('id', { count: 'exact' })
      .in('status', ['submitted', 'under_review'])

    const { data: approvedCount } = await supabase
      .from('feature_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')

    const { data: releasedCount } = await supabase
      .from('feature_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'released')

    // Priority distribution
    const { data: priorityData } = await supabase
      .from('feature_requests')
      .select('priority')

    const priorityDistribution = priorityData?.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1
      return acc
    }, {}) || {}

    // Category distribution
    const { data: categoryData } = await supabase
      .from('feature_requests')
      .select('category')

    const categoryDistribution = categoryData?.reduce((acc, item) => {
      const category = item.category || 'uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {}) || {}

    // Submissions over time (last 30 days)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    const { data: submissionData } = await supabase
      .from('feature_requests')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at')

    // Group by date
    const submissionsByDate = {}
    submissionData?.forEach(item => {
      const date = item.created_at.split('T')[0]
      submissionsByDate[date] = (submissionsByDate[date] || 0) + 1
    })

    // Recent feature requests
    const { data: recentRequests } = await supabase
      .from('feature_requests')
      .select('id, title, priority, status, user_email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    res.json({
      success: true,
      data: {
        summary: {
          total: totalCount?.length || 0,
          pending: pendingCount?.length || 0,
          approved: approvedCount?.length || 0,
          released: releasedCount?.length || 0
        },
        priorityDistribution,
        categoryDistribution,
        submissionsByDate,
        recentRequests: recentRequests || []
      }
    })

  } catch (error) {
    console.error('Error fetching feature analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Export feature requests to CSV
 * GET /api/features/admin/export
 */
router.get('/admin/export', requireAuth, async (req, res) => {
  try {
    const { status, priority, category, format = 'csv' } = req.query

    let query = supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (category) query = query.eq('category', category)

    const { data: featureRequests, error } = await query

    if (error) {
      console.error('Error fetching feature requests for export:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch feature requests'
      })
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Ticket Number', 'Title', 'Description', 'Priority', 'Category', 
        'Status', 'User Email', 'User Name', 'Created At', 'Updated At',
        'Assigned To', 'Admin Notes'
      ]

      const csvRows = [headers.join(',')]
      
      featureRequests.forEach(request => {
        const row = [
          request.ticket_number,
          `"${request.title.replace(/"/g, '""')}"`,
          `"${request.description.replace(/"/g, '""')}"`,
          request.priority,
          request.category || '',
          request.status,
          request.user_email,
          request.user_name || '',
          request.created_at,
          request.updated_at,
          request.assigned_to || '',
          `"${(request.admin_notes || '').replace(/"/g, '""')}"`
        ]
        csvRows.push(row.join(','))
      })

      const csv = csvRows.join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="feature_requests.csv"')
      res.send(csv)
    } else {
      res.json({
        success: true,
        data: featureRequests
      })
    }

  } catch (error) {
    console.error('Error exporting feature requests:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router 