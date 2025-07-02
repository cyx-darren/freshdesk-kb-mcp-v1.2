import supabase from '../config/supabase.js'

/**
 * Comprehensive Error Logging and Handling Service
 * Implements Subtask 20.5: Comprehensive Error Handling and Logging
 * 
 * Features:
 * - User-friendly error messages
 * - Traceable error IDs
 * - Pattern recognition
 * - Performance monitoring
 * - Folder creation tracking
 */
class ErrorLogger {
  constructor() {
    this.errorSequence = 0
    this.patternSequence = 0
    this.folderLogSequence = 0
    this.initializeSequences()
  }

  /**
   * Initialize sequences from database
   */
  async initializeSequences() {
    try {
      // Get current max sequences to continue numbering
      const { data: errorData } = await supabase
        .from('error_logs')
        .select('error_id')
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: patternData } = await supabase
        .from('error_patterns')
        .select('pattern_id')
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: folderData } = await supabase
        .from('folder_creation_logs')
        .select('log_id')
        .order('created_at', { ascending: false })
        .limit(1)

      // Extract sequence numbers
      if (errorData && errorData.length > 0) {
        const match = errorData[0].error_id.match(/ERR-\d{6}-(\d+)/)
        if (match) this.errorSequence = parseInt(match[1])
      }

      if (patternData && patternData.length > 0) {
        const match = patternData[0].pattern_id.match(/PAT-(\d+)/)
        if (match) this.patternSequence = parseInt(match[1])
      }

