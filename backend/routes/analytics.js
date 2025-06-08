import express from 'express'
import analyticsService from '../services/analytics.js'
import { requireAuth } from '../middleware/auth.js'
import supabase from '../config/supabase.js'

const router = express.Router()

/**
 * GET /analytics/history
 * Get user's search history (protected route)
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { 
      limit = 20, 
      page = 1, 
      category = null,
      start_date = null,
      end_date = null
    } = req.query

    const userId = req.user.id

    console.log(`[ANALYTICS] User ${req.user.email} fetching search history`)

    const historyResult = await analyticsService.getUserSearchHistory(userId, {
      limit,
      page,
      category,
      startDate: start_date,
      endDate: end_date
    })

    const response = {
      ...historyResult,
      user: {
        id: userId,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Analytics history fetch error:', {
      error: error.message,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      success: false,
      error: 'Analytics history fetch failed',
      message: 'An unexpected error occurred while fetching search history',
      code: 'ANALYTICS_HISTORY_ERROR',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /analytics/insights
 * Get user's search analytics and insights (protected route)
 */
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query
    const userId = req.user.id

    console.log(`[ANALYTICS] User ${req.user.email} fetching search insights`)

    const daysNum = Math.min(365, Math.max(1, parseInt(days) || 30))
    const analyticsResult = await analyticsService.getUserSearchAnalytics(userId, daysNum)

    const response = {
      ...analyticsResult,
      user: {
        id: userId,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Analytics insights fetch error:', {
      error: error.message,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      success: false,
      error: 'Analytics insights fetch failed',
      message: 'An unexpected error occurred while fetching search insights',
      code: 'ANALYTICS_INSIGHTS_ERROR',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /analytics/popular
 * Get popular search queries (protected route - could be admin only in the future)
 */
router.get('/popular', requireAuth, async (req, res) => {
  try {
    const { 
      limit = 20, 
      days = 30,
      category = null,
      min_count = 2
    } = req.query

    console.log(`[ANALYTICS] User ${req.user.email} fetching popular queries`)

    const popularResult = await analyticsService.getPopularQueries({
      limit: parseInt(limit) || 20,
      days: parseInt(days) || 30,
      category,
      minCount: parseInt(min_count) || 2
    })

    const response = {
      ...popularResult,
      user: {
        id: req.user.id,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Popular queries fetch error:', {
      error: error.message,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      success: false,
      error: 'Popular queries fetch failed',
      message: 'An unexpected error occurred while fetching popular queries',
      code: 'POPULAR_QUERIES_ERROR',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * DELETE /analytics/history
 * Clear user's search history (protected route)
 */
router.delete('/history', requireAuth, async (req, res) => {
  try {
    const { days = null } = req.query
    const userId = req.user.id

    console.log(`[ANALYTICS] User ${req.user.email} clearing search history`)

    let deletedCount = 0

    if (days) {
      // Clear history older than specified days
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days))

      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userId)
        .lt('timestamp', cutoffDate.toISOString())

      if (error) {
        throw new Error(`History cleanup error: ${error.message}`)
      }
    } else {
      // Clear all user's search history
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userId)

      if (error) {
        throw new Error(`History cleanup error: ${error.message}`)
      }
    }

    const response = {
      success: true,
      message: days 
        ? `Cleared search history older than ${days} days`
        : 'Cleared all search history',
      cleared_days: days || 'all',
      user: {
        id: userId,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Analytics history cleanup error:', {
      error: error.message,
      user: req.user?.email,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      success: false,
      error: 'History cleanup failed',
      message: 'An unexpected error occurred while clearing search history',
      code: 'HISTORY_CLEANUP_ERROR',
      timestamp: new Date().toISOString()
    })
  }
})

export default router 