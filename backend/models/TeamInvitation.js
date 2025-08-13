import mongoose from 'mongoose';
import crypto from 'crypto';

const teamInvitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['member', 'manager', 'admin'],
    default: 'member'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  metadata: {
    inviterName: String,
    workspaceName: String,
    personalMessage: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
teamInvitationSchema.index({ email: 1, workspaceId: 1 });
teamInvitationSchema.index({ token: 1 });
teamInvitationSchema.index({ status: 1 });
teamInvitationSchema.index({ invitedBy: 1 });

// Static method to generate secure token
teamInvitationSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Static method to create invitation
teamInvitationSchema.statics.createInvitation = async function(invitationData) {
  const {
    email,
    workspaceId,
    invitedBy,
    role = 'member',
    inviterName,
    workspaceName,
    personalMessage
  } = invitationData;
  
  const expiryHours = parseInt(process.env.INVITATION_EXPIRY_HOURS) || 72;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  
  // Check if there's already a pending invitation
  const existingInvitation = await this.findOne({
    email,
    workspaceId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
  
  if (existingInvitation) {
    throw new Error('An invitation has already been sent to this email for this workspace');
  }
  
  const token = this.generateToken();
  
  const invitation = new this({
    email,
    workspaceId,
    invitedBy,
    role,
    token,
    expiresAt,
    metadata: {
      inviterName,
      workspaceName,
      personalMessage
    }
  });
  
  await invitation.save();
  return invitation;
};

// Static method to find valid invitation by token
teamInvitationSchema.statics.findByToken = async function(token) {
  const invitation = await this.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('workspaceId invitedBy');
  
  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }
  
  return invitation;
};

// Instance method to accept invitation
teamInvitationSchema.methods.accept = async function(userId) {
  if (this.status !== 'pending') {
    throw new Error('Invitation is no longer pending');
  }
  
  if (this.expiresAt < new Date()) {
    this.status = 'expired';
    await this.save();
    throw new Error('Invitation has expired');
  }
  
  this.status = 'accepted';
  this.acceptedBy = userId;
  this.acceptedAt = new Date();
  
  await this.save();
  return this;
};

// Instance method to decline invitation
teamInvitationSchema.methods.decline = async function() {
  if (this.status !== 'pending') {
    throw new Error('Invitation is no longer pending');
  }
  
  this.status = 'declined';
  await this.save();
  return this;
};

// Static method to cleanup expired invitations
teamInvitationSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );
  
  return result.modifiedCount;
};

// Static method to get invitation statistics
teamInvitationSchema.statics.getStats = async function(workspaceId) {
  const stats = await this.aggregate([
    { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    pending: 0,
    accepted: 0,
    declined: 0,
    expired: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
  });
  
  return result;
};

export default mongoose.model('TeamInvitation', teamInvitationSchema);
