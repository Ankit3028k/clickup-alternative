import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get current user profile
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('workspaces', 'name description color icon');

    res.json({
      success: true,
      data: user
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
    const user = await User.findById(req.user._id);

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (preferences !== undefined) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
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
    const user = await User.findById(req.user._id).select('+password');

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

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
    const user = await User.findById(req.params.id)
      .select('name email avatar status');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: user
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

    let users;
    
    if (workspaceId) {
      // Search within workspace members
      const Workspace = await import('../models/Workspace.js').then(module => module.default);
      const workspace = await Workspace.findById(workspaceId)
        .populate('members.user', 'name email avatar status');

      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }

      // Check if user has access to this workspace
      const hasAccess = workspace.owner.equals(req.user._id) ||
        workspace.members.some(member => member.user._id.equals(req.user._id));

      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      users = workspace.members
        .filter(member => 
          member.user.name.toLowerCase().includes(query.toLowerCase()) ||
          member.user.email.toLowerCase().includes(query.toLowerCase())
        )
        .map(member => member.user);
    } else {
      // Global search (limited to avoid exposing all users)
      users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ],
        status: 'active'
      })
      .select('name email avatar status')
      .limit(10);
    }

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

export default router;
