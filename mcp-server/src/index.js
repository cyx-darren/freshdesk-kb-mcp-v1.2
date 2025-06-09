import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import dotenv from 'dotenv';

// Simple in-memory cache for search results and categories
const cache = {
  searches: new Map(),
  categories: null,
  categoriesExpiry: null,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_CACHED_SEARCHES: 50
};

// Load environment variables
dotenv.config();

// Validate required environment variables
const FRESHDESK_DOMAIN = process.env.FRESHDESK_DOMAIN;
const FRESHDESK_API_KEY = process.env.FRESHDESK_API_KEY;

if (!FRESHDESK_DOMAIN || !FRESHDESK_API_KEY) {
  console.error('Error: Missing required environment variables.');
  console.error('Please ensure FRESHDESK_DOMAIN and FRESHDESK_API_KEY are set in your .env file.');
  console.error('See .env.example for the required format.');
  process.exit(1);
}

/**
 * Freshdesk Knowledge Base MCP Server
 * Provides access to Freshdesk knowledge base articles and search functionality
 */

// Create MCP server instance
const server = new McpServer({
  name: 'freshdesk-kb',
  version: '1.0.0'
});

// Helper function to create cache key
function createCacheKey(query, category, page) {
  return `${query}|${category || 'all'}|${page || 1}`;
}

// Helper function to check if cache entry is valid
function isCacheValid(timestamp) {
  return Date.now() - timestamp < cache.CACHE_DURATION;
}

// Add the list categories tool
server.tool(
  'list_categories',
  'List all solution categories in your Freshdesk knowledge base',
  {},
  async () => {
    try {
      // Check cache first
      if (cache.categories && cache.categoriesExpiry && isCacheValid(cache.categoriesExpiry)) {
        console.error('📋 Returning cached categories');
        return {
          content: [
            {
              type: 'text',
              text: cache.categories
            }
          ]
        };
      }

      // Construct the Freshdesk API URL for categories
      const apiUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/categories`;
      
      console.error('🔍 Fetching categories from Freshdesk API...');
      
      // Make the API call with proper authentication
      const response = await axios.get(apiUrl, {
        auth: {
          username: FRESHDESK_API_KEY,
          password: 'X'
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      const categories = response.data;

      // Check if we got results
      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        const noResultsText = '📁 No categories found in your Freshdesk knowledge base.\n\nThis might mean:\n• No categories have been created yet\n• Your API key lacks permission to view categories\n• Categories are not enabled in your Freshdesk instance';
        return {
          content: [
            {
              type: 'text',
              text: noResultsText
            }
          ]
        };
      }

      // Format the categories
      let formattedCategories = `📁 **Knowledge Base Categories** (${categories.length} total)\n\n`;
      
      categories.forEach((category, index) => {
        formattedCategories += `${index + 1}. **${category.name || 'Unnamed Category'}**\n`;
        
        if (category.description) {
          formattedCategories += `   ${category.description}\n`;
        }
        
        if (category.id) {
          formattedCategories += `   🆔 Category ID: ${category.id}\n`;
        }
        
        if (category.created_at) {
          const createdDate = new Date(category.created_at).toLocaleDateString();
          formattedCategories += `   📅 Created: ${createdDate}\n`;
        }
        
        // Show article count if available
        if (category.articles_count !== undefined) {
          formattedCategories += `   📄 Articles: ${category.articles_count}\n`;
        }
        
        formattedCategories += '\n';
      });

      formattedCategories += `\n💡 **Tip**: Use category names or IDs when searching to filter results by category.`;

      // Cache the result
      cache.categories = formattedCategories;
      cache.categoriesExpiry = Date.now();
      console.error(`✅ Cached ${categories.length} categories`);

      return {
        content: [
          {
            type: 'text',
            text: formattedCategories
          }
        ]
      };

    } catch (error) {
      // Enhanced error logging with context
      console.error('=== Freshdesk Categories API Error ===');
      console.error('Domain:', FRESHDESK_DOMAIN);
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
      }
      console.error('=====================================');
      
      let errorMessage = '🚨 **Failed to retrieve categories**\n\n';
      let suggestions = [];
      
      if (error.response) {
        const status = error.response.status;
        
        switch (status) {
          case 401:
            errorMessage += '🔐 **Authentication Failed**: Your API key is invalid or expired.';
            suggestions.push('Verify your FRESHDESK_API_KEY in the .env file');
            break;
          case 403:
            errorMessage += '🚫 **Access Forbidden**: Your API key lacks the required permissions.';
            suggestions.push('Ensure your API key has "Knowledge Base" permissions');
            suggestions.push('Contact your Freshdesk administrator for access');
            break;
          case 404:
            errorMessage += '🔍 **Not Found**: Categories endpoint not found.';
            suggestions.push('Verify your FRESHDESK_DOMAIN is correct');
            suggestions.push('Check if your Freshdesk instance has Knowledge Base enabled');
            break;
          case 429:
            errorMessage += '⏰ **Rate Limit Exceeded**: Too many requests sent too quickly.';
            suggestions.push('Wait 60 seconds before trying again');
            break;
          default:
            errorMessage += `💥 **API Error**: ${status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage += '🌐 **Network Error**: Unable to reach Freshdesk servers.';
        suggestions.push('Check your internet connection');
      } else {
        errorMessage += `⚙️ **Configuration Error**: ${error.message}`;
      }
      
      if (suggestions.length > 0) {
        errorMessage += '\n\n💡 **Suggestions**:\n' + suggestions.map(s => `• ${s}`).join('\n');
      }

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ]
      };
    }
  }
);

