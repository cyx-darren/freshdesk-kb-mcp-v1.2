import express from 'express';
import playwrightService from '../services/playwright.js';

const router = express.Router();

/**
 * Playwright Browser Automation Routes
 */

// Get browser status
router.get('/status', async (req, res) => {
  try {
    const status = playwrightService.getStatus();
    res.json({
      success: true,
      status,
      message: status.isInitialized ? 'Browser is ready' : 'Browser not initialized'
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get browser status',
      details: error.message
    });
  }
});

// Take screenshot of a webpage
router.post('/screenshot', async (req, res) => {
  try {
    const { url, waitFor, fullPage, filename } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const result = await playwrightService.navigateAndScreenshot(url, {
      waitFor,
      fullPage,
      filename
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          url: result.url,
          title: result.title,
          screenshot: result.screenshot,
          filename
        },
        message: 'Screenshot captured successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to capture screenshot',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Screenshot operation failed',
      details: error.message
    });
  }
});

// Extract content from a webpage
router.post('/extract', async (req, res) => {
  try {
    const { url, selector } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const result = await playwrightService.extractContent(url, selector);

    if (result.success) {
      res.json({
        success: true,
        data: {
          title: result.title,
          url: result.url,
          content: result.content,
          length: result.length,
          selector: selector || 'body'
        },
        message: 'Content extracted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to extract content',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Content extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Content extraction failed',
      details: error.message
    });
  }
});

// Fill and submit a form
router.post('/form', async (req, res) => {
  try {
    const { url, formData, waitForSelector, submitButton } = req.body;

    if (!url || !formData) {
      return res.status(400).json({
        success: false,
        error: 'URL and formData are required'
      });
    }

    const result = await playwrightService.fillForm(url, formData, {
      waitForSelector,
      submitButton
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          beforeUrl: result.beforeUrl,
          afterUrl: result.afterUrl,
          title: result.title,
          beforeScreenshot: result.beforeScreenshot,
          afterScreenshot: result.afterScreenshot
        },
        message: 'Form submitted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to submit form',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Form submission failed',
      details: error.message
    });
  }
});

// Search for elements on a page
router.post('/search', async (req, res) => {
  try {
    const { url, text, selector } = req.body;

    if (!url || (!text && !selector)) {
      return res.status(400).json({
        success: false,
        error: 'URL and either text or selector are required'
      });
    }

    const searchCriteria = {};
    if (text) searchCriteria.text = text;
    if (selector) searchCriteria.selector = selector;

    const result = await playwrightService.searchElements(url, searchCriteria);

    if (result.success) {
      res.json({
        success: true,
        data: {
          url: result.url,
          elements: result.elements,
          count: result.count,
          searchCriteria
        },
        message: `Found ${result.count} elements`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to search elements',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Element search error:', error);
    res.status(500).json({
      success: false,
      error: 'Element search failed',
      details: error.message
    });
  }
});

// Generate PDF of a webpage
router.post('/pdf', async (req, res) => {
  try {
    const { url, format, margin, filename } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const result = await playwrightService.generatePDF(url, {
      format,
      margin,
      filename
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          url: result.url,
          title: result.title,
          pdf: result.pdf,
          size: result.size,
          filename
        },
        message: 'PDF generated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF',
        details: result.error
      });
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'PDF generation failed',
      details: error.message
    });
  }
});

// Monitor network requests
router.post('/network', async (req, res) => {
  try {
    const { url, duration } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const result = await playwrightService.monitorNetwork(url, duration);

    if (result.success) {
      res.json({
        success: true,
        data: {
          url: result.url,
          requests: result.requests,
          responses: result.responses,
          summary: result.summary
        },
        message: 'Network monitoring completed'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to monitor network',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Network monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Network monitoring failed',
      details: error.message
    });
  }
});

// Clean up browser resources
router.post('/cleanup', async (req, res) => {
  try {
    await playwrightService.cleanup();
    res.json({
      success: true,
      message: 'Browser resources cleaned up successfully'
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup browser resources',
      details: error.message
    });
  }
});

export default router; 