# ArticleEditor Component

A comprehensive article editor component for creating and editing knowledge base articles with rich text editing capabilities, draft saving, and Freshdesk integration.

## Features

### Rich Text Editing
- **Tiptap Editor**: Modern WYSIWYG editor with extensible functionality
- **Formatting Options**: Bold, italic, highlight, headings, lists
- **Media Support**: Links and images with custom styling
- **Live Preview**: Toggle between edit and preview modes
- **Keyboard Shortcuts**: Standard text editing shortcuts

### Knowledge Base Integration
- **Category Management**: Dropdown selection from Freshdesk categories
- **Subcategory Support**: Dynamic subcategory loading based on selected category
- **Tag System**: Comma-separated tag input for article organization
- **Freshdesk Publishing**: Direct publishing to Freshdesk knowledge base via MCP server

### Draft Management
- **Auto-save**: Automatic draft saving every 3 seconds of inactivity
- **Manual Save**: Explicit save draft functionality
- **Session Persistence**: Drafts saved to Supabase with user association
- **Draft Loading**: Load existing drafts for continued editing

## Usage

Visit `/article-editor` in your application to test the component with sample data.

## Files Created

1. `frontend/src/components/ArticleEditor.jsx` - Main component
2. `frontend/src/pages/ArticleEditorPage.jsx` - Demo page
3. `frontend/src/services/api.js` - Updated with createArticle function
4. `backend/routes/articles.js` - Added create endpoint
5. `backend/services/mcp-client.js` - Added createArticle method
6. `supabase/migrations/001_create_article_drafts.sql` - Database schema
7. `frontend/src/index.css` - Added Tiptap editor styles

## Dependencies Added

- @tiptap/react
- @tiptap/pm
- @tiptap/starter-kit
- @tiptap/extension-image
- @tiptap/extension-link
- @tiptap/extension-text-align
- @tiptap/extension-highlight

## Integration Points

The ArticleEditor integrates with:
- Supabase for draft storage
- Freshdesk MCP server for publishing
- Your existing authentication system
- Your existing API service layer
- Your existing component styling patterns