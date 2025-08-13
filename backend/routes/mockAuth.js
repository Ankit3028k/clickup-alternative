import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import mockDb from '../mockDb.js';
import { AppError } from '../middleware/errorHandler.js';
import process from 'process';

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

// Register
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = mockDb.findUserByEmail(email);
    if (existingUser) {
      throw new AppError('User already exists with this email', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = mockDb.createUser({
      name,
      email,
      password: hashedPassword,
      role: 'member',
      status: 'active',
      lastLogin: new Date(),
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          inApp: true
        },
        timezone: 'UTC'
      }
    });

    // Create default workspace for the user
    const workspace = mockDb.createWorkspace({
      name: `${name}'s Workspace`,
      owner: user._id,
      members: [{
        user: user._id,
        role: 'admin',
        joinedAt: new Date()
      }],
      settings: {
        isPublic: false,
        allowGuestAccess: false,
        defaultView: 'list',
        taskStatuses: [
          { name: 'To Do', color: '#6B7280', order: 0 },
          { name: 'In Progress', color: '#3B82F6', order: 1 },
          { name: 'Review', color: '#F59E0B', order: 2 },
          { name: 'Done', color: '#10B981', order: 3 }
        ],
        taskPriorities: [
          { name: 'Low', color: '#6B7280', order: 0 },
          { name: 'Medium', color: '#3B82F6', order: 1 },
          { name: 'High', color: '#EF4444', order: 2 },
          { name: 'Urgent', color: '#DC2626', order: 3 }
        ]
      },
      color: '#4F46E5',
      icon: ''
    });

    // Add workspace to user's workspaces
    user.workspaces.push(workspace._id);
    mockDb.updateUser(user._id, user);

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token,
        workspace
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = mockDb.findUserByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    mockDb.updateUser(user._id, user);

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// Verify token
router.get('/verify', async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = mockDb.findUserById(decoded.id);
    
    if (!user) {
      throw new AppError('Invalid token', 401);
    }

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Token is valid',
      data: { user: userResponse }
    });
  } catch (error) {
    next(error);
  }
});

// Placeholder routes
router.post('/google', async (req, res) => {
  res.json({
    success: true,
    message: 'Google OAuth not implemented yet',
    data: null
  });
});

router.post('/forgot-password', async (req, res) => {
  res.json({
    success: true,
    message: 'Password reset email sent (placeholder)',
    data: null
  });
});

router.post('/reset-password', async (req, res) => {
  res.json({
    success: true,
    message: 'Password reset successful (placeholder)',
    data: null
  });
});

export default router;
