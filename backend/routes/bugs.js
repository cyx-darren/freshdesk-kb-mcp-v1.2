import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
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
    const uploadDir = path.join(__dirname, '../uploads/bug-attachments')
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
    const fileName = `bug-${uniqueSuffix}${fileExtension}`
    cb(null, fileName)
  }
})

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false)
  }
}

// Configure multer with size limit (5MB per file, max 3 files)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 3 // Maximum 3 files
  }
})

/**
 * Generate a unique ticket number for bug reports
 * @returns {Promise<string>} Ticket number in format BUG-YYYYMMDD-NNNN
 */
async function generateTicketNumber() {
  try {
    // Use the database function if available
    const { data, error } = await supabase.rpc('generate_bug_ticket_number')
    
    if (error) {
      console.warn('Database ticket generation failed, using fallback:', error.message)
      // Fallback to JavaScript implementation
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase()
      return `BUG-${today}-${randomSuffix}`
    }
    
    return data
  } catch (error) {
    console.warn('Ticket generation error, using fallback:', error.message)
    // Fallback implementation
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `BUG-${today}-${randomSuffix}`
  }
}

/**
 * Submit a new bug report
 * POST /api/bugs
 */
router.post('/', requireAuth, upload.array('attachments', 3), async (req, res) => {
  try {
    const { title, description, severity, user_name } = req.body
    const user_email = req.user.email

    // Validation
    if (!title || !description || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, and severity are required'
      })
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical']
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      })
    }

    // Generate ticket number
    const ticket_number = await generateTicketNumber()

    // Insert bug report into database
    const { data: bugReport, error: bugError } = await supabase
      .from('bug_reports')
      .insert({
        title: title.trim(),
        description: description.trim(),
        severity,
        user_email,
        user_name: user_name?.trim() || null,
        ticket_number,
        status: 'open'
      })
      .select('*')
      .single()

    if (bugError) {
      console.error('Error creating bug report:', bugError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create bug report',
        details: bugError.message
      })
    }

    // Handle file attachments if any
    const attachments = []
    if (req.files && req.files.length > 0) {
      try {
        for (const file of req.files) {
          // Create relative URL for the uploaded file
          const file_url = `/uploads/bug-attachments/${file.filename}`
          
          // Insert attachment record
          const { data: attachment, error: attachmentError } = await supabase
            .from('bug_attachments')
            .insert({
              bug_report_id: bugReport.id,
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

    console.log(`✅ Bug report created: ${ticket_number} by ${user_email}`)

    res.status(201).json({
      success: true,
      data: {
        ...bugReport,
        attachments
      },
      message: `Bug report submitted successfully. Ticket number: ${ticket_number}`
    })

  } catch (error) {
    console.error('Bug report submission error:', error)
    
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
      message: 'Failed to submit bug report'
    })
  }
})

/**
 * Get user's bug reports
 * GET /api/bugs
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const user_email = req.user.email
    const { page = 1, limit = 10, status, severity } = req.query

    let query = supabase
      .from('bug_reports')
      .select(`
        *,
        bug_attachments (
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
    if (severity) {
      query = query.eq('severity', severity)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: bugReports, error } = await query

    if (error) {
      console.error('Error fetching bug reports:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bug reports'
      })
    }

    res.json({
      success: true,
      data: bugReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: bugReports.length
      }
    })

  } catch (error) {
    console.error('Error fetching bug reports:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Get a specific bug report by ticket number
 * GET /api/bugs/:ticketNumber
 */