// Add the search tool using the high-level API
server.tool(
  'search_knowledge_base',
  'Search Freshdesk knowledge base. Can search all articles (search endpoint) or within a specific category (folders endpoint). When category is provided, uses folders endpoint; otherwise uses search endpoint.',
  {
    query: z.string().optional().describe('Search terms to find in articles. Optional if category is provided'),
    category: z.string().optional().describe('Category name or ID to search within. If provided without query, returns all articles in category'),
    page: z.number().optional().default(1).describe('Page number for pagination (default: 1)'),
    per_page: z.number().optional().default(30).describe('Number of results per page (default: 30, max: 100)')
  },
  async ({ query, category, page = 1, per_page = 30 }) => {
    try {
      // Validate pagination parameters
      page = Math.max(1, Math.floor(page));
      per_page = Math.min(100, Math.max(1, Math.floor(per_page)));
      
      // Validate that we have either query or category
      if (!query && !category) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: '❌ **Missing Parameters**: Please provide either a search query, a category, or both.\n\n💡 **Examples**:\n• Search all: `query="printer setup"`\n• Search in category: `query="troubleshooting", category="Getting Started"`\n• List category articles: `category="Support"`'
            }
          ]
        };
      }
      
      // Check cache first
      const cacheKey = createCacheKey(query || '', category, page);
      if (cache.searches.has(cacheKey)) {
        const cachedEntry = cache.searches.get(cacheKey);
        if (isCacheValid(cachedEntry.timestamp)) {
          console.error(`📋 Returning cached search results for: ${cacheKey}`);
          return cachedEntry.result;
        } else {
          // Remove expired entry
          cache.searches.delete(cacheKey);
        }
      }

      let apiUrl, params = {};
      let searchType;
      let solutions, response;

      if (category) {
        // Category-based search: use folders endpoint
        searchType = 'category';
        
        // Resolve category to folder ID
        let folderId = category;
        
        // If category is not numeric, we need to find the category ID by name
        if (!/^\d+$/.test(category)) {
          console.error(`🔍 Resolving category "${category}" to category ID...`);
          
          try {
            // Get all categories to find the ID
            const categoriesUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/categories`;
            const categoriesResponse = await axios.get(categoriesUrl, {
              auth: {
                username: FRESHDESK_API_KEY,
                password: 'X'
              },
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });

            const categories = categoriesResponse.data;
            const matchedCategory = categories.find(cat => 
              cat.name && cat.name.toLowerCase() === category.toLowerCase()
            );

            if (matchedCategory && matchedCategory.id) {
              folderId = matchedCategory.id.toString();
              console.error(`✅ Resolved category "${category}" to ID: ${folderId}`);
            } else {
              return {
                isError: true,
                content: [
                  {
                    type: 'text',
                    text: `🔍 **Category Not Found**: "${category}"\n\n💡 **Suggestions**:\n• Check the spelling of the category name\n• Use list_categories to see all available categories\n• Try using the category ID instead of name\n• Make sure the category exists in your Freshdesk instance`
                  }
                ]
              };
            }
          } catch (resolveError) {
            console.error('Category resolution error:', resolveError.message);
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `❌ **Failed to resolve category**: "${category}"\n\n💡 **Suggestions**:\n• Try using the category ID instead of name\n• Use list_categories to see available categories\n• Check your API permissions for categories access`
                }
              ]
            };
          }
        }

        // Get all folders in this category and aggregate articles
        console.error(`🔍 Getting folders for category ${folderId}...`);
        const foldersUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/categories/${folderId}/folders`;
        const foldersResponse = await axios.get(foldersUrl, {
          auth: {
            username: FRESHDESK_API_KEY,
            password: 'X'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const folders = foldersResponse.data;
        console.error(`📁 Found ${folders.length} folders in category`);

        if (!folders || folders.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `📁 Category "${category}" exists but contains no folders.\n\n💡 **Suggestion**: This category might not have any content yet.`
              }
            ]
          };
        }

        // Collect articles from all folders
        let allArticles = [];
        let totalFolderArticles = 0;
        
        for (const folder of folders) {
          try {
            const folderArticlesUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/folders/${folder.id}/articles`;
            const folderArticlesResponse = await axios.get(folderArticlesUrl, {
              auth: {
                username: FRESHDESK_API_KEY,
                password: 'X'
              },
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });

            const folderArticles = folderArticlesResponse.data || [];
            // Add folder info to each article for better context
            folderArticles.forEach(article => {
              article.folder_name = folder.name;
              article.folder_id = folder.id;
            });
            
            allArticles = allArticles.concat(folderArticles);
            totalFolderArticles += folderArticles.length;
            
          } catch (folderError) {
            console.error(`❌ Error getting articles from folder ${folder.name}: ${folderError.message}`);
          }
        }

        console.error(`📊 Collected ${allArticles.length} total articles from ${folders.length} folders`);

        // Apply client-side filtering if query is provided
        if (query) {
          const queryLower = query.toLowerCase();
          allArticles = allArticles.filter(article => {
            const titleMatch = article.title && article.title.toLowerCase().includes(queryLower);
            const descMatch = article.description && article.description.toLowerCase().includes(queryLower);
            const bodyMatch = article.body_text && article.body_text.toLowerCase().includes(queryLower);
            const folderMatch = article.folder_name && article.folder_name.toLowerCase().includes(queryLower);
            return titleMatch || descMatch || bodyMatch || folderMatch;
          });
          console.error(`🔍 Filtered ${totalFolderArticles} articles down to ${allArticles.length} matching "${query}"`);
        }

        // Apply pagination to the collected articles
        const startIndex = (page - 1) * per_page;
        const endIndex = startIndex + per_page;
        const paginatedArticles = allArticles.slice(startIndex, endIndex);
        
        // Create a mock response object for compatibility with existing logic
        response = {
          data: paginatedArticles,
          headers: {
            'x-total-count': allArticles.length,
            'x-total-pages': Math.ceil(allArticles.length / per_page)
          }
        };

        // Set solutions for the category path
        solutions = response.data;
        
      } else {
        // Query-based search: use search endpoint
        searchType = 'query';
        apiUrl = `https://${FRESHDESK_DOMAIN}/api/v2/search/solutions`;
        
        // Check if we need to fetch multiple pages (when per_page > 30)
        if (per_page > 30 && page === 1) {
          console.error(`🔍 Multi-page search for "${query}" - requested ${per_page} results (max 30 per API page)`);
          
          // Initialize arrays to collect all results
          let allSolutions = [];
          let currentPage = 1;
          let totalFetched = 0;
          let hasMorePages = true;
          
          // Fetch pages until we have enough results or reach the end
          while (hasMorePages && totalFetched < per_page) {
            const pageParams = {
              term: query,
              page: currentPage,
              per_page: 30 // Freshdesk API limit per page
            };
            
            console.error(`🔍 Fetching page ${currentPage} for "${query}"`);
            
            try {
              const pageResponse = await axios.get(apiUrl, {
                params: pageParams,
                auth: {
                  username: FRESHDESK_API_KEY,
                  password: 'X'
                },
                headers: {
                  'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout
              });
              
              const pageResults = pageResponse.data;
              
              if (!pageResults || !Array.isArray(pageResults) || pageResults.length === 0) {
                // No more results on this page
                hasMorePages = false;
                console.error(`📄 Page ${currentPage} returned no results - stopping`);
              } else {
                // Add results from this page
                allSolutions = allSolutions.concat(pageResults);
                totalFetched += pageResults.length;
                console.error(`📄 Page ${currentPage} returned ${pageResults.length} results (total: ${totalFetched})`);
                
                // Check if this page returned less than 30 results (indicates last page)
                if (pageResults.length < 30) {
                  hasMorePages = false;
                  console.error(`📄 Page ${currentPage} returned ${pageResults.length} < 30 results - this is the last page`);
                }
                
                currentPage++;
              }
            } catch (pageError) {
              console.error(`❌ Error fetching page ${currentPage}:`, pageError.message);
              hasMorePages = false;
            }
          }
          
          // Create mock response object with aggregated results
          response = {
            data: allSolutions,
            headers: {
              'x-total-count': allSolutions.length,
              'x-total-pages': 1 // We're showing all results on one "virtual" page
            }
          };
          solutions = allSolutions;
          
          console.error(`✅ Multi-page search complete: fetched ${allSolutions.length} total results from ${currentPage - 1} pages`);
          
        } else {
          // Single page request or specific page > 1
        params = {
          term: query, // Note: search endpoint uses 'term' not 'query'
          page: page,
            per_page: Math.min(per_page, 30) // Cap at 30 per Freshdesk API limit
        };
        
        console.error(`🔍 Searching Freshdesk: "${query}" (page: ${page})`);
        
        // Make the API call with proper authentication
        const searchResponse = await axios.get(apiUrl, {
          params: params,
          auth: {
            username: FRESHDESK_API_KEY,
            password: 'X'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });

        // Create response object for compatibility
        response = searchResponse;
        solutions = response.data;
        }
      }

      // Check if we got results
      if (!solutions || !Array.isArray(solutions) || solutions.length === 0) {
        let noResultsText;
        if (searchType === 'category') {
          noResultsText = `📁 No articles found in category "${category}"`;
          if (query) {
            noResultsText += ` matching "${query}"`;
          }
          noResultsText += `.\n\n💡 **Suggestions**:\n• The category may be empty\n• Try a different category\n• Use list_categories to see all available categories`;
        } else {
          noResultsText = `🔍 No articles found for query: "${query}"\n\n💡 **Suggestions**:\n• Try different or broader search terms\n• Check spelling of your query\n• Use list_categories to browse by category`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: noResultsText
            }
          ]
        };
      }

      // Extract pagination info from headers if available
      const totalPages = parseInt(response.headers['x-total-pages']) || 1;
      const totalCount = parseInt(response.headers['x-total-count']) || solutions.length;
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Format the results with pagination info
      let formattedResults;
      
      if (searchType === 'category') {
        formattedResults = `📁 **Category Articles**: ${category}\n`;
        if (query) {
          formattedResults += `🔍 **Filtered by**: "${query}"\n`;
        }
      } else {
        formattedResults = `🔍 **Search Results** for "${query}"\n`;
      }
      
      formattedResults += `📊 **Page ${page} of ${totalPages}** (${solutions.length} articles on this page, ${totalCount} total)\n\n`;
      
      if (solutions.length === 0) {
        formattedResults += `No articles found matching your criteria.\n\n`;
        if (category) {
          formattedResults += `💡 **Suggestions**:\n• Try searching without the category filter\n• Check if the category name/ID is correct\n• Use broader search terms`;
        } else {
          formattedResults += `💡 **Suggestions**:\n• Try different or broader search terms\n• Check spelling of your query\n• Use the list_categories tool to see available categories`;
        }
      } else {
        solutions.forEach((solution, index) => {
          const articleNumber = (page - 1) * per_page + index + 1;
          formattedResults += `${articleNumber}. **${solution.title || 'Untitled'}**\n`;
          
          if (solution.id) {
            formattedResults += `   🆔 Article ID: ${solution.id}\n`;
          }
          
          if (solution.description) {
            // Limit description to first 200 characters
            const description = solution.description.length > 200 
              ? solution.description.substring(0, 200) + '...'
              : solution.description;
            formattedResults += `   📄 ${description}\n`;
          }
          
          // Handle different response formats from different endpoints
          if (searchType === 'category' && solution.url) {
            formattedResults += `   🔗 [View Article](${solution.url})\n`;
          }
          
          // Handle category information from different endpoints
          if (solution.category) {
            if (typeof solution.category === 'object' && solution.category.name) {
              formattedResults += `   📁 Category: ${solution.category.name}\n`;
            } else if (typeof solution.category === 'string') {
              formattedResults += `   📁 Category: ${solution.category}\n`;
            } else if (solution.category.id) {
              formattedResults += `   📁 Category ID: ${solution.category.id}\n`;
            }
          }
          
          // Handle folder information from different endpoints
          if (solution.folder) {
            if (typeof solution.folder === 'object' && solution.folder.name) {
              formattedResults += `   📂 Folder: ${solution.folder.name}\n`;
            } else if (typeof solution.folder === 'string') {
              formattedResults += `   📂 Folder: ${solution.folder}\n`;
            }
          }
          
          // Handle status for folder endpoint
          if (searchType === 'category' && solution.status) {
            const statusText = solution.status === 2 ? 'Published' : 
                              solution.status === 1 ? 'Draft' : 
                              `Status ${solution.status}`;
            formattedResults += `   📋 Status: ${statusText}\n`;
          }
          
          // Show thumbs up/down if available
          if (solution.thumbs_up_count || solution.thumbs_down_count) {
            formattedResults += `   👍 ${solution.thumbs_up_count || 0} | 👎 ${solution.thumbs_down_count || 0}\n`;
          }
          
          // Show dates if available
          if (solution.created_at) {
            formattedResults += `   📅 Created: ${new Date(solution.created_at).toLocaleDateString()}\n`;
          }
          
          if (solution.updated_at && solution.updated_at !== solution.created_at) {
            formattedResults += `   🔄 Updated: ${new Date(solution.updated_at).toLocaleDateString()}\n`;
          }
          
          formattedResults += `   💡 *Use get_article with ID ${solution.id} to view full content*\n\n`;
        });

        // Add pagination navigation hints
        if (hasNextPage || hasPrevPage) {
          formattedResults += `📖 **Navigation**:\n`;
          if (hasPrevPage) {
            formattedResults += `• Previous page: search with page=${page - 1}\n`;
          }
          if (hasNextPage) {
            formattedResults += `• Next page: search with page=${page + 1}\n`;
          }
          formattedResults += `• Total pages: ${totalPages}\n\n`;
        }

        formattedResults += `💡 **Tips**:\n`;
        formattedResults += `• Use get_article with an Article ID to read full content\n`;
        if (!category) {
          formattedResults += `• Add category filter to narrow results\n`;
        }
        formattedResults += `• Use list_categories to see all available categories`;
      }

      const result = {
        content: [
          {
            type: 'text',
            text: formattedResults
          }
        ]
      };

      // Cache the result
      if (cache.searches.size >= cache.MAX_CACHED_SEARCHES) {
        // Remove oldest entry
        const firstKey = cache.searches.keys().next().value;
        cache.searches.delete(firstKey);
      }
      
      cache.searches.set(cacheKey, {
        result: result,
        timestamp: Date.now()
      });
      
      console.error(`✅ Cached search results: ${cacheKey}`);

      return result;

    } catch (error) {
      // Enhanced error logging with context
      console.error('=== Freshdesk Search API Error ===');
      console.error('Query:', query);
      console.error('Domain:', FRESHDESK_DOMAIN);
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Headers:', error.response.headers);
        console.error('Response Data:', error.response.data);
      } else if (error.request) {
        console.error('Request Config:', {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        });
      }
      console.error('Stack Trace:', error.stack);
      console.error('=====================================');
      
      let errorMessage = '🚨 **Failed to search Freshdesk knowledge base**\n\n';
      let suggestions = [];
      
      if (error.response) {
        // API responded with error status
        const status = error.response.status;
        const statusText = error.response.statusText;
        const responseData = error.response.data;
        
        switch (status) {
          case 400:
            errorMessage += '❌ **Bad Request**: The search query format is invalid.';
            suggestions.push('Try simplifying your search query');
            suggestions.push('Remove special characters or very short terms');
            break;
          case 401:
            errorMessage += '🔐 **Authentication Failed**: Your API key is invalid or expired.';
            suggestions.push('Verify your FRESHDESK_API_KEY in the .env file');
            suggestions.push('Check if your API key is active in Freshdesk settings');
            suggestions.push('Ensure you\'re using the correct API key format');
            break;
          case 403:
            errorMessage += '🚫 **Access Forbidden**: Your API key lacks the required permissions.';
            suggestions.push('Contact your Freshdesk administrator');
            suggestions.push('Ensure your API key has "Knowledge Base" permissions');
            suggestions.push('Check if your account has access to the Solutions module');
            break;
          case 404:
            errorMessage += '🔍 **Not Found**: The API endpoint or domain doesn\'t exist.';
            suggestions.push('Verify your FRESHDESK_DOMAIN is correct (format: subdomain.freshdesk.com)');
            suggestions.push('Check if your Freshdesk instance has the Knowledge Base feature enabled');
            break;
          case 429:
            errorMessage += '⏰ **Rate Limit Exceeded**: Too many requests sent too quickly.';
            suggestions.push('Wait 60 seconds before trying again');
            suggestions.push('Reduce the frequency of your searches');
            suggestions.push('Consider implementing request delays in your application');
            if (error.response.headers['retry-after']) {
              const retryAfter = error.response.headers['retry-after'];
              suggestions.push(`Specific retry time: ${retryAfter} seconds`);
            }
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage += '🔧 **Freshdesk Server Error**: The Freshdesk service is experiencing issues.';
            suggestions.push('Try again in a few minutes');
            suggestions.push('Check Freshdesk status page for service disruptions');
            break;
          default:
            errorMessage += `💥 **API Error**: ${status} ${statusText}`;
            suggestions.push('This is an unexpected error code');
            suggestions.push('Contact Freshdesk support if the issue persists');
        }
        
        // Add specific error details if available
        if (responseData) {
          if (responseData.description) {
            errorMessage += `\n\n📋 **Details**: ${responseData.description}`;
          }
          if (responseData.errors && Array.isArray(responseData.errors)) {
            errorMessage += `\n\n📝 **Error Details**:\n${responseData.errors.map(err => `• ${err.message || err}`).join('\n')}`;
          }
        }
      } else if (error.request) {
        // Network error
        if (error.code === 'ENOTFOUND') {
          errorMessage += '🌐 **Domain Not Found**: Cannot resolve the Freshdesk domain.';
          suggestions.push('Check your FRESHDESK_DOMAIN spelling');
          suggestions.push('Ensure your domain is in format: subdomain.freshdesk.com');
          suggestions.push('Verify your internet connection');
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage += '🔌 **Connection Refused**: Cannot connect to Freshdesk servers.';
          suggestions.push('Check your internet connection');
          suggestions.push('Verify firewall settings aren\'t blocking the connection');
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          errorMessage += '⏱️ **Request Timeout**: The request took too long to complete.';
          suggestions.push('Try again with a simpler search query');
          suggestions.push('Check your internet connection speed');
          suggestions.push('Freshdesk might be experiencing slow response times');
        } else {
          errorMessage += '🌐 **Network Error**: Unable to reach Freshdesk servers.';
          suggestions.push('Check your internet connection');
          suggestions.push('Verify your Freshdesk domain is correct');
          suggestions.push('Try again in a few moments');
        }
      } else {
        // Configuration or other errors
        errorMessage += `⚙️ **Configuration Error**: ${error.message}`;
        suggestions.push('Check your environment variables');
        suggestions.push('Ensure all dependencies are installed');
        suggestions.push('Verify your .env file configuration');
      }
      
      // Add suggestions to the error message
      if (suggestions.length > 0) {
        errorMessage += '\n\n💡 **Suggestions**:\n' + suggestions.map(s => `• ${s}`).join('\n');
      }
      
      // Add query context for debugging
      errorMessage += `\n\n🔍 **Your Query**: "${query}"`;
      errorMessage += `\n📅 **Time**: ${new Date().toISOString()}`;

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ]
      };
    }
  }
);

// Add the get article tool
server.tool(
  'get_article',
  'Get full content of a specific Freshdesk knowledge base article',
  {
    article_id: z.string().describe('The ID of the knowledge base article to retrieve')
  },
  async ({ article_id }) => {
    try {
      // Construct the Freshdesk API URL for specific article
      const apiUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/articles/${article_id}`;
      
      // Make the API call with proper authentication
      const response = await axios.get(apiUrl, {
        auth: {
          username: FRESHDESK_API_KEY,
          password: 'X'
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      const article = response.data;

      // Check if we got a valid article
      if (!article) {
        return {
          content: [
            {
              type: 'text',
              text: `No article found with ID: ${article_id}`
            }
          ]
        };
      }

      // Format the article content
      let formattedArticle = '';
      
      // Title
      if (article.title) {
        formattedArticle += `# ${article.title}\n\n`;
      }
      
      // Article metadata
      if (article.id) {
        formattedArticle += `**Article ID:** ${article.id}\n`;
      }
      
      if (article.status) {
        formattedArticle += `**Status:** ${article.status}\n`;
      }
      
      if (article.category) {
        const categoryName = article.category.name || article.category;
        formattedArticle += `**Category:** ${categoryName}\n`;
      }
      
      if (article.folder) {
        const folderName = article.folder.name || article.folder;
        formattedArticle += `**Folder:** ${folderName}\n`;
      }
      
      if (article.tags && article.tags.length > 0) {
        formattedArticle += `**Tags:** ${article.tags.join(', ')}\n`;
      }
      
      if (article.created_at) {
        const createdDate = new Date(article.created_at).toLocaleDateString();
        formattedArticle += `**Created:** ${createdDate}\n`;
      }
      
      if (article.updated_at) {
        const updatedDate = new Date(article.updated_at).toLocaleDateString();
        formattedArticle += `**Last Updated:** ${updatedDate}\n`;
      }
      
      formattedArticle += '\n---\n\n';
      
      // Description
      if (article.description) {
        formattedArticle += `**Description:**\n${article.description}\n\n`;
      }
      
      // Main content/body
      if (article.description_text) {
        formattedArticle += `**Content:**\n${article.description_text}\n\n`;
      } else if (article.body) {
        // Some APIs might return body instead of description_text
        formattedArticle += `**Content:**\n${article.body}\n\n`;
      }
      
      // Article URL if available
      if (article.url) {
        formattedArticle += `🔗 **[View Original Article](${article.url})**\n`;
      }

      // If no content found, add a note
      if (!article.description && !article.description_text && !article.body) {
        formattedArticle += '*No detailed content available for this article.*\n';
      }

      return {
        content: [
          {
            type: 'text',
            text: formattedArticle
          }
        ]
      };

    } catch (error) {
      // Enhanced error logging with context
      console.error('=== Freshdesk Get Article API Error ===');
      console.error('Article ID:', article_id);
      console.error('Domain:', FRESHDESK_DOMAIN);
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Headers:', error.response.headers);
        console.error('Response Data:', error.response.data);
      } else if (error.request) {
        console.error('Request Config:', {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        });
      }
      console.error('Stack Trace:', error.stack);
      console.error('=====================================');
      
      let errorMessage = `🚨 **Failed to retrieve article "${article_id}"**\n\n`;
      let suggestions = [];
      
      if (error.response) {
        // API responded with error status
        const status = error.response.status;
        const statusText = error.response.statusText;
        const responseData = error.response.data;
        
        switch (status) {
          case 400:
            errorMessage += '❌ **Bad Request**: The article ID format is invalid.';
            suggestions.push('Ensure the article ID contains only numbers');
            suggestions.push('Check if the article ID was copied correctly');
            suggestions.push('Article IDs are typically numeric (e.g., 12345)');
            break;
          case 401:
            errorMessage += '🔐 **Authentication Failed**: Your API key is invalid or expired.';
            suggestions.push('Verify your FRESHDESK_API_KEY in the .env file');
            suggestions.push('Check if your API key is active in Freshdesk settings');
            suggestions.push('Ensure you\'re using the correct API key format');
            break;
          case 403:
            errorMessage += '🚫 **Access Forbidden**: Your API key lacks the required permissions.';
            suggestions.push('Contact your Freshdesk administrator');
            suggestions.push('Ensure your API key has "Knowledge Base" permissions');
            suggestions.push('Check if your account has access to the Solutions module');
            suggestions.push('Verify you have permission to view this specific article');
            break;
          case 404:
            errorMessage += '🔍 **Article Not Found**: No article exists with this ID.';
            suggestions.push('Double-check the article ID is correct');
            suggestions.push('The article might have been deleted or moved');
            suggestions.push('Try searching for the article first to get the correct ID');
            suggestions.push('Check if the article is published (unpublished articles may not be accessible)');
            break;
          case 429:
            errorMessage += '⏰ **Rate Limit Exceeded**: Too many requests sent too quickly.';
            suggestions.push('Wait 60 seconds before trying again');
            suggestions.push('Reduce the frequency of your article requests');
            suggestions.push('Consider implementing request delays in your application');
            if (error.response.headers['retry-after']) {
              const retryAfter = error.response.headers['retry-after'];
              suggestions.push(`Specific retry time: ${retryAfter} seconds`);
            }
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage += '🔧 **Freshdesk Server Error**: The Freshdesk service is experiencing issues.';
            suggestions.push('Try again in a few minutes');
            suggestions.push('Check Freshdesk status page for service disruptions');
            suggestions.push('The article data might be temporarily unavailable');
            break;
          default:
            errorMessage += `💥 **API Error**: ${status} ${statusText}`;
            suggestions.push('This is an unexpected error code');
            suggestions.push('Contact Freshdesk support if the issue persists');
        }
        
        // Add specific error details if available
        if (responseData) {
          if (responseData.description) {
            errorMessage += `\n\n📋 **Details**: ${responseData.description}`;
          }
          if (responseData.errors && Array.isArray(responseData.errors)) {
            errorMessage += `\n\n📝 **Error Details**:\n${responseData.errors.map(err => `• ${err.message || err}`).join('\n')}`;
          }
        }
      } else if (error.request) {
        // Network error
        if (error.code === 'ENOTFOUND') {
          errorMessage += '🌐 **Domain Not Found**: Cannot resolve the Freshdesk domain.';
          suggestions.push('Check your FRESHDESK_DOMAIN spelling');
          suggestions.push('Ensure your domain is in format: subdomain.freshdesk.com');
          suggestions.push('Verify your internet connection');
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage += '🔌 **Connection Refused**: Cannot connect to Freshdesk servers.';
          suggestions.push('Check your internet connection');
          suggestions.push('Verify firewall settings aren\'t blocking the connection');
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          errorMessage += '⏱️ **Request Timeout**: The request took too long to complete.';
          suggestions.push('Try again in a moment');
          suggestions.push('Check your internet connection speed');
          suggestions.push('Freshdesk might be experiencing slow response times');
          suggestions.push('Large articles may take longer to load');
        } else {
          errorMessage += '🌐 **Network Error**: Unable to reach Freshdesk servers.';
          suggestions.push('Check your internet connection');
          suggestions.push('Verify your Freshdesk domain is correct');
          suggestions.push('Try again in a few moments');
        }
      } else {
        // Configuration or other errors
        errorMessage += `⚙️ **Configuration Error**: ${error.message}`;
        suggestions.push('Check your environment variables');
        suggestions.push('Ensure all dependencies are installed');
        suggestions.push('Verify your .env file configuration');
      }
      
      // Add suggestions to the error message
      if (suggestions.length > 0) {
        errorMessage += '\n\n💡 **Suggestions**:\n' + suggestions.map(s => `• ${s}`).join('\n');
      }
      
      // Add context for debugging
      errorMessage += `\n\n🆔 **Article ID**: "${article_id}"`;
      errorMessage += `\n📅 **Time**: ${new Date().toISOString()}`;
      errorMessage += `\n🔗 **Attempted URL**: https://${FRESHDESK_DOMAIN}/api/v2/solutions/articles/${article_id}`;

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ]
      };
    }
  }
);