      if (folderData && folderData.length > 0) {
        const match = folderData[0].log_id.match(/FCL-\d{6}-(\d+)/)
        if (match) this.folderLogSequence = parseInt(match[1])
      }
    } catch (error) {
      console.warn('[ERROR LOGGER] Failed to initialize sequences:', error.message)
    }
  }

  /**
   * Generate human-readable error ID
   * Format: ERR-YYMMDD-001
   */
  generateErrorId() {
    this.errorSequence++
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    return `ERR-${date}-${this.errorSequence.toString().padStart(3, '0')}`
  }

  /**
   * Generate pattern ID
   * Format: PAT-001
   */
  generatePatternId() {
    this.patternSequence++
    return `PAT-${this.patternSequence.toString().padStart(3, '0')}`
  }

  /**
   * Generate folder creation log ID
   * Format: FCL-YYMMDD-001
   */
  generateFolderLogId() {
    this.folderLogSequence++
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    return `FCL-${date}-${this.folderLogSequence.toString().padStart(3, '0')}`
  }

  /**
   * Convert technical error to user-friendly message
   */
  generateUserFriendlyMessage(errorType, technicalMessage, context = {}) {
    const errorMessages = {
      // Folder Creation Errors
      'folder_creation_failed': {
        'category_not_found': `The category you selected is no longer available. Please refresh the page and try selecting a different category.`,
        'permission_denied': `You don't have permission to create folders in this category. Please contact your administrator.`,
        'invalid_folder_name': `The folder name contains invalid characters. Please use only letters, numbers, and spaces.`,
        'folder_exists': `A folder with this name already exists in the selected category. Please choose a different name.`,
        'network_error': `Unable to connect to the knowledge base. Please check your internet connection and try again.`,
        'default': `Unable to create the folder at this time. Our team has been notified and will resolve this issue shortly.`
      },

      // Article Creation Errors
      'article_creation_failed': {
        'folder_not_found': `The selected folder is no longer available. Please refresh the page and select a different folder.`,
        'validation_error': `Please check that all required fields are filled out correctly and try again.`,
        'content_too_large': `The article content is too large. Please reduce the content size and try again.`,
        'permission_denied': `You don't have permission to create articles in this folder. Please contact your administrator.`,
        'default': `Unable to create the article at this time. Please try again in a few minutes.`
      },

      // API Errors
      'api_error': {
        'mcp_timeout': `The request is taking longer than expected. Please try again.`,
        'mcp_unavailable': `The knowledge base service is temporarily unavailable. Please try again in a few minutes.`,
        'rate_limit': `Too many requests. Please wait a moment before trying again.`,
        'authentication_failed': `Your session has expired. Please refresh the page and log in again.`,
        'default': `A temporary service issue occurred. Please try again.`
      },

      // System Errors
      'system_error': {
        'database_error': `A database issue occurred. Our team has been notified and will resolve this shortly.`,
        'cache_error': `A caching issue occurred. The system will automatically recover.`,
        'configuration_error': `A configuration issue was detected. Our team has been notified.`,
        'default': `An unexpected system error occurred. Our team has been automatically notified.`
      }
    }

    const category = errorMessages[errorType] || errorMessages['system_error']
    
    // Try to find specific message based on technical error content
    for (const [key, message] of Object.entries(category)) {
      if (key === 'default') continue
      
      if (technicalMessage.toLowerCase().includes(key.replace('_', ' ')) ||
          technicalMessage.toLowerCase().includes(key)) {
        return message
      }
    }

    // Return default message for the error type
    return category.default
  }

  /**
   * Generate error signature for pattern recognition
   */
  generateErrorSignature(errorType, message, context = {}) {
    // Create a normalized signature for pattern matching
    const normalizedMessage = message
      .toLowerCase()
      .replace(/\d+/g, 'NUM') // Replace numbers with NUM
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    const contextKeys = Object.keys(context).sort().join(',')
    return `${errorType}:${normalizedMessage}:${contextKeys}`
  }

  /**
   * Log comprehensive error with all context
   */
  async logError({
    // Required fields
    errorType,
    title,
    message,
    
    // Error classification
    category = 'system',
    severity = 'medium',
    
    // User context
    userId = null,
    userEmail = null,
    sessionId = null,
    
    // Request context
    requestPath = null,
    requestMethod = null,
    requestBody = null,
    requestHeaders = null,
    
    // Technical context
    service = null,
    functionName = null,
    fileName = null,
    lineNumber = null,
    stackTrace = null,
    
    // Additional context
    metadata = {},
    
    // Freshdesk/MCP specific
    freshdeskCategoryId = null,
    freshdeskFolderId = null,
    mcpOperation = null
  }) {
    try {
      const errorId = this.generateErrorId()
      const userMessage = this.generateUserFriendlyMessage(errorType, message, metadata)
      const signature = this.generateErrorSignature(errorType, message, metadata)

      // Save error log
      const { data: errorLog, error: logError } = await supabase
        .from('error_logs')
        .insert({
          error_id: errorId,
          error_type: errorType,
          error_category: category,
          severity: severity,
          title: title,
          message: message,
          user_message: userMessage,
          user_id: userId,
          user_email: userEmail,
          session_id: sessionId,
          request_path: requestPath,
          request_method: requestMethod,
          request_body: requestBody,
          request_headers: requestHeaders,
          service: service,
          function_name: functionName,
          file_name: fileName,
          line_number: lineNumber,
          metadata: metadata,
          stack_trace: stackTrace,
          freshdesk_category_id: freshdeskCategoryId,
          freshdesk_folder_id: freshdeskFolderId,
          mcp_operation: mcpOperation
        })
        .select()
        .single()

      if (logError) {
        console.error('[ERROR LOGGER] Failed to save error log:', logError)
        return { errorId, userMessage }
      }

      // Update or create error pattern
      await this.updateErrorPattern(signature, errorType, title, {
        freshdeskCategoryId,
        mcpOperation,
        metadata
      })

      // Log to console for immediate visibility
      console.error(`[${errorId}] ${title}:`, {
        type: errorType,
        category: category,
        severity: severity,
        message: message,
        userMessage: userMessage,
        context: {
          userId,
          userEmail,
          service,
          functionName,
          freshdeskCategoryId,
          mcpOperation
        }
      })

      return { 
        errorId, 
        userMessage, 
        errorLogId: errorLog.id,
        severity,
        category
      }

    } catch (error) {
      console.error('[ERROR LOGGER] Critical error in logging system:', error)
      
      // Return basic error info even if logging fails
      return {
        errorId: 'ERR-SYSTEM-FAIL',
        userMessage: 'A system error occurred. Please try again.',
        severity: 'high'
      }
    }
  }

  /**
   * Update error pattern for trend analysis
   */
  async updateErrorPattern(signature, errorType, title, context = {}) {
    try {
      // Check if pattern exists
      const { data: existingPattern } = await supabase
        .from('error_patterns')
        .select('*')
        .eq('error_signature', signature)
        .single()

      if (existingPattern) {
        // Update existing pattern
        const updates = {
          occurrence_count: existingPattern.occurrence_count + 1,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Update affected categories and operations
        if (context.freshdeskCategoryId) {
          const categories = existingPattern.affected_categories || []
          if (!categories.includes(context.freshdeskCategoryId)) {
            updates.affected_categories = [...categories, context.freshdeskCategoryId]
          }
        }

        if (context.mcpOperation) {
          const operations = existingPattern.affected_operations || []
          if (!operations.includes(context.mcpOperation)) {
            updates.affected_operations = [...operations, context.mcpOperation]
          }
        }

        await supabase
          .from('error_patterns')
          .update(updates)
          .eq('id', existingPattern.id)

      } else {
        // Create new pattern
        const patternId = this.generatePatternId()
        
        await supabase
          .from('error_patterns')
          .insert({
            pattern_id: patternId,
            error_type: errorType,
            error_signature: signature,
            title: title,
            description: `Pattern detected for ${errorType} errors`,
            affected_categories: context.freshdeskCategoryId ? [context.freshdeskCategoryId] : [],
            affected_operations: context.mcpOperation ? [context.mcpOperation] : [],
            occurrence_count: 1,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString()
          })
      }
    } catch (error) {
      console.warn('[ERROR LOGGER] Failed to update error pattern:', error.message)
    }
  }

  /**
   * Log folder creation attempt with comprehensive tracking
   */
  async logFolderCreation({
    operationType = 'create_folder',
    operationStatus, // 'success', 'failed', 'partial'
    
    // Folder data
    folderName,
    folderDescription = null,
    categoryId = null,
    categoryName = null,
    parentFolderId = null,
    visibility = null,
    
    // User context
    userId = null,
    userEmail = null,
    sessionId = null,
    
    // Performance metrics
    responseTimeMs = null,
    retryCount = 0,
    fallbackUsed = false,
    cacheHit = false,
    
    // Results
    successData = null,
    errorData = null,
    warningData = null,
    
    // MCP context
    mcpRequestId = null,
    mcpResponseStatus = null,
    mcpResponseTimeMs = null,
    
    // Error reference
    errorLogId = null
  }) {
    try {
      const logId = this.generateFolderLogId()

      const { data, error } = await supabase
        .from('folder_creation_logs')
        .insert({
          log_id: logId,
          operation_type: operationType,
          operation_status: operationStatus,
          folder_name: folderName,
          folder_description: folderDescription,
          category_id: categoryId,
          category_name: categoryName,
          parent_folder_id: parentFolderId,
          visibility: visibility,
          user_id: userId,
          user_email: userEmail,
          session_id: sessionId,
          response_time_ms: responseTimeMs,
          retry_count: retryCount,
          fallback_used: fallbackUsed,
          cache_hit: cacheHit,
          success_data: successData,
          error_data: errorData,
          warning_data: warningData,
          mcp_request_id: mcpRequestId,
          mcp_response_status: mcpResponseStatus,
          mcp_response_time_ms: mcpResponseTimeMs,
          error_log_id: errorLogId
        })
        .select()
        .single()

      if (error) {
        console.error('[ERROR LOGGER] Failed to log folder creation:', error)
        return null
      }

      console.log(`[${logId}] Folder creation logged:`, {
        operation: operationType,
        status: operationStatus,
        folder: folderName,
        category: categoryName,
        responseTime: responseTimeMs,
        fallback: fallbackUsed
      })

      return { logId, logData: data }

    } catch (error) {
      console.error('[ERROR LOGGER] Critical error in folder creation logging:', error)
      return null
    }
  }

  /**
   * Log performance metrics
   */
  async logPerformance({
    operation,
    endpoint = null,
    responseTimeMs,
    memoryUsageMb = null,
    cpuUsagePercent = null,
    userId = null,
    sessionId = null,
    requestSizeBytes = null,
    responseSizeBytes = null,
    statusCode = null,
    cacheHit = false,
    metadata = {}
  }) {
    try {
      await supabase
        .from('performance_logs')
        .insert({
          operation,
          endpoint,
          response_time_ms: responseTimeMs,
          memory_usage_mb: memoryUsageMb,
          cpu_usage_percent: cpuUsagePercent,
          user_id: userId,
          session_id: sessionId,
          request_size_bytes: requestSizeBytes,
          response_size_bytes: responseSizeBytes,
          status_code: statusCode,
          cache_hit: cacheHit,
          metadata
        })

      // Log slow operations
      if (responseTimeMs > 5000) {
        console.warn(`[PERFORMANCE] Slow operation detected: ${operation} took ${responseTimeMs}ms`)
      }

    } catch (error) {
      console.warn('[ERROR LOGGER] Failed to log performance:', error.message)
    }
  }

  /**
   * Get error statistics for monitoring
   */
  async getErrorStatistics(timeframeHours = 24) {
    try {
      const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000).toISOString()

      const { data: errors } = await supabase
        .from('error_logs')
        .select('error_type, severity, freshdesk_category_id')
        .gte('created_at', since)

      const { data: patterns } = await supabase
        .from('error_patterns')
        .select('error_type, occurrence_count, affected_categories')
        .gte('last_seen', since)
        .order('occurrence_count', { ascending: false })
        .limit(10)

      const { data: folderLogs } = await supabase
        .from('folder_creation_logs')
        .select('operation_status, category_id, response_time_ms')
        .gte('created_at', since)

      return {
        totalErrors: errors?.length || 0,
        errorsByType: this.groupBy(errors || [], 'error_type'),
        errorsBySeverity: this.groupBy(errors || [], 'severity'),
        topPatterns: patterns || [],
        folderCreationStats: {
          total: folderLogs?.length || 0,
          successful: folderLogs?.filter(log => log.operation_status === 'success').length || 0,
          failed: folderLogs?.filter(log => log.operation_status === 'failed').length || 0,
          avgResponseTime: this.average(folderLogs?.map(log => log.response_time_ms).filter(Boolean) || [])
        }
      }
    } catch (error) {
      console.error('[ERROR LOGGER] Failed to get error statistics:', error)
      return null
    }
  }

  /**
   * Helper: Group array by key
   */
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown'
      groups[group] = (groups[group] || 0) + 1
      return groups
    }, {})
  }

  /**
   * Helper: Calculate average
   */
  average(numbers) {
    if (numbers.length === 0) return 0
    return Math.round(numbers.reduce((sum, num) => sum + num, 0) / numbers.length)
  }
}

// Export singleton instance
export default new ErrorLogger() 