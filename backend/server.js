import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import process from 'process';

// Import database connection
import connectDB from './db.js';

// Import cleanup utilities
import { initializeCleanupScheduler } from './utils/cleanup.js';

// Import real routes with MongoDB support
import authRoutes from './routes/auth.js';
import invitationRoutes from './routes/invitations.js';
import workspaceRoutes from './routes/workspaces.js';
import mockUserRoutes from './routes/mockUsers.js';
import mockTaskRoutes from './routes/mockTasks.js';
import mockTimeRoutes from './routes/mockTime.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { mockAuthMiddleware } from './middleware/mockAuth.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

const PORT = process.env.PORT || 5001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Initialize database connection
async function initializeDatabase() {
  try {
    if (process.env.MONGODB_URI) {
      // Add timeout for MongoDB connection
      const connectPromise = connectDB();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      console.log('Using MongoDB database');
    } else {
      console.log('No MongoDB URI provided, using in-memory storage');
    }
  } catch (error) {
    console.log('MongoDB connection failed, using in-memory storage:', error.message);
  }
}

// Routes - Using real auth and invitations with MongoDB, mock for others
app.use('/api/auth', authRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/users', authMiddleware, mockUserRoutes);
app.use('/api/workspaces', authMiddleware, workspaceRoutes);
app.use('/api/tasks', authMiddleware, mockTaskRoutes);
app.use('/api/time', authMiddleware, mockTimeRoutes);

// Placeholder routes for future features
app.use('/api/projects', mockAuthMiddleware, (_req, res) => {
  res.json({ success: true, message: 'Projects endpoint - to be implemented', data: [] });
});
app.use('/api/automations', mockAuthMiddleware, (_req, res) => {
  res.json({ success: true, message: 'Automations endpoint - to be implemented', data: [] });
});
app.use('/api/integrations', mockAuthMiddleware, (_req, res) => {
  res.json({ success: true, message: 'Integrations endpoint - to be implemented', data: [] });
});

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-workspace', (workspaceId) => {
    socket.join(`workspace-${workspaceId}`);
  });

  socket.on('join-task', (taskId) => {
    socket.join(`task-${taskId}`);
  });

  socket.on('send-message', (data) => {
    io.to(`task-${data.taskId}`).emit('receive-message', data);
  });

  socket.on('task-updated', (data) => {
    io.to(`workspace-${data.workspaceId}`).emit('task-update', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(errorHandler);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  await initializeDatabase();

  // Initialize cleanup scheduler for temporary users and OTPs
  if (process.env.MONGODB_URI) {
    initializeCleanupScheduler();
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Using in-memory storage (no MongoDB required)');
  });
}

startServer().catch(console.error);

export { io };
