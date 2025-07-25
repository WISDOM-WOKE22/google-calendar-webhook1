# Google Calendar Webhook Service

A robust Node.js/TypeScript service for handling Google Calendar webhooks with real-time event synchronization, caching, and comprehensive error handling.

## 🚀 Features

- **Real-time Calendar Sync**: Webhook-based synchronization with Google Calendar
- **Event Caching**: Intelligent caching system for improved performance
- **Comprehensive Error Handling**: Robust error management with custom error classes
- **Database Integration**: SQLite database with Prisma ORM for data persistence
- **Authentication**: OAuth2 integration with Google Calendar API
- **Rate Limiting**: Built-in rate limiting for API protection
- **Logging**: Structured logging with Winston
- **TypeScript**: Full TypeScript support with strict typing
- **Webhook Management**: Automatic webhook subscription creation and renewal

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Webhook Integration](#webhook-integration)
- [Architecture](#architecture)
- [Error Handling](#error-handling)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Google Cloud Console account
- Google Calendar API enabled

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd google-calendar-webhook
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your environment variables** (see [Configuration](#configuration))

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL="file:./calendar_events.db"

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Webhook Configuration
WEBHOOK_BASE_URL=http://localhost:3000
WEBHOOK_PATH=/api/calendar/webhook/notification
WEBHOOK_SECRET=your_webhook_secret
```

### Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs
5. Copy the Client ID and Client Secret to your `.env` file

## 🗄️ Database Setup

1. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

2. **Push database schema**
   ```bash
   npm run db:push
   ```

3. **Optional: Run migrations**
   ```bash
   npm run db:migrate
   ```

4. **View database with Prisma Studio**
   ```bash
   npm run db:studio
   ```

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push database schema
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/calendar
```

### Authentication
Most endpoints require authentication via Bearer token:
```
Authorization: Bearer <your_access_token>
```

### Endpoints

#### 1. Get Calendar Events
```http
GET /api/calendar/events?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `startTime` (required): ISO 8601 timestamp
- `endTime` (required): ISO 8601 timestamp

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event_id",
      "summary": "Meeting",
      "start": {
        "dateTime": "2024-01-15T10:00:00Z"
      },
      "end": {
        "dateTime": "2024-01-15T11:00:00Z"
      }
    }
  ],
  "message": "Fetched events successfully",
  "meta": {
    "cached": false,
    "count": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Create Webhook Subscription
```http
POST /api/calendar/webhook/subscription
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "channelId": "subscription_id",
    "resourceId": "resource_id",
    "expiration": "2024-01-08T00:00:00.000Z",
    "kind": "api#channel"
  },
  "message": "Webhook subscription created successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3. Webhook Notification Endpoint
```http
POST /api/calendar/webhook/notification
X-Webhook-Secret: <webhook_secret>
Content-Type: application/json

{
  "kind": "calendar#event",
  "id": "notification_id",
  "resourceId": "event_id",
  "resourceUri": "https://www.googleapis.com/calendar/v3/calendars/primary/events/event_id",
  "token": "webhook_token",
  "expiration": "2024-01-08T00:00:00.000Z",
  "state": "exists"
}
```

#### 4. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔗 Webhook Integration

### Webhook Flow

1. **Create Subscription**: Call the subscription endpoint to register for webhooks
2. **Receive Notifications**: Google sends notifications to your webhook URL
3. **Process Events**: The service automatically processes and stores event updates
4. **Renew Subscriptions**: Subscriptions are automatically renewed before expiration

### Webhook Notification Types

- **Event Created**: New calendar event
- **Event Updated**: Existing event modified
- **Event Deleted**: Event removed from calendar
- **Sync**: Initial synchronization notification

### Webhook Security

- All webhook notifications are validated using the `X-Webhook-Secret` header
- Invalid webhook secrets are rejected with 401 status
- Webhook URLs should be HTTPS in production

## 🏗️ Architecture

### Project Structure
```
src/
├── config/          # Configuration management
├── controllers/     # Request handlers
├── middlewares/     # Express middlewares
├── routes/          # API route definitions
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

### Key Components

#### Services
- **GoogleCalendarService**: Handles Google Calendar API interactions
- **CalendarService**: Manages calendar event business logic
- **DatabaseService**: Handles database operations
- **SubscriptionManager**: Manages webhook subscriptions

#### Error Handling
- Custom error classes for different error types
- Centralized error response formatting
- Express middleware for error handling
- Async error handling utilities

#### Database Models
- **CalendarEvent**: Stores calendar events
- **FetchCache**: Caches API responses
- **WebhookSubscription**: Manages webhook subscriptions

## 🛡️ Error Handling

The application uses a comprehensive error handling system:

### Error Types
- `ValidationError` (400) - Input validation errors
- `AuthenticationError` (401) - Authentication failures
- `NotFoundError` (404) - Resource not found
- `ExternalServiceError` (502) - External API errors
- `DatabaseError` (500) - Database operation errors

### Error Response Format
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/calendar/events"
  }
}
```



## 🚀 Deployment

### Production Deployment

#### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
DATABASE_URL="file:./calendar_events.db"
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
WEBHOOK_BASE_URL=https://yourdomain.com
WEBHOOK_SECRET=your_production_webhook_secret
LOG_LEVEL=info
```

### Production Considerations

- **HTTPS**: Use HTTPS for webhook endpoints in production
- **Reverse Proxy**: Use nginx or similar for SSL termination
- **Monitoring**: Set up health checks and monitoring
- **Logging**: Configure log rotation and external logging services
- **Database**: Consider using PostgreSQL for production instead of SQLite
- **Backups**: Set up automated database backups
- **Security**: Use strong webhook secrets and rotate them regularly
- **Process Management**: Use PM2 or similar for process management

## 🔍 Troubleshooting

### Common Issues

#### 1. Authentication Errors
**Problem**: "Authentication required" errors
**Solution**: Ensure valid access token is provided in Authorization header

#### 2. Webhook Notifications Not Received
**Problem**: No webhook notifications
**Solution**: 
- Verify webhook subscription is active
- Check webhook URL is accessible
- Ensure webhook secret is correct

#### 3. Database Connection Issues
**Problem**: Database connection errors
**Solution**:
- Verify DATABASE_URL is correct
- Ensure database file is writable
- Run `npm run db:generate` to regenerate Prisma client

#### 4. Google API Quota Exceeded
**Problem**: API quota limits
**Solution**:
- Implement caching to reduce API calls
- Monitor API usage in Google Cloud Console
- Consider upgrading Google API quota

### Logs
Check application logs in the `logs/` directory:
- `combined.log` - All application logs
- `error.log` - Error-level logs only

### Debug Mode
Enable debug logging by setting:
```env
LOG_LEVEL=debug
```