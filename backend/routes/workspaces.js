import express from 'express';
import { body, validationResult } from 'express-validator';
import Workspace from '../models/Workspace.js';
import Space from '../models/Space.js';
import { AppError } from '../middleware/errorHandler.js';
import { roleCheck } from '../middleware/auth.js';

const router = express.Router();

// Create workspace
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Workspace name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
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

    const { name, description, color = '#4F46E5', icon = '' } = req.body;

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin'
      }],
      color,
      icon,
      settings: {
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
      }
    });

    // Add workspace to user's workspaces
    req.user.workspaces.push(workspace._id);
    await req.user.save();

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

// Get user's workspaces
router.get('/', async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate('spaces', 'name description color icon order')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    next(error);
  }
});

// Get single workspace
router.get('/:id', async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .populate('spaces', 'name description color icon order');

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user has access to this workspace
    const hasAccess = workspace.owner._id.equals(req.user._id) ||
      workspace.members.some(member => member.user._id.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

// Update workspace
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Workspace name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
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

    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user has permission to update workspace
    const isOwner = workspace.owner.equals(req.user._id);
    const isAdmin = workspace.members.some(member => 
      member.user.equals(req.user._id) && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      throw new AppError('Access denied', 403);
    }

    const { name, description, color, icon, settings } = req.body;

    if (name !== undefined) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (color !== undefined) workspace.color = color;
    if (icon !== undefined) workspace.icon = icon;
    if (settings !== undefined) workspace.settings = { ...workspace.settings, ...settings };

    await workspace.save();

    res.json({
      success: true,
      message: 'Workspace updated successfully',
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

// Delete workspace
router.delete('/:id', roleCheck(['admin']), async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user is the owner
    if (!workspace.owner.equals(req.user._id)) {
      throw new AppError('Only workspace owner can delete workspace', 403);
    }

    await Workspace.findByIdAndDelete(req.params.id);

    // Remove workspace from all users' workspaces array
    // This would typically be handled by a pre-delete hook or cascade delete
    // For now, we'll keep it simple

    res.json({
      success: true,
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Add member to workspace
router.post('/:id/members', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('role').optional().isIn(['admin', 'member', 'guest']).withMessage('Invalid role')
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

    const workspace = await Workspace.findById(req.params.id).populate('members.user', 'email');

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user has permission to add members
    const isOwner = workspace.owner.equals(req.user._id);
    const isAdmin = workspace.members.some(member => 
      member.user._id.equals(req.user._id) && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      throw new AppError('Access denied', 403);
    }

    const User = await import('../models/User.js').then(module => module.default);
    const { email, role = 'member' } = req.body;

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      throw new AppError('User not found', 404);
    }

    // Check if user is already a member
    const isAlreadyMember = workspace.members.some(member => 
      member.user._id.equals(userToAdd._id)
    );

    if (isAlreadyMember) {
      throw new AppError('User is already a member of this workspace', 400);
    }

    workspace.members.push({
      user: userToAdd._id,
      role,
      joinedAt: new Date()
    });

    // Add workspace to user's workspaces
    userToAdd.workspaces.push(workspace._id);
    await userToAdd.save();

    await workspace.save();

    res.json({
      success: true,
      message: 'Member added successfully',
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

// Remove member from workspace
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user has permission to remove members
    const isOwner = workspace.owner.equals(req.user._id);
    const isAdmin = workspace.members.some(member => 
      member.user.equals(req.user._id) && member.role === 'admin'
    );
    const isRemovingSelf = req.params.userId === req.user._id.toString();

    if (!isOwner && !isAdmin && !isRemovingSelf) {
      throw new AppError('Access denied', 403);
    }

    // Cannot remove owner
    if (workspace.owner.toString() === req.params.userId) {
      throw new AppError('Cannot remove workspace owner', 400);
    }

    // Remove member
    workspace.members = workspace.members.filter(member => 
      member.user.toString() !== req.params.userId
    );

    await workspace.save();

    // Remove workspace from user's workspaces
    const User = await import('../models/User.js').then(module => module.default);
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { workspaces: workspace._id }
    });

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

export default router;
