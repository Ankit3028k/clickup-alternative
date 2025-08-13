import express from 'express';
import { body, validationResult } from 'express-validator';
import TimeLog from '../models/TimeLog.js';
import Task from '../models/Task.js';
import Workspace from '../models/Workspace.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Start timer for a task
router.post('/start', [
  body('taskId').isMongoId().withMessage('Valid task ID is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isBillable').optional().isBoolean().withMessage('Billable must be a boolean'),
  body('billableRate').optional().isFloat({ min: 0 }).withMessage('Billable rate must be a positive number')
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

    const { taskId, description = '', isBillable = true, billableRate } = req.body;

    // Check if user already has a running timer
    const runningTimer = await TimeLog.findRunningTimer(req.user._id);
    if (runningTimer) {
      throw new AppError('You already have a running timer. Stop it first.', 400);
    }

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate('list.folder.space.workspace');
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const workspace = task.list.folder.space.workspace;
    const hasAccess = workspace.owner.equals(req.user._id) ||
      workspace.members.some(member => member.user.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    const timeLog = await TimeLog.create({
      task: taskId,
      user: req.user._id,
      description,
      startTime: new Date(),
      duration: 0,
      isBillable,
      billableRate,
      isRunning: true,
      manualEntry: false,
      workspace: workspace._id
    });

    res.status(201).json({
      success: true,
      message: 'Timer started successfully',
      data: timeLog
    });
  } catch (error) {
    next(error);
  }
});

// Stop running timer
router.post('/stop', async (req, res, next) => {
  try {
    const runningTimer = await TimeLog.findRunningTimer(req.user._id);
    if (!runningTimer) {
      throw new AppError('No running timer found', 404);
    }

    await runningTimer.stopTimer();

    res.json({
      success: true,
      message: 'Timer stopped successfully',
      data: runningTimer
    });
  } catch (error) {
    next(error);
  }
});

// Get current running timer
router.get('/current', async (req, res, next) => {
  try {
    const runningTimer = await TimeLog.findRunningTimer(req.user._id);
    
    if (!runningTimer) {
      return res.json({
        success: true,
        data: null
      });
    }

    // Calculate current duration
    const now = new Date();
    const currentDuration = Math.round((now - runningTimer.startTime) / (1000 * 60));

    res.json({
      success: true,
      data: {
        ...runningTimer.toObject(),
        currentDuration
      }
    });
  } catch (error) {
    next(error);
  }
});

// Add manual time entry
router.post('/manual', [
  body('taskId').isMongoId().withMessage('Valid task ID is required'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer (minutes)'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isBillable').optional().isBoolean().withMessage('Billable must be a boolean'),
  body('billableRate').optional().isFloat({ min: 0 }).withMessage('Billable rate must be a positive number')
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
      taskId,
      duration,
      startTime,
      description = '',
      isBillable = true,
      billableRate,
      tags = []
    } = req.body;

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate('list.folder.space.workspace');
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const workspace = task.list.folder.space.workspace;
    const hasAccess = workspace.owner.equals(req.user._id) ||
      workspace.members.some(member => member.user.equals(req.user._id));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    const timeLog = await TimeLog.create({
      task: taskId,
      user: req.user._id,
      description,
      startTime: new Date(startTime),
      endTime: new Date(new Date(startTime).getTime() + duration * 60 * 1000),
      duration,
      isBillable,
      billableRate,
      tags,
      isRunning: false,
      manualEntry: true,
      workspace: workspace._id
    });

    res.status(201).json({
      success: true,
      message: 'Time entry added successfully',
      data: timeLog
    });
  } catch (error) {
    next(error);
  }
});

