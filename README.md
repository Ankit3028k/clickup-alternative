# ClickUp Alternative - Project Management Application

A comprehensive project management application built with React, Node.js, and Express. This application provides features similar to ClickUp including workspaces, tasks, time tracking, and team collaboration.

## Features

### Core Functionality
- **User Authentication**: JWT-based authentication with registration and login
- **Workspace Management**: Create and manage multiple workspaces
- **Task Management**: Create, update, and organize tasks with priorities and due dates
- **Time Tracking**: Track time spent on tasks and projects
- **Real-time Updates**: WebSocket support for live collaboration
- **Team Collaboration**: User mentions, comments, and notifications
- **Responsive Design**: Modern UI with Tailwind CSS

### Technical Stack
- **Frontend**: React 19, Vite, Tailwind CSS, React Query, Socket.io Client
- **Backend**: Node.js, Express.js, Socket.io, JWT Authentication
- **Database**: MongoDB (with in-memory fallback for development)
- **State Management**: Zustand, React Context
- **UI Components**: Lucide React icons, Framer Motion animations

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (optional - will use in-memory storage if not available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clickup-ulternative
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

4. **Start the application**
   ```bash
   # Start backend server (Terminal 1)
   cd backend
   npm start

   # Start frontend development server (Terminal 2)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Health Check: http://localhost:5001/health

## Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Project Structure

```
clickup-ulternative/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   ├── contexts/          # React contexts (Auth, Socket)
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── assets/            # Static assets
├── backend/               # Backend source code
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   └── utils/            # Utility functions
└── public/               # Static files
```

## API Documentation

The backend provides a RESTful API with the following main endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/me` - Get current user profile
- `GET /api/workspaces` - Get user workspaces
- `GET /api/tasks` - Get tasks with filtering
- `GET /api/time/stats` - Get time tracking statistics

## Database

The application supports both MongoDB and in-memory storage:

- **MongoDB**: Configure `MONGODB_URI` in backend/.env
- **In-Memory**: Automatic fallback if MongoDB is not available
- **Mock Data**: Pre-populated with sample data for testing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
