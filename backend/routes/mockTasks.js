import express from 'express';
import { body, validationResult } from 'express-validator';
import mockDb from '../mockDb.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get tasks
router.get('/', async (req, res, next) => {
  try {
    const { workspace, assignee, status, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const filters = {};
    if (workspace) filters.workspace = workspace;
    if (assignee) filters.assignee = assignee;
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);

    const tasks = mockDb.findTasks(filters);

    res.json({
      success: true,
      data: {
        tasks,
        total: tasks.length,
        page: 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single task
router.get('/:id', async (req, res, next) => {
  try {
    const task = mockDb.findTaskById(req.params.id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// Create task
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters')
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

    const {
      title,
      description = '',
      status = 'To Do',
      priority = 'Medium',
      assignee,
      dueDate,
      workspace,
      list,
      tags = []
    } = req.body;

    const task = mockDb.createTask({
      title,
      description,
      status,
      priority,
      assignee,
      dueDate: dueDate ? new Date(dueDate) : null,
      workspace,
      list,
      tags,
      creator: req.user._id,
      watchers: [req.user._id]
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters')
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

    const task = mockDb.findTaskById(req.params.id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const updates = {};
    const allowedFields = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'tags'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'dueDate' && req.body[field]) {
          updates[field] = new Date(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    const updatedTask = mockDb.updateTask(req.params.id, updates);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', async (req, res, next) => {
  try {
    const task = mockDb.findTaskById(req.params.id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check if user has permission to delete task
    if (task.creator !== req.user._id) {
      throw new AppError('Access denied', 403);
    }

    mockDb.deleteTask(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Add comment to task
router.post('/:id/comments', [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment content is required and must be less than 1000 characters')
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

    const task = mockDb.findTaskById(req.params.id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const { content } = req.body;

    const comment = {
      _id: `comment_${Date.now()}`,
      content,
      author: req.user._id,
      task: req.params.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, this would be stored separately
    // For now, we'll just return the comment
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment
    });
  } catch (error) {
    next(error);
  }
});

// Get task comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const task = mockDb.findTaskById(req.params.id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Return empty array for now
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    next(error);
  }
});

export default router;
