import express from 'express';
import { body, validationResult } from 'express-validator';
import mockDb from '../mockDb.js';
import { AppError } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get current user profile
router.get('/me', async (req, res, next) => {
  try {
    const user = mockDb.findUserById(req.user._id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get user's workspaces
    const workspaces = mockDb.findWorkspacesByUser(user._id);
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    userResponse.workspaces = workspaces.map(ws => ({
      _id: ws._id,
      name: ws.name,
      description: ws.description,
      color: ws.color,
      icon: ws.icon
    }));

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/me', [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('preferences.theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme preference'),
  body('preferences.timezone').optional().isString().withMessage('Timezone must be a string')
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

    const { name, preferences, avatar } = req.body;
    const user = mockDb.findUserById(req.user._id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    if (preferences !== undefined) {
      updates.preferences = { ...user.preferences, ...preferences };
    }

    const updatedUser = mockDb.updateUser(user._id, updates);
    
    // Remove password from response
    const { password: _, ...userResponse } = updatedUser;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/me/password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { currentPassword, newPassword } = req.body;
    const user = mockDb.findUserById(req.user._id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    mockDb.updateUser(user._id, { password: hashedPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (for mentions, etc.)
router.get('/:id', async (req, res, next) => {
  try {
    const user = mockDb.findUserById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Return only public information
    const publicUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: user.status
    };

    res.json({
      success: true,
      data: publicUser
    });
  } catch (error) {
    next(error);
  }
});

// Search users (for adding members, mentions, etc.)
router.get('/search/:query', async (req, res, next) => {
  try {
    const { query } = req.params;
    const { workspaceId } = req.query;

    let users = [];
    
    if (workspaceId) {
      // Search within workspace members
      const workspace = mockDb.findWorkspaceById(workspaceId);

      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }

      // Check if user has access to this workspace
      const hasAccess = workspace.owner === req.user._id ||
        workspace.members.some(member => member.user === req.user._id);

      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      users = workspace.members
        .map(member => mockDb.findUserById(member.user))
        .filter(user => user && (
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())
        ))
        .map(user => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          status: user.status
        }));
    } else {
      // Global search (limited to avoid exposing all users)
      const allUsers = Array.from(mockDb.users.values());
      users = allUsers
        .filter(user => 
          user.status === 'active' && (
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase())
          )
        )
        .slice(0, 10)
        .map(user => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          status: user.status
        }));
    }

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// Get user notifications (placeholder)
router.get('/notifications', async (req, res, next) => {
  try {
    // In a real application, you would fetch notifications from a database
    // For now, return mock notifications
    const notifications = [
      {
        _id: 'notif_1',
        type: 'task_assigned',
        message: 'You have been assigned to Task #123 in Project Alpha.',
        read: false,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        _id: 'notif_2',
        type: 'comment_added',
        message: 'John Doe commented on Task #456.',
        read: true,
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      }
    ];
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
});

export default router;
