# Freshdesk Knowledge Base Frontend

A modern React application built with Vite and Tailwind CSS for searching and browsing Freshdesk knowledge base articles, with Supabase authentication.

## Features

- Modern React Setup with Vite
- Tailwind CSS for styling
- React Router for navigation
- **Supabase Authentication** with JWT
- Search functionality
- Responsive design
- Protected routes
- Session persistence
- Magic link authentication

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # Main layout wrapper
│   ├── Navigation.jsx  # Navigation with auth state
│   └── ProtectedRoute.jsx # Route protection
├── pages/              # Page components
│   ├── Home.jsx        # Landing page with search
│   ├── Search.jsx      # Search results page
│   ├── Article.jsx     # Individual article view
│   ├── Login.jsx       # Authentication page (sign in/up)
│   ├── Dashboard.jsx   # User dashboard
│   └── NotFound.jsx    # 404 error page
├── contexts/           # React contexts
│   ├── AuthContext.jsx # JWT authentication (legacy)
│   └── SupabaseContext.js # Supabase authentication
├── services/           # API services
│   └── api.js          # Axios configuration
├── hooks/              # Custom hooks
│   └── useSearch.js    # Search functionality
├── App.jsx             # Main app with routing
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:3001/api
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Supabase Authentication Features

### Authentication Methods
- **Email/Password**: Traditional email and password authentication
- **Magic Links**: Passwordless authentication via email
- **Sign Up**: User registration with email verification
- **Session Management**: Automatic session persistence and refresh

### Security Features
- **Protected Routes**: Dashboard and user-specific pages require authentication
- **Session Persistence**: Users stay logged in across browser sessions
- **Auto Token Refresh**: Automatic JWT token refresh
- **Secure Storage**: Tokens stored securely in localStorage

### User Management
- **Profile Updates**: Users can update display name and bio
- **User Metadata**: Additional user information storage
- **Account Info**: Member since date and last sign in tracking

## Authentication Flow

1. **Initial Load**: Check for existing session
2. **Sign In/Up**: Authenticate with Supabase
3. **Session Management**: Auto-refresh tokens and maintain state
4. **Protected Access**: Redirect to login if accessing protected routes
5. **Sign Out**: Clear session and redirect to home

## Environment Variables

Required environment variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# API Configuration  
VITE_API_URL=http://localhost:3001/api
```

## Components Overview

### SupabaseContext
- Centralized authentication state management
- Provides authentication methods throughout the app
- Handles session persistence and auto-refresh

### ProtectedRoute
- Wraps components that require authentication
- Redirects to login if user is not authenticated
- Shows loading state during authentication check

### Navigation
- Dynamic navigation based on authentication state
- Shows user email and sign out button when authenticated
- Responsive design for mobile and desktop

### Login Page
- Combined sign in and sign up functionality
- Magic link authentication option
- Form validation and error handling

### Dashboard
- User profile display and editing
- Account information and statistics
- Protected route requiring authentication

## Development Notes

The application uses Supabase for authentication, which provides:
- Real-time authentication state changes
- Secure JWT token management
- Email confirmation for new accounts
- Password reset functionality
- Built-in security features

The application is now running on http://localhost:3000 with full Supabase authentication integration! 