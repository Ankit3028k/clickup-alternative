import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const temporaryUserSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png',
  },
  preferences: {
    theme: {
      type: String,
      default: 'light',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  // Automatically expire documents after 24 hours
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hours in seconds
  },
},
{
  timestamps: true,
});

// Index for faster queries and automatic cleanup
temporaryUserSchema.index({ email: 1 });
temporaryUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash password before saving
temporaryUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
temporaryUserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Static method to create temporary user
temporaryUserSchema.statics.createTemporaryUser = async function(userData) {
  // Remove any existing temporary user with the same email
  await this.deleteMany({ email: userData.email });
  
  // Create new temporary user
  const tempUser = new this(userData);
  await tempUser.save();
  return tempUser;
};

// Static method to move temporary user to permanent User collection
temporaryUserSchema.statics.promoteToUser = async function(email) {
  const User = mongoose.model('User');

  // Find temporary user
  const tempUser = await this.findOne({ email });
  if (!tempUser) {
    throw new Error('Temporary user not found');
  }

  // Create permanent user data
  const userData = {
    name: tempUser.name,
    email: tempUser.email,
    password: tempUser.password, // Already hashed
    avatar: tempUser.avatar,
    preferences: tempUser.preferences,
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date(),
  };

  // Create user and mark password as not modified to prevent re-hashing
  const user = new User(userData);

  // Mark password as not modified before saving to prevent re-hashing
  user.markModified('name');
  user.markModified('email');
  user.markModified('avatar');
  user.markModified('preferences');
  user.markModified('status');
  user.markModified('emailVerified');
  user.markModified('emailVerifiedAt');

  // Save without triggering password hash
  await user.save({ validateBeforeSave: false });

  // Remove temporary user
  await this.deleteOne({ email });

  return user;
};

const TemporaryUser = mongoose.model('TemporaryUser', temporaryUserSchema);

export default TemporaryUser;
