# ClickUp Alternative Backend

A comprehensive backend API for a ClickUp alternative built with Node.js, Express.js, and MongoDB.

## Features

### Core Functionality
- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Multi-level Task Management**: Workspace → Spaces → Folders → Lists → Tasks → Subtasks hierarchy
- **Time Tracking**: Start/stop timers, manual time entries, billable vs non-billable tracking
- **Real-time Features**: WebSocket support for live updates and notifications
- **File Attachments**: Support for file uploads to tasks and comments
- **Comments & Mentions**: Threaded comments with user mentions

### Advanced Features
- **Custom Fields**: Flexible custom field system for tasks
- **Task Dependencies**: Support for task relationships and blocking
- **Automation Rules**: Framework for rule-based task automation (placeholder)
- **Integrations**: Basic setup for third-party integrations (placeholder)
- **Reporting**: Time tracking reports and analytics

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.IO
- **Validation**: Express-validator
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate limiting
- **Error Handling**: Custom error middleware

## Project Structure

```
backend/
├── models/           # Mongoose data models
│   ├── User.js
│   ├── Workspace.js
│   ├── Space.js
│   ├── Folder.js
│   ├── List.js
│   ├── Task.js
│   ├── Comment.js
│   └── TimeLog.js
├── routes/           # API route definitions
│   ├── auth.js
│   ├── users.js
│   ├── workspaces.js
│   ├── tasks.js
│   ├── timeTracking.js
│   ├── projects.js      # placeholder
│   ├── automations.js   # placeholder
│   └── integrations.js  # placeholder
├── middleware/       # Custom middleware
│   ├── auth.js
│   └── errorHandler.js
├── uploads/          # File upload directory
├── server.js         # Main application file
├── package.json
└── .env.example      # Environment variables template
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth (placeholder)
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/forgot-password` - Forgot password (placeholder)
- `POST /api/auth/reset-password` - Reset password (placeholder)

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `PUT /api/users/me/password` - Change password
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/search/:query` - Search users

### Workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces` - Get user's workspaces
- `GET /api/workspaces/:id` - Get single workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/members` - Add member to workspace
- `DELETE /api/workspaces/:id/members/:userId` - Remove member from workspace

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - Get tasks with filtering and pagination
- `GET /api/tasks/:id` - Get single task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/comments` - Add comment to task
- `GET /api/tasks/:id/comments` - Get task comments

### Time Tracking
- `POST /api/time/start` - Start timer for task
- `POST /api/time/stop` - Stop running timer
- `GET /api/time/current` - Get current running timer
- `POST /api/time/manual` - Add manual time entry
- `GET /api/time` - Get time logs with filtering
- `PUT /api/time/:id` - Update time log
- `DELETE /api/time/:id` - Delete time log
- `GET /api/time/reports/summary` - Get time tracking reports

## Data Models

### User
- Basic profile information
- Authentication credentials
- Preferences and settings
- Workspace memberships

### Workspace
- Workspace settings and configuration
- Member management with roles
- Custom statuses and priorities
- Space hierarchy

### Task
- Complete task management
- Assignees and due dates
- Custom fields and tags
- Subtasks and dependencies
- Attachments and comments

### TimeLog
- Time tracking entries
- Billable vs non-billable time
- Timer and manual entry support
- Reporting and analytics

## Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**
   Make sure MongoDB is running on your system or update the `MONGODB_URI` in your `.env` file.

4. **Run the server**
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000` by default.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/clickup-ulternative |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Token expiration time | 7d |
| `FRONTEND_URL` | Frontend application URL | http://localhost:3000 |
| `SMTP_HOST` | Email SMTP host | smtp.gmail.com |
| `SMTP_PORT` | Email SMTP port | 587 |
| `SMTP_USER` | Email SMTP username | Required |
| `SMTP_PASS` | Email SMTP password | Required |
| `MAX_FILE_SIZE` | Maximum file upload size | 10485760 |

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Stateless authentication with configurable expiration
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive validation using express-validator
- **CORS Protection**: Configurable CORS settings
- **Helmet**: Security headers for Express.js
- **File Upload Security**: Restricted file types and sizes

## Real-time Features

The application uses Socket.IO for real-time updates:

- **Task Updates**: Live notifications when tasks are created, updated, or deleted
- **Comments**: Real-time comment notifications
- **Workspace Events**: Live updates for workspace changes

## Error Handling

The API uses a standardized error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error information"] // Optional
}
```

## Development

### Adding New Routes

1. Create the route file in the `routes/` directory
2. Import and use the route in `server.js`
3. Add appropriate authentication middleware
4. Implement input validation
5. Add error handling

### Database Schema Changes

1. Update the appropriate model file in `models/`
2. Add necessary indexes for performance
3. Update any related routes
4. Consider data migration if needed

## Testing

Currently, the project does not include automated tests. Testing should be added using a framework like Jest or Mocha.

## Deployment

The backend can be deployed to various platforms:

- **Railway**: Deploy with one click
- **Render**: Node.js service deployment
- **Heroku**: Traditional Node.js deployment
- **DigitalOcean**: Droplet or App Platform

### Environment Setup for Production

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure production database URI
4. Set up proper email credentials
5. Configure file storage (S3 recommended)
6. Set up proper CORS origins
7. Configure SSL/TLS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT
