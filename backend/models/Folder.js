import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Folder name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  space: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Space',
    required: true
  },
  lists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    inheritSpaceSettings: {
      type: Boolean,
      default: true
    }
  },
  color: {
    type: String,
    default: '#F59E0B'
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
folderSchema.index({ space: 1 });

const Folder = mongoose.model('Folder', folderSchema);

export default Folder;
