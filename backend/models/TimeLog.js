import mongoose from 'mongoose';

const timeLogSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Task',
  },
  duration: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
  },
},
{
  timestamps: true,
});

const TimeLog = mongoose.model('TimeLog', timeLogSchema);

export default TimeLog;