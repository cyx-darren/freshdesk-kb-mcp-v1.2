import { api } from './api.js';

/**
 * Playwright Service for Frontend
 * Provides browser automation capabilities through API calls
 */

export const playwrightService = {
  /**
   * Get browser status
   */
  async getStatus() {
    try {
      const response = await api.get('/api/playwright/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get browser status:', error);
      throw error;
    }
  },

  /**
   * Take a screenshot of a webpage
   */
  async takeScreenshot(url, options = {}) {
    try {
      const response = await api.post('/api/playwright/screenshot', {
        url,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      throw error;
    }
  },

  /**
   * Extract content from a webpage
   */
  async extractContent(url, selector) {
    try {
      const response = await api.post('/api/playwright/extract', {
        url,
        selector
      });
      return response.data;
    } catch (error) {
      console.error('Failed to extract content:', error);
      throw error;
    }
  },

  /**
   * Fill and submit a form
   */
  async fillForm(url, formData, options = {}) {
    try {
      const response = await api.post('/api/playwright/form', {
        url,
        formData,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fill form:', error);
      throw error;
    }
  },

  /**
   * Search for elements on a page
   */
  async searchElements(url, searchCriteria) {
    try {
      const response = await api.post('/api/playwright/search', {
        url,
        ...searchCriteria
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search elements:', error);
      throw error;
    }
  },

  /**
   * Generate PDF of a webpage
   */
  async generatePDF(url, options = {}) {
    try {
      const response = await api.post('/api/playwright/pdf', {
        url,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      throw error;
    }
  },

  /**
   * Monitor network requests
   */
  async monitorNetwork(url, duration = 30000) {
    try {
      const response = await api.post('/api/playwright/network', {
        url,
        duration
      });
      return response.data;
    } catch (error) {
      console.error('Failed to monitor network:', error);
      throw error;
    }
  },

  /**
   * Clean up browser resources
   */
  async cleanup() {
    try {
      const response = await api.post('/api/playwright/cleanup');
      return response.data;
    } catch (error) {
      console.error('Failed to cleanup browser:', error);
      throw error;
    }
  }
};

export default playwrightService; 