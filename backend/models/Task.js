import mongoose from 'mongoose';

const taskSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Workspace',
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['open', 'in progress', 'closed', 'on hold'],
    default: 'open',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  dueDate: {
    type: Date,
  },
  startDate: {
    type: Date,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
  timeLogs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeLog',
    },
  ],
},
{
  timestamps: true,
});

const Task = mongoose.model('Task', taskSchema);

export default Task;