# Bug Reporting System

This document describes the complete bug reporting system implementation for the Freshdesk Knowledge Base application.

## 🏗️ System Architecture

The bug reporting system consists of four main components:

1. **Database Layer** - PostgreSQL tables for data storage
2. **Backend API** - Node.js/Express endpoints for data management
3. **Frontend Components** - React forms and UI components
4. **File Upload System** - Image attachment handling

## 📊 Database Schema

### Tables Created

#### `bug_reports`
```sql
CREATE TABLE bug_reports (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'reopened')),
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `bug_attachments`
```sql
CREATE TABLE bug_attachments (
  id SERIAL PRIMARY KEY,
  bug_report_id INTEGER REFERENCES bug_reports(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Security Features

- **Row Level Security (RLS)** enabled for both tables
- Users can only access their own bug reports
- Automatic ticket number generation
- Foreign key constraints for data integrity

## 🔧 Backend API

### Endpoints

#### `POST /api/bugs`
Submit a new bug report with optional file attachments.

**Request:**
- Content-Type: `multipart/form-data`
- Fields: `title`, `description`, `severity`, `user_name` (optional)
- Files: `attachments` (max 3 images, 5MB each)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Sample Bug",
    "description": "Bug description",
    "severity": "medium",
    "status": "new",
    "ticket_number": "BUG-20241211-0001",
    "user_email": "user@example.com",
    "attachments": [...]
  },
  "message": "Bug report submitted successfully. Ticket number: BUG-20241211-0001"
}
```

#### `GET /api/bugs`
Retrieve user's bug reports with pagination and filtering.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status` (optional)
- `severity` (optional)

#### `GET /api/bugs/:ticketNumber`
Get a specific bug report by ticket number.

#### `GET /uploads/bug-attachments/:filename`
Serve uploaded attachment files.

### File Upload Features

- **File Validation**: Only image files (JPEG, PNG, GIF, WebP)
- **Size Limits**: 5MB per file, maximum 3 files per report
- **Secure Storage**: Files stored in `backend/uploads/bug-attachments/`
- **Unique Naming**: Timestamp-based filenames to prevent conflicts
- **Error Handling**: Graceful degradation if file operations fail

## 🎨 Frontend Components

### `BugReportForm`
A comprehensive modal form with the following features:

**Form Fields:**
- Title (required, min 5 characters)
- Description (required, min 20 characters)
- Severity dropdown (low/medium/high/critical)
- User name (optional)
- Image uploads (optional, max 3 files)

**User Experience:**
- Real-time validation with error messages
- Image preview with remove functionality
- Loading states during submission
- Success message with ticket number
- Responsive design for mobile devices

**Validation Features:**
- Client-side validation before submission
- File type and size validation
- Clear error messages
- Form reset on successful submission

### `FeatureRequestForm`
A simpler modal form for feature requests:
- Feature title and description
- Priority selection
- User name (optional)
- Similar UX patterns to bug reporting

### `Footer` Component
Updated footer with modal integration:
- "Report a Bug" opens `BugReportForm`
- "Request a Feature" opens `FeatureRequestForm`
- Proper state management for modal visibility

## 🔌 API Integration

### `bugService.js`
Centralized service for API communication:

```javascript
import { submitBugReport, getBugReports, getBugReport } from './services/bugService.js'

// Submit bug report
const result = await submitBugReport(formData)

// Get user's bug reports
const reports = await getBugReports({ page: 1, limit: 10 })

// Get specific bug report
const report = await getBugReport('BUG-20241211-0001')
```

**Features:**
- Automatic authentication token handling
- Error handling and user-friendly messages
- Support for multipart/form-data uploads
- Network error detection

## 🚀 Getting Started

### 1. Database Setup

Run the migration script to create tables:

```bash
node run_migration.js
```

Or manually execute the SQL in `create_bug_reports_tables.sql`.

### 2. Backend Setup

The bug routes are automatically included in the Express app:

```javascript
// Backend routes are already configured
app.use('/api/bugs', bugRoutes)
```

### 3. Frontend Setup

The components are already integrated into the Footer:

```javascript
// Footer.jsx includes both modals
<BugReportForm isOpen={isBugModalOpen} onClose={closeBugModal} onSubmit={handleBugSubmit} />
<FeatureRequestForm isOpen={isFeatureModalOpen} onClose={closeFeatureModal} />
```

### 4. File Storage

Ensure the uploads directory exists:

```bash
mkdir -p backend/uploads/bug-attachments
```

The system will automatically create this directory if it doesn't exist.

## 🔒 Security Considerations

### Authentication
- All endpoints require authentication via JWT tokens
- User email automatically extracted from auth token
- Row-level security prevents cross-user data access

### File Upload Security
- File type validation (images only)
- File size limits (5MB per file)
- Unique filename generation prevents conflicts
- Files stored outside web root for security

### Data Validation
- Server-side validation for all inputs
- SQL injection prevention via parameterized queries
- XSS prevention through proper data sanitization

## 📈 Future Enhancements

### Planned Features
1. **Admin Dashboard** - View and manage all bug reports
2. **Email Notifications** - Notify users of status changes
3. **Bug Status Updates** - Allow status changes from admin interface
4. **Search and Filtering** - Advanced search capabilities
5. **File Storage Upgrade** - Move to cloud storage (S3, etc.)
6. **Automated Testing** - Unit and integration tests

### Feature Request System
- Currently implemented as a placeholder
- Could be extended to create a full feature request database
- Integration with project management tools

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors:**
- Ensure Supabase credentials are correct in `.env`
- Check if tables exist by running the migration script

**File Upload Errors:**
- Verify `uploads` directory exists and is writable
- Check file size and type restrictions
- Ensure sufficient disk space

**Frontend Errors:**
- Check if backend API is running on port 3333
- Verify API_URL environment variable in frontend
- Check browser console for network errors

### Debug Commands

```bash
# Test database connection
cd backend && node test-supabase.js

# Check backend API health
curl http://localhost:3333/health

# View backend logs
cd backend && npm run dev

# View frontend logs
cd frontend && npm run dev
```

## 📝 API Documentation

### Bug Report Object Structure

```json
{
  "id": 1,
  "title": "Login button not working",
  "description": "When I click the login button, nothing happens...",
  "severity": "medium",
  "status": "new",
  "user_email": "user@example.com",
  "user_name": "John Doe",
  "ticket_number": "BUG-20241211-0001",
  "created_at": "2024-12-11T10:30:00Z",
  "updated_at": "2024-12-11T10:30:00Z",
  "bug_attachments": [
    {
      "id": 1,
      "file_url": "/uploads/bug-attachments/bug-1702291800123-456789.png",
      "file_name": "screenshot.png",
      "file_size": 1048576,
      "file_type": "image/png",
      "uploaded_at": "2024-12-11T10:30:00Z"
    }
  ]
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Missing required fields: title, description, and severity are required",
  "details": "Additional error details if available"
}
```

## 🏁 Conclusion

The bug reporting system provides a complete end-to-end solution for collecting, storing, and managing user-reported bugs. It includes robust validation, security features, and a user-friendly interface that integrates seamlessly with the existing application.

The system is designed to be scalable and maintainable, with clear separation of concerns between the frontend, backend, and database layers. 