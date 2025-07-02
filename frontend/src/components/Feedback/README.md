# AI Response Feedback Components

This directory contains components for collecting and managing user feedback on AI responses.

## Components

### `AiResponseFeedback.jsx`

The main feedback component that provides three feedback buttons for users to rate AI responses.

#### Props

- `question` (string, required): The original user question
- `aiResponse` (string, required): The AI-generated response to be rated
- `className` (string, optional): Additional CSS classes for styling
- `onFeedbackSubmitted` (function, optional): Callback called when feedback is submitted
- `showLabels` (boolean, optional): Whether to show button labels. Default: `true`

#### Features

- ✅ Green checkmark button for correct responses
- ❌ Red X button for incorrect responses  
- 😐 Yellow emoji button for responses that need improvement
- Comment form for incorrect/needs improvement feedback
- Automatic Supabase integration via `useFeedback` hook
- Session tracking for anonymous users
- Loading states and error handling
- Success confirmation messages

#### Usage

```jsx
import { AiResponseFeedback } from '../components/Feedback'

function MyComponent() {
  const handleFeedbackSubmitted = (feedbackData, feedbackType) => {
    console.log('Feedback submitted:', { feedbackData, feedbackType })
  }

  return (
    <AiResponseFeedback
      question="How do I reset my password?"
      aiResponse="To reset your password, click on the forgot password link..."
      onFeedbackSubmitted={handleFeedbackSubmitted}
      showLabels={true}
      className="mt-4"
    />
  )
}
```

### `ChatMessageWithFeedback.jsx`

An enhanced version of the ChatMessage component that includes integrated feedback functionality.

#### Props

- `message` (object, required): The chat message object
- `userQuestion` (string, required): The user's original question
- `onCitationClick` (function, optional): Callback for citation clicks
- `onFeedbackSubmitted` (function, optional): Callback for feedback submission

#### Features

- All features from the original ChatMessage component
- Integrated AiResponseFeedback component for AI responses
- Improved copy functionality with visual feedback
- Clean separation between user and AI messages

#### Usage

```jsx
import ChatMessageWithFeedback from '../components/ChatMessageWithFeedback'

function ChatView() {
  const [messages, setMessages] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState('')

  const handleFeedbackSubmitted = (feedbackData, feedbackType, message) => {
    console.log('Feedback for message:', message.id, feedbackType)
  }

  return (
    <div>
      {messages.map((message, index) => (
        <ChatMessageWithFeedback
          key={message.id || index}
          message={message}
          userQuestion={currentQuestion}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      ))}
    </div>
  )
}
```

### `FeedbackExample.jsx`

A demo component showing how to use the feedback functionality.

## Integration Requirements

### 1. Supabase Setup

The components require the Supabase feedback tables to be set up. Run the SQL from `supabase/feedback-schema.sql` in your Supabase project.

### 2. Context Dependencies

The components use these contexts and hooks:

- `useSupabase()` - For Supabase client access
- `useFeedback()` - For feedback operations
- `useAdminHelpers()` - For formatting utilities

### 3. Tailwind CSS

The components are styled with Tailwind CSS and require these classes to be available:

- Button states: `hover:`, `active:`, `disabled:`
- Colors: `green-*`, `red-*`, `yellow-*`, `blue-*`, `gray-*`
- Layout: `flex`, `space-x-*`, `rounded-*`, `border-*`
- Animations: `transition-*`, `animate-spin`

## Database Schema

The feedback system uses two main tables:

1. **feedback_submissions**: Stores user feedback on AI responses
2. **kb_articles_draft**: Stores draft articles created from feedback

Key fields in `feedback_submissions`:
- `question`: Original user question
- `ai_response`: AI response that was rated
- `feedback_type`: 'correct', 'incorrect', or 'needs_improvement'
- `user_session_id`: Session identifier for tracking
- `status`: 'pending', 'in_progress', or 'completed'

## Styling Customization

The components use Tailwind CSS classes that can be customized:

```jsx
// Custom button colors
<AiResponseFeedback 
  className="custom-feedback-container"
  // Buttons can be styled via CSS targeting the feedback-component class
/>
```

## Real-time Updates

The feedback system supports real-time updates via Supabase subscriptions. Admin users can see feedback submissions in real-time.

## Error Handling

- Network errors are caught and displayed to users
- Invalid data is validated before submission
- Loading states prevent duplicate submissions
- Graceful fallbacks for missing dependencies

## Testing

To test the components:

1. Ensure your Supabase project has the feedback tables set up
2. Use the `FeedbackExample` component to test functionality
3. Check browser console for submission logs
4. Verify data appears in your Supabase dashboard

## Performance

- Components use React hooks for efficient state management
- Supabase queries are optimized with indexes
- Real-time subscriptions are cleaned up on unmount
- Local state caching reduces unnecessary API calls 