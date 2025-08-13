import express from 'express';
import mockDb from '../mockDb.js';

const router = express.Router();

// Start timer
router.post('/start', async (req, res) => {
  res.json({
    success: true,
    message: 'Timer started (mock)',
    data: {
      _id: 'timer_1',
      user: req.user._id,
      task: req.body.task,
      startTime: new Date(),
      isRunning: true
    }
  });
});

// Stop timer
router.post('/stop', async (req, res) => {
  res.json({
    success: true,
    message: 'Timer stopped (mock)',
    data: {
      _id: 'timer_1',
      user: req.user._id,
      duration: 3600, // 1 hour in seconds
      endTime: new Date()
    }
  });
});

// Get current timer
router.get('/current', async (req, res) => {
  res.json({
    success: true,
    data: null // No active timer
  });
});

// Get time stats
router.get('/stats', async (req, res) => {
  const stats = mockDb.getTimeStats(req.user._id);
  
  res.json({
    success: true,
    data: stats
  });
});

// Get time logs
router.get('/', async (req, res) => {
  const timeLogs = mockDb.findTimeLogs({ user: req.user._id });
  
  res.json({
    success: true,
    data: timeLogs
  });
});

// Add manual time
router.post('/manual', async (req, res) => {
  const { task, duration, description, date } = req.body;
  
  const timeLog = mockDb.createTimeLog({
    user: req.user._id,
    task,
    duration,
    description,
    date: date ? new Date(date) : new Date(),
    type: 'manual'
  });
  
  res.status(201).json({
    success: true,
    message: 'Manual time entry added',
    data: timeLog
  });
});

export default router;
