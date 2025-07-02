import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

/**
 * Playwright Service for Browser Automation
 * Provides web scraping, testing, and automation capabilities
 */

class PlaywrightService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
  }

  /**
   * Initialize browser instance
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.browser = await chromium.launch({
        headless: true, // Run in headless mode for production
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // For Railway deployment
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });

      this.page = await this.context.newPage();
      this.isInitialized = true;

      console.log('✅ Playwright browser initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Playwright:', error);
      throw error;
    }
  }

  /**
   * Navigate to a URL and take a screenshot
   */
  async navigateAndScreenshot(url, options = {}) {
    await this.initialize();

    try {
      const {
        waitFor = 'networkidle',
        fullPage = false,
        filename = null
      } = options;

      // Navigate to the URL
      await this.page.goto(url, { waitUntil: waitFor });

      // Take screenshot
      const screenshotBuffer = await this.page.screenshot({
        fullPage,
        type: 'png'
      });

      // Save to file if filename provided
      if (filename) {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'screenshots');
        await fs.mkdir(uploadsDir, { recursive: true });
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, screenshotBuffer);
      }

      return {
        success: true,
        screenshot: screenshotBuffer.toString('base64'),
        url: this.page.url(),
        title: await this.page.title()
      };
    } catch (error) {
      console.error('❌ Screenshot error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract text content from a webpage
   */
  async extractContent(url, selector = 'body') {
    await this.initialize();

    try {
      await this.page.goto(url, { waitUntil: 'networkidle' });

      const content = await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element ? element.innerText : '';
      }, selector);

      const title = await this.page.title();
      const currentUrl = this.page.url();

      return {
        success: true,
        title,
        url: currentUrl,
        content: content.trim(),
        length: content.length
      };
    } catch (error) {
      console.error('❌ Content extraction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fill out a form and submit it
   */
  async fillForm(url, formData, options = {}) {
    await this.initialize();

    try {
      const { waitForSelector = null, submitButton = 'button[type="submit"]' } = options;

      await this.page.goto(url, { waitUntil: 'networkidle' });

      // Wait for specific selector if provided
      if (waitForSelector) {
        await this.page.waitForSelector(waitForSelector);
      }

      // Fill form fields
      for (const [selector, value] of Object.entries(formData)) {
        await this.page.fill(selector, value);
      }

      // Take screenshot before submission
      const beforeScreenshot = await this.page.screenshot({ type: 'png' });

      // Submit form
      await this.page.click(submitButton);
      await this.page.waitForLoadState('networkidle');

      // Take screenshot after submission
      const afterScreenshot = await this.page.screenshot({ type: 'png' });

      return {
        success: true,
        beforeUrl: url,
        afterUrl: this.page.url(),
        beforeScreenshot: beforeScreenshot.toString('base64'),
        afterScreenshot: afterScreenshot.toString('base64'),
        title: await this.page.title()
      };
    } catch (error) {
      console.error('❌ Form filling error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search for elements on a page
   */
  async searchElements(url, searchCriteria) {
    await this.initialize();

    try {
      await this.page.goto(url, { waitUntil: 'networkidle' });

      const elements = await this.page.evaluate((criteria) => {
        const results = [];
        
        // Search by text content
        if (criteria.text) {
          const xpath = `//*[contains(text(), "${criteria.text}")]`;
          const iterator = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
          let node;
          while (node = iterator.iterateNext()) {
            results.push({
              type: 'text',
              tagName: node.tagName,
              text: node.textContent.trim(),
              selector: node.tagName.toLowerCase()
            });
          }
        }

        // Search by selector
        if (criteria.selector) {
          const elements = document.querySelectorAll(criteria.selector);
          elements.forEach(el => {
            results.push({
              type: 'selector',
              tagName: el.tagName,
              text: el.textContent.trim(),
              selector: criteria.selector,
              attributes: Array.from(el.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {})
            });
          });
        }

        return results;
      }, searchCriteria);

      return {
        success: true,
        url: this.page.url(),
        elements,
        count: elements.length
      };
    } catch (error) {
      console.error('❌ Element search error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate a PDF of the page
   */
  async generatePDF(url, options = {}) {
    await this.initialize();

    try {
      const {
        format = 'A4',
        margin = { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
        filename = null
      } = options;

      await this.page.goto(url, { waitUntil: 'networkidle' });

      const pdfBuffer = await this.page.pdf({
        format,
        margin,
        printBackground: true
      });

      // Save to file if filename provided
      if (filename) {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs');
        await fs.mkdir(uploadsDir, { recursive: true });
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, pdfBuffer);
      }

      return {
        success: true,
        pdf: pdfBuffer.toString('base64'),
        url: this.page.url(),
        title: await this.page.title(),
        size: pdfBuffer.length
      };
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Monitor network requests on a page
   */
  async monitorNetwork(url, duration = 30000) {
    await this.initialize();

    try {
      const requests = [];
      const responses = [];

      // Set up network monitoring
      this.page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now()
        });
      });

      this.page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          timestamp: Date.now()
        });
      });

      // Navigate and wait
      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(duration);

      return {
        success: true,
        url: this.page.url(),
        requests,
        responses,
        summary: {
          totalRequests: requests.length,
          totalResponses: responses.length,
          duration
        }
      };
    } catch (error) {
      console.error('❌ Network monitoring error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isInitialized = false;
      console.log('✅ Playwright browser cleaned up');
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }

  /**
   * Get browser status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasBrowser: !!this.browser,
      hasContext: !!this.context,
      hasPage: !!this.page
    };
  }
}

// Create singleton instance
const playwrightService = new PlaywrightService();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Playwright service...');
  await playwrightService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Playwright service...');
  await playwrightService.cleanup();
  process.exit(0);
});

export default playwrightService; 