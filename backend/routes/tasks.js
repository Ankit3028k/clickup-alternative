import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import List from '../models/List.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../server.js';

const router = express.Router();

// Create task
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Task title is required and cannot exceed 200 characters'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
  body('list').isMongoId().withMessage('Valid list ID is required'),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  body('estimatedTime').optional().isInt({ min: 0 }).withMessage('Estimated time must be a positive integer'),
  body('assignees').optional().isArray().withMessage('Assignees must be an array')
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
      description,
      list,
      status = 'todo',
      priority = 'medium',
      dueDate,
      startDate,
      estimatedTime = 0,
      assignees = [],
      tags = [],
      customFields = []
    } = req.body;

    // Verify list exists and user has access
    const listDoc = await List.findById(list).populate({
      path: 'folder',
      populate: {
        path: 'space',
        populate: {
          path: 'workspace'
        }
      }
    });

    if (!listDoc) {
      throw new AppError('List not found', 404);
    }

    // Check workspace access
    const workspace = listDoc.folder.space.workspace;
    const hasAccess = workspace.owner.equals(req.user._id) ||
      workspace.members.some(member => member.user.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    const task = await Task.create({
      title,
      description,
      list,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      estimatedTime,
      assignees: assignees.map(userId => ({
        user: userId,
        assignedAt: new Date(),
        assignedBy: req.user._id
      })),
      tags,
      customFields,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    // Populate task details
    await task.populate([
      { path: 'list', select: 'name' },
      { path: 'assignees.user', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'updatedBy', select: 'name email avatar' }
    ]);

    // Emit real-time update
    io.to(`workspace-${workspace._id}`).emit('task-created', {
      task,
      workspaceId: workspace._id
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

// Get tasks with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const {
      workspaceId,
      listId,
      status,
      priority,
      assignee,
      dueBefore,
      dueAfter,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (workspaceId) {
      // Filter by workspace (need to traverse through lists)
      const lists = await List.find().populate({
        path: 'folder',
        populate: {
          path: 'space',
          match: { workspace: workspaceId }
        }
      });
      
      const validListIds = lists
        .filter(list => list.folder && list.folder.space)
        .map(list => list._id);
      
      filter.list = { $in: validListIds };
    }
    
    if (listId) filter.list = listId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter['assignees.user'] = assignee;
    if (dueBefore) filter.dueDate = { $lt: new Date(dueBefore) };
    if (dueAfter) filter.dueDate = { $gt: new Date(dueAfter) };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(filter)
      .populate([
        { path: 'list', select: 'name' },
        { path: 'assignees.user', select: 'name email avatar' },
        { path: 'createdBy', select: 'name email avatar' },
        { path: 'updatedBy', select: 'name email avatar' },
        { path: 'subtasks', select: 'title status priority' },
        { path: 'parentTask', select: 'title status' }
      ])
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single task
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate([
        { path: 'list', populate: { path: 'folder.space.workspace' } },
        { path: 'assignees.user', select: 'name email avatar' },
        { path: 'createdBy', select: 'name email avatar' },
        { path: 'updatedBy', select: 'name email avatar' },
        { path: 'subtasks', populate: { path: 'assignees.user', select: 'name email avatar' } },
        { path: 'parentTask', select: 'title status' },
        { path: 'comments', populate: { path: 'author', select: 'name email avatar' } },
        { path: 'attachments.uploadedBy', select: 'name email avatar' }
      ]);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check workspace access
    const workspace = task.list.folder.space.workspace;
    const hasAccess = workspace.owner.equals(req.user._id) ||
      workspace.members.some(member => member.user.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Task title cannot exceed 200 characters'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  body('estimatedTime').optional().isInt({ min: 0 }).withMessage('Estimated time must be a positive integer')
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

    const task = await Task.findById(req.params.id)
      .populate('list.folder.space.workspace');

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check workspace access
    const workspace = task.list.folder.space.workspace;
    const hasAccess = workspace.owner.equals(req.user._id) ||
      workspace.members.some(member => member.user.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      startDate,
      estimatedTime,
      assignees,
      tags,
      customFields
    } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (startDate !== undefined) task.startDate = startDate ? new Date(startDate) : undefined;
    if (estimatedTime !== undefined) task.estimatedTime = estimatedTime;
    if (assignees !== undefined) {
      task.assignees = assignees.map(userId => ({
        user: userId,
        assignedAt: new Date(),
        assignedBy: req.user._id
      }));
    }
    if (tags !== undefined) task.tags = tags;
    if (customFields !== undefined) task.customFields = customFields;

    task.updatedBy = req.user._id;
    await task.save();

    // Populate task details
    await task.populate([
      { path: 'list', select: 'name' },
      { path: 'assignees.user', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'updatedBy', select: 'name email avatar' }
    ]);

    // Emit real-time update
    io.to(`workspace-${workspace._id}`).emit('task-updated', {
      task,
      workspaceId: workspace._id
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('list.folder.space.workspace');

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check workspace access
    const workspace = task.list.folder.space.workspace;
    const hasAccess = workspace.owner.equals(req.user._id) ||
      workspace.members.some(member => member.user.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    await Task.findByIdAndDelete(req.params.id);

    // Emit real-time update
    io.to(`workspace-${workspace._id}`).emit('task-deleted', {
      taskId: req.params.id,
      workspaceId: workspace._id
    });

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
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment content is required and cannot exceed 2000 characters')
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

    const task = await Task.findById(req.params.id)
      .populate('list.folder.space.workspace');

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check workspace access
    const workspace = task.list.folder.space.workspace;
    const hasAccess = workspace.owner.equals(req.user._id) ||
      workspace.members.some(member => member.user.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    const { content, mentions = [] } = req.body;

    const comment = await Comment.create({
      task: task._id,
      author: req.user._id,
      content,
      mentions: mentions.map(userId => ({
        user: userId,
        notified: false
      }))
    });

    await comment.populate('author', 'name email avatar');

    task.comments.push(comment._id);
    await task.save();

    // Emit real-time update
    io.to(`task-${task._id}`).emit('comment-added', {
      comment,
      taskId: task._id
    });

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
    const task = await Task.findById(req.params.id)
      .populate('list.folder.space.workspace');

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check workspace access
    const workspace = task.list.folder.space.workspace;
    const hasAccess = workspace.owner.equals(req.user._id) ||
      workspace.members.some(member => member.user.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    const comments = await Comment.find({ task: req.params.id })
      .populate('author', 'name email avatar')
      .populate('mentions.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    next(error);
  }
});

export default router;
