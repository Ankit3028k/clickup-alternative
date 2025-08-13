import express from 'express';
import { body, validationResult } from 'express-validator';
import mockDb from '../mockDb.js';
import { AppError } from '../middleware/errorHandler.js';

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

    const workspace = mockDb.createWorkspace({
      name,
      description,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin',
        joinedAt: new Date()
      }],
      color,
      icon,
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
      }
    });

    // Add workspace to user's workspaces
    const user = mockDb.findUserById(req.user._id);
    user.workspaces.push(workspace._id);
    mockDb.updateUser(req.user._id, user);

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
    const workspaces = mockDb.findWorkspacesByUser(req.user._id);

    // Populate owner and members data
    const populatedWorkspaces = workspaces.map(workspace => {
      const owner = mockDb.findUserById(workspace.owner);
      const members = workspace.members.map(member => {
        const user = mockDb.findUserById(member.user);
        return {
          ...member,
          user: user ? {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
          } : null
        };
      }).filter(member => member.user);

      return {
        ...workspace,
        owner: owner ? {
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          avatar: owner.avatar
        } : null,
        members
      };
    });

    res.json({
      success: true,
      data: populatedWorkspaces
    });
  } catch (error) {
    next(error);
  }
});

// Get single workspace
router.get('/:id', async (req, res, next) => {
  try {
    const workspace = mockDb.findWorkspaceById(req.params.id);

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user has access to this workspace
    const hasAccess = workspace.owner === req.user._id ||
      workspace.members.some(member => member.user === req.user._id);

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    // Populate owner and members data
    const owner = mockDb.findUserById(workspace.owner);
    const members = workspace.members.map(member => {
      const user = mockDb.findUserById(member.user);
      return {
        ...member,
        user: user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        } : null
      };
    }).filter(member => member.user);

    const populatedWorkspace = {
      ...workspace,
      owner: owner ? {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        avatar: owner.avatar
      } : null,
      members
    };

    res.json({
      success: true,
      data: populatedWorkspace
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

    const workspace = mockDb.findWorkspaceById(req.params.id);

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user has permission to update workspace
    const isOwner = workspace.owner === req.user._id;
    const isAdmin = workspace.members.some(member => 
      member.user === req.user._id && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      throw new AppError('Access denied', 403);
    }

    const { name, description, color, icon, settings } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (settings !== undefined) updates.settings = { ...workspace.settings, ...settings };

    const updatedWorkspace = mockDb.updateWorkspace(req.params.id, updates);

    res.json({
      success: true,
      message: 'Workspace updated successfully',
      data: updatedWorkspace
    });
  } catch (error) {
    next(error);
  }
});

// Delete workspace
router.delete('/:id', async (req, res, next) => {
  try {
    const workspace = mockDb.findWorkspaceById(req.params.id);

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user is the owner
    if (workspace.owner !== req.user._id) {
      throw new AppError('Only workspace owner can delete workspace', 403);
    }

    mockDb.deleteWorkspace(req.params.id);

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

    const workspace = mockDb.findWorkspaceById(req.params.id);

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Check if user has permission to add members
    const isOwner = workspace.owner === req.user._id;
    const isAdmin = workspace.members.some(member => 
      member.user === req.user._id && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      throw new AppError('Access denied', 403);
    }

    const { email, role = 'member' } = req.body;

    const userToAdd = mockDb.findUserByEmail(email);
    if (!userToAdd) {
      throw new AppError('User not found', 404);
    }

    // Check if user is already a member
    const isAlreadyMember = workspace.members.some(member => 
      member.user === userToAdd._id
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
    mockDb.updateUser(userToAdd._id, userToAdd);

    const updatedWorkspace = mockDb.updateWorkspace(workspace._id, workspace);

    res.json({
      success: true,
      message: 'Member added successfully',
      data: updatedWorkspace
    });
  } catch (error) {
    next(error);
  }
});

export default router;
