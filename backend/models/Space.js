import mongoose from 'mongoose';

const spaceSchema = mongoose.Schema({
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
  folders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder', // Assuming a Folder model will be created
    },
  ],
},
{
  timestamps: true,
});

const Space = mongoose.model('Space', spaceSchema);

export default Space;