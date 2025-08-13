import mongoose from 'mongoose';

const commentSchema = mongoose.Schema({
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
  content: {
    type: String,
    required: true,
  },
},
{
  timestamps: true,
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;