// Add the create article tool
server.tool(
  'create_article',
  'Create a new article in Freshdesk knowledge base with all required fields',
  {
    title: z.string().describe('Title of the article'),
    description: z.string().describe('HTML content/body of the article'),
    folder_id: z.number().describe('Folder ID where the article should be created'),
    tags: z.array(z.string()).optional().default([]).describe('Array of tags for the article'),
    seo_title: z.string().optional().describe('Title for search engine (SEO title)'),
    meta_description: z.string().optional().describe('Description for search engine (meta description)'),
    status: z.number().optional().default(1).describe('Article status: 1 for draft, 2 for published')
  },
  async ({ title, description, folder_id, tags = [], seo_title, meta_description, status = 1 }) => {
    try {
      // Validate status
      if (![1, 2].includes(status)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: '❌ **Invalid Status**: Status must be 1 (draft) or 2 (published).'
            }
          ]
        };
      }

      // Construct the request body according to Freshdesk API v2 format
      const requestBody = {
        title: title,
        description: description,
        folder_id: folder_id,
        tags: tags,
        status: status
      };

      // Add SEO data if provided
      if (seo_title || meta_description) {
        requestBody.seo = {};
        if (seo_title) {
          requestBody.seo.title = seo_title;
        }
        if (meta_description) {
          requestBody.seo.meta_description = meta_description;
        }
      }

      console.error('🔨 Creating article in Freshdesk...');
      console.error('📝 Title:', title);
      console.error('📁 Folder ID:', folder_id);
      console.error('📊 Status:', status === 1 ? 'Draft' : 'Published');

      // Construct the Freshdesk API URL for creating articles
      const apiUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/articles`;
      
      // Make the API call with proper authentication
      const response = await axios.post(apiUrl, requestBody, {
        auth: {
          username: FRESHDESK_API_KEY,
          password: 'X'
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout for creation
      });

      const createdArticle = response.data;

      // Check if we got a valid response
      if (!createdArticle || !createdArticle.id) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: '🚨 **Article Creation Failed**: No valid response received from Freshdesk API.'
            }
          ]
        };
      }

      console.error(`✅ Article created successfully with ID: ${createdArticle.id}`);

      // Format the success response
      let successMessage = `✅ **Article Created Successfully!**\n\n`;
      successMessage += `🆔 **Article ID**: ${createdArticle.id}\n`;
      successMessage += `📝 **Title**: ${createdArticle.title || title}\n`;
      successMessage += `📁 **Folder ID**: ${createdArticle.folder_id || folder_id}\n`;
      successMessage += `📊 **Status**: ${createdArticle.status === 1 ? 'Draft' : createdArticle.status === 2 ? 'Published' : `Status ${createdArticle.status}`}\n`;
      
      if (createdArticle.tags && createdArticle.tags.length > 0) {
        successMessage += `🏷️ **Tags**: ${createdArticle.tags.join(', ')}\n`;
      }
      
      if (createdArticle.seo) {
        if (createdArticle.seo.title) {
          successMessage += `🔍 **SEO Title**: ${createdArticle.seo.title}\n`;
        }
        if (createdArticle.seo.meta_description) {
          successMessage += `📄 **Meta Description**: ${createdArticle.seo.meta_description}\n`;
        }
      }
      
      if (createdArticle.created_at) {
        const createdDate = new Date(createdArticle.created_at).toLocaleString();
        successMessage += `📅 **Created**: ${createdDate}\n`;
      }
      
      if (createdArticle.url) {
        successMessage += `🔗 **View Article**: ${createdArticle.url}\n`;
      }

      successMessage += `\n💡 **Next Steps**:\n`;
      successMessage += `• Use get_article with ID ${createdArticle.id} to view the full article\n`;
      successMessage += `• The article is currently in ${createdArticle.status === 1 ? 'draft' : 'published'} status\n`;
      if (createdArticle.status === 1) {
        successMessage += `• Publish the article by updating its status to 2 when ready`;
      }

      return {
        content: [
          {
            type: 'text',
            text: successMessage
          }
        ]
      };

    } catch (error) {
      // Enhanced error logging with context
      console.error('=== Freshdesk Create Article API Error ===');
      console.error('Title:', title);
      console.error('Folder ID:', folder_id);
      console.error('Domain:', FRESHDESK_DOMAIN);
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Headers:', error.response.headers);
        console.error('Response Data:', error.response.data);
      } else if (error.request) {
        console.error('Request Config:', {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        });
      }
      console.error('Stack Trace:', error.stack);
      console.error('=====================================');
      
      let errorMessage = `🚨 **Failed to create article "${title}"**\n\n`;
      let suggestions = [];
      
      if (error.response) {
        // API responded with error status
        const status = error.response.status;
        const statusText = error.response.statusText;
        const responseData = error.response.data;
        
        switch (status) {
          case 400:
            errorMessage += '❌ **Bad Request**: The article data format is invalid.';
            suggestions.push('Check that folder_id is a valid number');
            suggestions.push('Ensure title and description are not empty');
            suggestions.push('Verify that tags is an array of strings');
            suggestions.push('Check if status is 1 (draft) or 2 (published)');
            break;
          case 401:
            errorMessage += '🔐 **Authentication Failed**: Your API key is invalid or expired.';
            suggestions.push('Verify your FRESHDESK_API_KEY in the .env file');
            suggestions.push('Check if your API key is active in Freshdesk settings');
            suggestions.push('Ensure you\'re using the correct API key format');
            break;
          case 403:
            errorMessage += '🚫 **Access Forbidden**: Your API key lacks the required permissions.';
            suggestions.push('Contact your Freshdesk administrator');
            suggestions.push('Ensure your API key has "Knowledge Base" write permissions');
            suggestions.push('Check if your account has permission to create articles');
            suggestions.push('Verify you have access to the specified folder');
            break;
          case 404:
            errorMessage += '🔍 **Not Found**: The specified folder or endpoint doesn\'t exist.';
            suggestions.push('Verify the folder_id exists and is correct');
            suggestions.push('Check if the folder is in an accessible category');
            suggestions.push('Use list_categories to find valid folder IDs');
            break;
          case 422:
            errorMessage += '📝 **Validation Error**: The article data failed validation.';
            suggestions.push('Check that all required fields are provided');
            suggestions.push('Ensure folder_id points to an existing folder');
            suggestions.push('Verify title and description are not empty');
            suggestions.push('Check that tags contains valid string values');
            break;
          case 429:
            errorMessage += '⏰ **Rate Limit Exceeded**: Too many requests sent too quickly.';
            suggestions.push('Wait 60 seconds before trying again');
            suggestions.push('Reduce the frequency of your article creation requests');
            suggestions.push('Consider implementing request delays in your application');
            if (error.response.headers['retry-after']) {
              const retryAfter = error.response.headers['retry-after'];
              suggestions.push(`Specific retry time: ${retryAfter} seconds`);
            }
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage += '🔧 **Freshdesk Server Error**: The Freshdesk service is experiencing issues.';
            suggestions.push('Try again in a few minutes');
            suggestions.push('Check Freshdesk status page for service disruptions');
            suggestions.push('The article creation service might be temporarily unavailable');
            break;
          default:
            errorMessage += `💥 **API Error**: ${status} ${statusText}`;
            suggestions.push('This is an unexpected error code');
            suggestions.push('Contact Freshdesk support if the issue persists');
        }
        
        // Add specific error details if available
        if (responseData) {
          if (responseData.description) {
            errorMessage += `\n\n📋 **Details**: ${responseData.description}`;
          }
          if (responseData.errors && Array.isArray(responseData.errors)) {
            errorMessage += `\n\n📝 **Validation Errors**:\n${responseData.errors.map(err => `• ${err.message || err.field || err}`).join('\n')}`;
          }
        }
      } else if (error.request) {
        // Network error
        if (error.code === 'ENOTFOUND') {
          errorMessage += '🌐 **Domain Not Found**: Cannot resolve the Freshdesk domain.';
          suggestions.push('Check your FRESHDESK_DOMAIN spelling');
          suggestions.push('Ensure your domain is in format: subdomain.freshdesk.com');
          suggestions.push('Verify your internet connection');
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage += '🔌 **Connection Refused**: Cannot connect to Freshdesk servers.';
          suggestions.push('Check your internet connection');
          suggestions.push('Verify firewall settings aren\'t blocking the connection');
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          errorMessage += '⏱️ **Request Timeout**: The request took too long to complete.';
          suggestions.push('Try again in a moment');
          suggestions.push('Check your internet connection speed');
          suggestions.push('Freshdesk might be experiencing slow response times');
          suggestions.push('Article creation can take longer than other operations');
        } else {
          errorMessage += '🌐 **Network Error**: Unable to reach Freshdesk servers.';
          suggestions.push('Check your internet connection');
          suggestions.push('Verify your Freshdesk domain is correct');
          suggestions.push('Try again in a few moments');
        }
      } else {
        // Configuration or other errors
        errorMessage += `⚙️ **Configuration Error**: ${error.message}`;
        suggestions.push('Check your environment variables');
        suggestions.push('Ensure all dependencies are installed');
        suggestions.push('Verify your .env file configuration');
      }
      
      // Add suggestions to the error message
      if (suggestions.length > 0) {
        errorMessage += '\n\n💡 **Suggestions**:\n' + suggestions.map(s => `• ${s}`).join('\n');
      }
      
      // Add context for debugging
      errorMessage += `\n\n📝 **Article Details**:`;
      errorMessage += `\n• Title: "${title}"`;
      errorMessage += `\n• Folder ID: ${folder_id}`;
      errorMessage += `\n• Status: ${status} (${status === 1 ? 'Draft' : status === 2 ? 'Published' : 'Unknown'})`;
      errorMessage += `\n• Tags: [${tags.join(', ')}]`;
      if (seo_title) errorMessage += `\n• SEO Title: "${seo_title}"`;
      if (meta_description) errorMessage += `\n• Meta Description: "${meta_description}"`;
      errorMessage += `\n📅 **Time**: ${new Date().toISOString()}`;
      errorMessage += `\n🔗 **Attempted URL**: https://${FRESHDESK_DOMAIN}/api/v2/solutions/articles`;

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ]
      };
    }
  }
);