router.get('/:ticketNumber', requireAuth, async (req, res) => {
  try {
    const { ticketNumber } = req.params
    const user_email = req.user.email

    const { data: bugReport, error } = await supabase
      .from('bug_reports')
      .select(`
        *,
        bug_attachments (
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
          error: 'Bug report not found'
        })
      }
      console.error('Error fetching bug report:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bug report'
      })
    }

    res.json({
      success: true,
      data: bugReport
    })

  } catch (error) {
    console.error('Error fetching bug report:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Admin: Get all bug reports with filtering and pagination
 * GET /api/bugs/admin/all
 */
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    // For now, allow all authenticated users to access admin features
    // TODO: Add proper admin role checking
    
    const { 
      page = 1, 
      limit = 10, 
      status, 
      severity, 
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query

    let query = supabase
      .from('bug_reports')
      .select(`
        *,
        bug_attachments (
          id,
          file_url,
          file_name,
          file_size,
          file_type,
          uploaded_at
        )
      `)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (severity && severity !== 'all') {
      query = query.eq('severity', severity)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%, user_email.ilike.%${search}%`)
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'title', 'severity', 'status', 'user_email']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const ascending = sortOrder === 'asc'
    query = query.order(sortField, { ascending })

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('bug_reports')
      .select('*', { count: 'exact', head: true })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: bugReports, error } = await query

    if (error) {
      console.error('Error fetching bug reports:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bug reports'
      })
    }

    res.json({
      success: true,
      data: bugReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching admin bug reports:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Admin: Update bug report status and add notes
 * PUT /api/bugs/admin/:id
 */
router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    // For now, allow all authenticated users to access admin features
    // TODO: Add proper admin role checking
    
    const { id } = req.params
    const { status, admin_notes } = req.body
    const admin_email = req.user.email

    // Validation
    const validStatuses = ['new', 'in_progress', 'under_review', 'resolved', 'closed']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      })
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes.trim()
    }

    // Update the bug report
    const { data: updatedBugReport, error } = await supabase
      .from('bug_reports')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        bug_attachments (
          id,
          file_url,
          file_name,
          file_size,
          file_type,
          uploaded_at
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Bug report not found'
        })
      }
      console.error('Error updating bug report:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update bug report'
      })
    }

    console.log(`✅ Bug report ${id} updated by admin ${admin_email}`)

    res.json({
      success: true,
      data: updatedBugReport,
      message: 'Bug report updated successfully'
    })

  } catch (error) {
    console.error('Error updating bug report:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Serve uploaded files
 * GET /uploads/bug-attachments/:filename
 */
router.get('/uploads/bug-attachments/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(__dirname, '../uploads/bug-attachments', filename)
    
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

/**
 * Admin: Get bug report analytics
 * GET /api/bugs/admin/analytics
 */
router.get('/admin/analytics', requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query

    // Get basic counts
    const { data: totalCount } = await supabase
      .from('bug_reports')
      .select('id', { count: 'exact' })

    const { data: pendingCount } = await supabase
      .from('bug_reports')
      .select('id', { count: 'exact' })
      .in('status', ['new', 'in_progress'])

    const { data: resolvedCount } = await supabase
      .from('bug_reports')
      .select('id', { count: 'exact' })
      .eq('status', 'resolved')

    const { data: closedCount } = await supabase
      .from('bug_reports')
      .select('id', { count: 'exact' })
      .eq('status', 'closed')

    // Severity distribution
    const { data: severityData } = await supabase
      .from('bug_reports')
      .select('severity')

    const severityDistribution = severityData?.reduce((acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + 1
      return acc
    }, {}) || {}

    // Submissions over time (last 30 days)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    const { data: submissionData } = await supabase
      .from('bug_reports')
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

    // Recent bug reports
    const { data: recentReports } = await supabase
      .from('bug_reports')
      .select('id, title, severity, status, reporter_email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    res.json({
      success: true,
      data: {
        summary: {
          total: totalCount?.length || 0,
          pending: pendingCount?.length || 0,
          resolved: resolvedCount?.length || 0,
          closed: closedCount?.length || 0
        },
        severityDistribution,
        submissionsByDate,
        recentReports: recentReports || []
      }
    })

  } catch (error) {
    console.error('Error fetching bug analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * Export bug reports to CSV
 * GET /api/bugs/admin/export
 */
router.get('/admin/export', requireAuth, async (req, res) => {
  try {
    const { status, severity, search, format = 'csv' } = req.query

    let query = supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') query = query.eq('status', status)
    if (severity && severity !== 'all') query = query.eq('severity', severity)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,reporter_email.ilike.%${search}%`)
    }

    const { data: bugReports, error } = await query

    if (error) {
      console.error('Error fetching bug reports for export:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bug reports'
      })
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Ticket Number', 'Title', 'Description', 'Severity', 'Status', 
        'Reporter Email', 'Reporter Name', 'Environment', 'Steps to Reproduce',
        'Expected Behavior', 'Actual Behavior', 'Additional Info', 
        'Created At', 'Updated At', 'Admin Notes'
      ]

      const csvRows = [headers.join(',')]
      
      bugReports.forEach(report => {
        const row = [
          report.ticket_number,
          `"${report.title.replace(/"/g, '""')}"`,
          `"${report.description.replace(/"/g, '""')}"`,
          report.severity,
          report.status,
          report.reporter_email,
          report.reporter_name || '',
          report.environment || '',
          `"${(report.steps_to_reproduce || '').replace(/"/g, '""')}"`,
          `"${(report.expected_behavior || '').replace(/"/g, '""')}"`,
          `"${(report.actual_behavior || '').replace(/"/g, '""')}"`,
          `"${(report.additional_info || '').replace(/"/g, '""')}"`,
          report.created_at,
          report.updated_at,
          `"${(report.admin_notes || '').replace(/"/g, '""')}"`
        ]
        csvRows.push(row.join(','))
      })

      const csv = csvRows.join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="bug_reports.csv"')
      res.send(csv)
    } else {
      res.json({
        success: true,
        data: bugReports
      })
    }

  } catch (error) {
    console.error('Error exporting bug reports:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router 