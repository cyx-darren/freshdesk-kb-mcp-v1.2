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

### Context Preservation
- **Original Question**: Display of the original user question that prompted the article
- **AI Response**: Reference to the AI-generated response for context
- **Metadata Tracking**: Preservation of conversation context and timestamps

### User Experience
- **Responsive Design**: Works on desktop and mobile devices
- **Loading States**: Visual feedback during save and publish operations
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Accessibility**: Keyboard navigation and screen reader support

## Props

```jsx
<ArticleEditor
  isOpen={boolean}              // Controls modal visibility
  onClose={function}            // Callback when modal is closed
  originalQuestion={string}     // The original user question (optional)
  aiResponse={string}          // The AI-generated response HTML (optional)
  initialDraft={object}        // Existing draft data for editing (optional)
/>
```

### initialDraft Object Structure
```javascript
{
  id: 'draft-123',
  title: 'Article Title',
  content: '<p>Article content HTML</p>',
  category: 'category-id',
  subcategory: 'subcategory-id',
  tags: 'tag1, tag2, tag3',
  updated_at: '2023-12-01T10:00:00Z'
}
```

## Usage Examples

### Basic Usage
```jsx
import ArticleEditor from '../components/ArticleEditor.jsx'

function MyComponent() {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  
  return (
    <>
      <button onClick={() => setIsEditorOpen(true)}>
        Create Article
      </button>
      
      <ArticleEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />
    </>
  )
}
```

### With Context Data
```jsx
<ArticleEditor
  isOpen={isEditorOpen}
  onClose={() => setIsEditorOpen(false)}
  originalQuestion="What is the MOQ for lanyards?"
  aiResponse="<p>The minimum order quantity varies...</p>"
/>
```

### Editing Existing Draft
```jsx
<ArticleEditor
  isOpen={isEditorOpen}
  onClose={() => setIsEditorOpen(false)}
  originalQuestion="What is the MOQ for lanyards?"
  aiResponse="<p>The minimum order quantity varies...</p>"
  initialDraft={{
    id: 'draft-123',
    title: 'Lanyard MOQ Guidelines',
    content: '<p>Updated content...</p>',
    category: 'products',
    subcategory: 'lanyards',
    tags: 'MOQ, lanyards, minimum order'
  }}
/>
```

## Database Schema

The component requires a `article_drafts` table in Supabase:

```sql
CREATE TABLE article_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  original_question TEXT,
  ai_response TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  freshdesk_id TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Dependencies

### Required API Endpoints
- `GET /api/articles/categories` - Fetch available categories
- `POST /api/articles/create` - Create article in Freshdesk

### MCP Server Functions
- `list_categories` - Get Freshdesk categories
- `create_article` - Create article in Freshdesk knowledge base

## Styling

The component uses Tailwind CSS classes and custom CSS for the Tiptap editor. Key styling features:

- **Modal Design**: Full-screen modal with backdrop
- **Three-panel Layout**: Context sidebar, editor/preview main area
- **Responsive**: Adapts to different screen sizes
- **Professional UI**: Consistent with existing app design

## Keyboard Shortcuts

- **Escape**: Close editor (if not saving/publishing)
- **Ctrl/Cmd + B**: Bold text
- **Ctrl/Cmd + I**: Italic text
- **Ctrl/Cmd + S**: Save draft (when implemented)

## Error Handling

The component handles various error scenarios:

- **Network Errors**: Connection issues with backend
- **Validation Errors**: Missing required fields
- **MCP Errors**: Freshdesk API issues
- **Supabase Errors**: Database operation failures

## Performance Considerations

- **Auto-save Debouncing**: 3-second delay to prevent excessive saves
- **Lazy Loading**: Categories loaded only when editor opens
- **Memory Management**: Proper cleanup of event listeners and timers
- **Optimistic Updates**: Immediate UI feedback for better UX

## Integration with Chat

The ArticleEditor is designed to integrate seamlessly with chat conversations:

1. User asks a question in chat
2. AI provides a comprehensive response
3. User clicks "Create Article" button
4. ArticleEditor opens with question and response pre-filled
5. User edits, categorizes, and publishes the article

This workflow transforms chat conversations into structured knowledge base content.