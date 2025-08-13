import express from 'express';
import { body, validationResult } from 'express-validator';
import mockDb from '../mockDb.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get spaces for a workspace
router.get('/', async (req, res, next) => {
  try {
    const { workspace } = req.query;
    
    if (!workspace) {
      throw new AppError('Workspace ID is required', 400);
    }

    // Check if user has access to this workspace
    const workspaceDoc = mockDb.findWorkspaceById(workspace);
    if (!workspaceDoc) {
      throw new AppError('Workspace not found', 404);
    }

    const hasAccess = workspaceDoc.owner === req.user._id ||
      workspaceDoc.members.some(member => member.user === req.user._id);

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    // Get spaces from mockDb
    let spaces = mockDb.findSpacesByWorkspace(workspace);

    // If no spaces exist, create default ones
    if (spaces.length === 0) {
      const devSpace = mockDb.createSpace({
        name: 'Development',
        description: 'Development tasks and projects',
        workspace: workspace,
        folders: [
          {
            _id: 'folder_1',
            name: 'Frontend',
            lists: [
              { _id: 'list_1', name: 'To Do', tasks: [] },
              { _id: 'list_2', name: 'In Progress', tasks: [] }
            ]
          },
          {
            _id: 'folder_2',
            name: 'Backend',
            lists: [
              { _id: 'list_3', name: 'API Development', tasks: [] }
            ]
          }
        ]
      });

      const marketingSpace = mockDb.createSpace({
        name: 'Marketing',
        description: 'Marketing campaigns and content',
        workspace: workspace,
        folders: [
          {
            _id: 'folder_3',
            name: 'Content Creation',
            lists: [
              { _id: 'list_4', name: 'Blog Posts', tasks: [] }
            ]
          }
        ]
      });

      spaces = [devSpace, marketingSpace];
    }

    res.json({
      success: true,
      data: spaces
    });
  } catch (error) {
    next(error);
  }
});

// Create space
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Space name must be between 2 and 100 characters'),
  body('workspace').notEmpty().withMessage('Workspace ID is required')
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

    const { name, description, workspace } = req.body;

    // Check if user has access to this workspace
    const workspaceDoc = mockDb.findWorkspaceById(workspace);
    if (!workspaceDoc) {
      throw new AppError('Workspace not found', 404);
    }

    const hasAccess = workspaceDoc.owner === req.user._id ||
      workspaceDoc.members.some(member => member.user === req.user._id);

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    const space = mockDb.createSpace({
      name,
      description: description || '',
      workspace
    });

    res.status(201).json({
      success: true,
      message: 'Space created successfully',
      data: space
    });
  } catch (error) {
    next(error);
  }
});

export default router;
