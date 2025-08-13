import mongoose from 'mongoose';

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'List name is required'],
    trim: true,
    maxlength: [100, 'List name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: true
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    inheritFolderSettings: {
      type: Boolean,
      default: true
    },
    defaultView: {
      type: String,
      enum: ['list', 'kanban', 'calendar', 'gantt'],
      default: 'list'
    }
  },
  color: {
    type: String,
    default: '#EF4444'
  },
  icon: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add indexes for better performance
listSchema.index({ folder: 1 });

const List = mongoose.model('List', listSchema);

export default List;