// Add a tool to list folders in a specific category (helpful for getting folder_id for article creation)
server.tool(
  'list_folders',
  'List all folders in a specific category to find folder IDs for article creation',
  {
    category_id: z.number().describe('The category ID to list folders from')
  },
  async ({ category_id }) => {
    try {
      console.error(`🔍 Getting folders for category ${category_id}...`);
      
      // Construct the Freshdesk API URL for folders in category
      const apiUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/categories/${category_id}/folders`;
      
      // Make the API call with proper authentication
      const response = await axios.get(apiUrl, {
        auth: {
          username: FRESHDESK_API_KEY,
          password: 'X'
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      const folders = response.data;

      // Check if we got results
      if (!folders || !Array.isArray(folders) || folders.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `📁 **No folders found in category ${category_id}**\n\n💡 **Suggestions**:\n• Verify the category ID is correct\n• Check if the category exists and has folders\n• Use list_categories to see all available categories`
            }
          ]
        };
      }

      // Format the folders list
      let formattedFolders = `📁 **Folders in Category ${category_id}** (${folders.length} total)\n\n`;
      
      folders.forEach((folder, index) => {
        formattedFolders += `${index + 1}. **${folder.name || 'Unnamed Folder'}**\n`;
        formattedFolders += `   🆔 **Folder ID**: ${folder.id} ⭐ *Use this ID for article creation*\n`;
        
        if (folder.description) {
          formattedFolders += `   📝 Description: ${folder.description}\n`;
        }
        
        if (folder.visibility) {
          formattedFolders += `   👁️ Visibility: ${folder.visibility}\n`;
        }
        
        if (folder.created_at) {
          const createdDate = new Date(folder.created_at).toLocaleDateString();
          formattedFolders += `   📅 Created: ${createdDate}\n`;
        }
        
        formattedFolders += '\n';
      });

      formattedFolders += `💡 **Usage**: Use the Folder ID in create_article tool to specify where your new article should be created.`;

      return {
        content: [
          {
            type: 'text',
            text: formattedFolders
          }
        ]
      };

    } catch (error) {
      console.error('=== Freshdesk List Folders API Error ===');
      console.error('Category ID:', category_id);
      console.error('Error Message:', error.message);
      
      let errorMessage = `🚨 **Failed to list folders for category ${category_id}**\n\n`;
      let suggestions = [];
      
      if (error.response) {
        const status = error.response.status;
        
        switch (status) {
          case 401:
            errorMessage += '🔐 **Authentication Failed**: Your API key is invalid or expired.';
            break;
          case 403:
            errorMessage += '🚫 **Access Forbidden**: Your API key lacks the required permissions.';
            break;
          case 404:
            errorMessage += '🔍 **Category Not Found**: No category exists with this ID.';
            suggestions.push('Verify the category ID is correct');
            suggestions.push('Use list_categories to see all available categories');
            break;
          default:
            errorMessage += `💥 **API Error**: ${status} ${error.response.statusText}`;
        }
      } else {
        errorMessage += `⚙️ **Error**: ${error.message}`;
      }
      
      if (suggestions.length > 0) {
        errorMessage += '\n\n💡 **Suggestions**:\n' + suggestions.map(s => `• ${s}`).join('\n');
      }

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ]
      };
    }
  }
);

// Add a tool to list ALL folders from ALL categories (for article editor dropdown)
server.tool(
  'list_all_folders',
  'List all folders from all categories in the knowledge base (for frontend dropdown)',
  {},
  async () => {
    try {
      console.error(`🔍 Getting all folders from all categories...`);
      
      // First, get all categories
      const categoriesUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/categories`;
      const categoriesResponse = await axios.get(categoriesUrl, {
        auth: {
          username: FRESHDESK_API_KEY,
          password: 'X'
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const categories = categoriesResponse.data;
      
      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No categories found in your Freshdesk knowledge base.'
            }
          ]
        };
      }

      console.error(`📁 Found ${categories.length} categories, getting folders...`);

      // Get folders for each category
      const allFolders = [];
      let totalFolderCount = 0;

      for (const category of categories) {
        try {
          const foldersUrl = `https://${FRESHDESK_DOMAIN}/api/v2/solutions/categories/${category.id}/folders`;
          const foldersResponse = await axios.get(foldersUrl, {
            auth: {
              username: FRESHDESK_API_KEY,
              password: 'X'
            },
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          const folders = foldersResponse.data || [];
          
          // Add category information to each folder
          folders.forEach(folder => {
            folder.category_id = category.id;
            folder.category_name = category.name;
            // Handle parent folder relationships if they exist
            if (folder.parent_folder_id && folder.parent_folder_id !== folder.id) {
              folder.is_child = true;
            } else {
              folder.is_child = false;
            }
          });

          allFolders.push(...folders);
          totalFolderCount += folders.length;
          
          console.error(`📂 Category "${category.name}": ${folders.length} folders`);
          
        } catch (folderError) {
          console.error(`❌ Error getting folders for category ${category.name}: ${folderError.message}`);
          // Continue with other categories even if one fails
        }
      }

      console.error(`✅ Retrieved ${totalFolderCount} total folders from ${categories.length} categories`);

      // Return structured data for frontend consumption
      const result = {
        success: true,
        total_folders: totalFolderCount,
        total_categories: categories.length,
        folders: allFolders.map(folder => ({
          id: folder.id,
          name: folder.name,
          description: folder.description || null,
          category_id: folder.category_id,
          category_name: folder.category_name,
          parent_folder_id: folder.parent_folder_id || null,
          is_child: folder.is_child || false,
          visibility: folder.visibility || null,
          created_at: folder.created_at || null,
          updated_at: folder.updated_at || null
        })),
        categories: categories.map(category => ({
          id: category.id,
          name: category.name,
          description: category.description || null
        }))
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('=== Freshdesk List All Folders API Error ===');
      console.error('Error Message:', error.message);
      
      let errorMessage = `🚨 **Failed to list all folders**\n\n`;
      let suggestions = [];
      
      if (error.response) {
        const status = error.response.status;
        
        switch (status) {
          case 401:
            errorMessage += '🔐 **Authentication Failed**: Your API key is invalid or expired.';
            suggestions.push('Verify your FRESHDESK_API_KEY in the .env file');
            break;
          case 403:
            errorMessage += '🚫 **Access Forbidden**: Your API key lacks the required permissions.';
            suggestions.push('Ensure your API key has "Knowledge Base" permissions');
            suggestions.push('Contact your Freshdesk administrator for access');
            break;
          case 404:
            errorMessage += '🔍 **Not Found**: Categories endpoint not found.';
            suggestions.push('Verify your FRESHDESK_DOMAIN is correct');
            suggestions.push('Check if your Freshdesk instance has Knowledge Base enabled');
            break;
          case 429:
            errorMessage += '⏰ **Rate Limit Exceeded**: Too many requests sent too quickly.';
            suggestions.push('Wait 60 seconds before trying again');
            break;
          default:
            errorMessage += `💥 **API Error**: ${status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage += '🌐 **Network Error**: Unable to reach Freshdesk servers.';
        suggestions.push('Check your internet connection');
      } else {
        errorMessage += `⚙️ **Configuration Error**: ${error.message}`;
      }
      
      if (suggestions.length > 0) {
        errorMessage += '\n\n💡 **Suggestions**:\n' + suggestions.map(s => `• ${s}`).join('\n');
      }

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ]
      };
    }
  }
);

// Add cache status tool for debugging
server.tool(
  'cache_status',
  'Show cache status and statistics (for debugging)',
  {},
  async () => {
    const searchCacheSize = cache.searches.size;
    const categoriesCached = cache.categories ? 'Yes' : 'No';
    const categoriesAge = cache.categoriesExpiry ? 
      Math.round((Date.now() - cache.categoriesExpiry) / 1000) : 'N/A';
    
    let cacheInfo = `📊 **Cache Status**\n\n`;
    cacheInfo += `🔍 **Search Cache**:\n`;
    cacheInfo += `• Cached searches: ${searchCacheSize}/${cache.MAX_CACHED_SEARCHES}\n`;
    cacheInfo += `• Cache duration: ${cache.CACHE_DURATION / 1000} seconds\n\n`;
    
    cacheInfo += `📁 **Categories Cache**:\n`;
    cacheInfo += `• Categories cached: ${categoriesCached}\n`;
    if (cache.categoriesExpiry) {
      cacheInfo += `• Cache age: ${categoriesAge} seconds\n`;
      cacheInfo += `• Valid: ${isCacheValid(cache.categoriesExpiry) ? 'Yes' : 'No'}\n`;
    }
    
    if (searchCacheSize > 0) {
      cacheInfo += `\n🗂️ **Cached Searches**:\n`;
      const entries = Array.from(cache.searches.entries())
        .sort(([,a], [,b]) => b.timestamp - a.timestamp)
        .slice(0, 5); // Show latest 5
      
      entries.forEach(([key, entry], index) => {
        const age = Math.round((Date.now() - entry.timestamp) / 1000);
        const valid = isCacheValid(entry.timestamp) ? '✅' : '❌';
        cacheInfo += `${index + 1}. ${key} (${age}s ago) ${valid}\n`;
      });
      
      if (searchCacheSize > 5) {
        cacheInfo += `... and ${searchCacheSize - 5} more\n`;
      }
    }
    
    cacheInfo += `\n💡 **Cache automatically expires after ${cache.CACHE_DURATION / 60000} minutes**`;

    return {
      content: [
        {
          type: 'text',
          text: cacheInfo
        }
      ]
    };
  }
);

// Set up error handling
process.on('SIGINT', async () => {
  process.exit(0);
});

// Start the server
async function main() {
  try {
    // Validate configuration before starting
    console.error('🚀 Starting Freshdesk Knowledge Base MCP Server...');
    console.error(`📡 Domain: ${FRESHDESK_DOMAIN}`);
    console.error(`🔑 API Key: ${FRESHDESK_API_KEY ? '***' + FRESHDESK_API_KEY.slice(-4) : 'NOT SET'}`);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('✅ Freshdesk Knowledge Base MCP Server running on stdio');
    console.error('🔧 Available tools: search_knowledge_base, get_article, list_categories, create_article, list_folders, list_all_folders, cache_status');
    console.error('🚀 New features: category filtering, pagination, result caching, article creation, all folders listing');
    console.error('📖 Ready to serve Freshdesk knowledge base requests');
    
  } catch (error) {
    console.error('=== Server Startup Error ===');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('============================');
    
    if (error.message.includes('EADDRINUSE')) {
      console.error('🚨 Port already in use. Another instance may be running.');
    } else if (error.message.includes('permission')) {
      console.error('🚨 Permission denied. Check file permissions.');
    } else {
      console.error('🚨 Unexpected startup error. Check configuration.');
    }
    
    throw error;
  }
}

// Enhanced error handling for unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('=== Unhandled Promise Rejection ===');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('Stack:', reason?.stack);
  console.error('==================================');
});

process.on('uncaughtException', (error) => {
  console.error('=== Uncaught Exception ===');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('=========================');
  process.exit(1);
});

main().catch((error) => {
  console.error('💥 Failed to start server:', error.message);
  console.error('🔍 Check your configuration and try again');
  process.exit(1);
}); 