// Get time logs with filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      taskId,
      workspaceId,
      userId,
      startDate,
      endDate,
      isBillable,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};
    
    if (taskId) filter.task = taskId;
    if (workspaceId) filter.workspace = workspaceId;
    if (userId) filter.user = userId;
    if (isBillable !== undefined) filter.isBillable = isBillable === 'true';
    
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    // If user is not admin, only show their own time logs
    if (!['admin'].includes(req.user.role)) {
      filter.user = req.user._id;
    }

    const timeLogs = await TimeLog.find(filter)
      .populate('task', 'title status')
      .populate('user', 'name email avatar')
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TimeLog.countDocuments(filter);

    // Calculate totals
    const totals = await TimeLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' },
          totalBillableDuration: { $sum: { $cond: ['$isBillable', '$duration', 0] } },
          totalNonBillableDuration: { $sum: { $cond: ['$isBillable', 0, '$duration'] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        timeLogs,
        totals: totals[0] || {
          totalDuration: 0,
          totalBillableDuration: 0,
          totalNonBillableDuration: 0
        },
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

// Update time log
router.put('/:id', [
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer (minutes)'),
  body('startTime').optional().isISO8601().withMessage('Valid start time is required'),
  body('isBillable').optional().isBoolean().withMessage('Billable must be a boolean'),
  body('billableRate').optional().isFloat({ min: 0 }).withMessage('Billable rate must be a positive number')
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

    const timeLog = await TimeLog.findById(req.params.id);
    if (!timeLog) {
      throw new AppError('Time log not found', 404);
    }

    // Users can only edit their own time logs unless they're admin
    if (!timeLog.user.equals(req.user._id) && !['admin'].includes(req.user.role)) {
      throw new AppError('Access denied', 403);
    }

    const {
      description,
      duration,
      startTime,
      isBillable,
      billableRate,
      tags
    } = req.body;

    if (description !== undefined) timeLog.description = description;
    if (duration !== undefined) {
      timeLog.duration = duration;
      if (startTime) {
        timeLog.startTime = new Date(startTime);
        timeLog.endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000);
      }
    }
    if (startTime !== undefined) {
      timeLog.startTime = new Date(startTime);
      if (timeLog.duration) {
        timeLog.endTime = new Date(new Date(startTime).getTime() + timeLog.duration * 60 * 1000);
      }
    }
    if (isBillable !== undefined) timeLog.isBillable = isBillable;
    if (billableRate !== undefined) timeLog.billableRate = billableRate;
    if (tags !== undefined) timeLog.tags = tags;

    await timeLog.save();

    res.json({
      success: true,
      message: 'Time log updated successfully',
      data: timeLog
    });
  } catch (error) {
    next(error);
  }
});

// Delete time log
router.delete('/:id', async (req, res, next) => {
  try {
    const timeLog = await TimeLog.findById(req.params.id);
    if (!timeLog) {
      throw new AppError('Time log not found', 404);
    }

    // Users can only delete their own time logs unless they're admin
    if (!timeLog.user.equals(req.user._id) && !['admin'].includes(req.user.role)) {
      throw new AppError('Access denied', 403);
    }

    await TimeLog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Time log deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get time tracking reports
router.get('/reports/summary', async (req, res, next) => {
  try {
    const {
      workspaceId,
      userId,
      startDate,
      endDate,
      groupBy = 'user' // user, task, date
    } = req.query;

    const filter = {};
    
    if (workspaceId) filter.workspace = workspaceId;
    if (userId) filter.user = userId;
    
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    // If user is not admin, only show their own data
    if (!['admin'].includes(req.user.role)) {
      filter.user = req.user._id;
    }

    let groupStage;
    switch (groupBy) {
      case 'user':
        groupStage = {
          $group: {
            _id: '$user',
            totalDuration: { $sum: '$duration' },
            billableDuration: { $sum: { $cond: ['$isBillable', '$duration', 0] } },
            nonBillableDuration: { $sum: { $cond: ['$isBillable', 0, '$duration'] } },
            entryCount: { $sum: 1 }
          }
        };
        break;
      case 'task':
        groupStage = {
          $group: {
            _id: '$task',
            totalDuration: { $sum: '$duration' },
            billableDuration: { $sum: { $cond: ['$isBillable', '$duration', 0] } },
            nonBillableDuration: { $sum: { $cond: ['$isBillable', 0, '$duration'] } },
            entryCount: { $sum: 1 }
          }
        };
        break;
      case 'date':
        groupStage = {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$startTime'
              }
            },
            totalDuration: { $sum: '$duration' },
            billableDuration: { $sum: { $cond: ['$isBillable', '$duration', 0] } },
            nonBillableDuration: { $sum: { $cond: ['$isBillable', 0, '$duration'] } },
            entryCount: { $sum: 1 }
          }
        };
        break;
      default:
        groupStage = {
          $group: {
            _id: null,
            totalDuration: { $sum: '$duration' },
            billableDuration: { $sum: { $cond: ['$isBillable', '$duration', 0] } },
            nonBillableDuration: { $sum: { $cond: ['$isBillable', 0, '$duration'] } },
            entryCount: { $sum: 1 }
          }
        };
    }

    const report = await TimeLog.aggregate([
      { $match: filter },
      groupStage,
      { $sort: { totalDuration: -1 } }
    ]);

    // Populate user or task details if needed
    if (groupBy === 'user') {
      const User = await import('../models/User.js').then(module => module.default);
      const populatedReport = await Promise.all(
        report.map(async item => {
          const user = await User.findById(item._id).select('name email avatar');
          return { ...item, user };
        })
      );
      return res.json({
        success: true,
        data: populatedReport
      });
    }

    if (groupBy === 'task') {
      const populatedReport = await Promise.all(
        report.map(async item => {
          const task = await Task.findById(item._id).select('title status');
          return { ...item, task };
        })
      );
      return res.json({
        success: true,
        data: populatedReport
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

export default router;
