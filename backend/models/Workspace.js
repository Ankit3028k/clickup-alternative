import mongoose from 'mongoose';

const workspaceSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
      },
      role: {
        type: String,
        enum: ['admin', 'member', 'guest'],
        default: 'member',
      },
    },
  ],
  color: {
    type: String,
    default: '#007bff',
  },
  icon: {
    type: String,
    default: 'briefcase',
  },
  spaces: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
    },
  ],
  settings: {
    taskStatuses: [
      {
        name: { type: String, required: true },
        color: { type: String, required: true },
        order: { type: Number, required: true },
      },
    ],
    taskPriorities: [
      {
        name: { type: String, required: true },
        color: { type: String, required: true },
        order: { type: Number, required: true },
      },
    ],
  },
},
{
  timestamps: true,
});

const Workspace = mongoose.model('Workspace', workspaceSchema);

export default Workspace;
