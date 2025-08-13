import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    default: 'email_verification'
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }
}, {
  timestamps: true
});

// Index for faster queries
otpSchema.index({ email: 1, purpose: 1 });
otpSchema.index({ otp: 1 });

// Static method to generate OTP
otpSchema.statics.generateOTP = function(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

// Static method to create and save OTP
otpSchema.statics.createOTP = async function(email, purpose = 'email_verification') {
  const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  
  // Delete any existing OTPs for this email and purpose
  await this.deleteMany({ email, purpose });
  
  const otp = this.generateOTP(otpLength);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  const otpDoc = new this({
    email,
    otp,
    purpose,
    expiresAt
  });
  
  await otpDoc.save();
  return otp;
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp, purpose = 'email_verification') {
  const otpDoc = await this.findOne({
    email,
    otp,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!otpDoc) {
    // Check if there's an expired or used OTP to provide better error message
    const expiredOTP = await this.findOne({ email, otp, purpose });
    if (expiredOTP) {
      if (expiredOTP.isUsed) {
        throw new Error('OTP has already been used');
      } else {
        throw new Error('OTP has expired');
      }
    }
    throw new Error('Invalid OTP');
  }
  
  // Check attempts limit
  if (otpDoc.attempts >= 5) {
    throw new Error('Too many failed attempts. Please request a new OTP');
  }
  
  // Mark as used
  otpDoc.isUsed = true;
  await otpDoc.save();
  
  return true;
};

// Static method to increment failed attempts
otpSchema.statics.incrementAttempts = async function(email, otp, purpose = 'email_verification') {
  await this.updateOne(
    { email, otp, purpose },
    { $inc: { attempts: 1 } }
  );
};

export default mongoose.model('OTP', otpSchema);
