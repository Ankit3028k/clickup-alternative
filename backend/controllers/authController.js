import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import Workspace from '../models/Workspace.js';
import generateToken from '../utils/generateToken.js';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate('workspaces');

  if (!user) {
    console.log(`Login attempt for email: ${email} - User not found.`);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check if email is verified before checking password
  if (!user.emailVerified) {
    console.log(`Login attempt for email: ${email} - Email not verified.`);
    res.status(401);
    throw new Error('Please verify your email address before logging in');
  }

  const isMatch = await user.matchPassword(password);
  console.log(`Login attempt for email: ${email} - Password match: ${isMatch}`);

  if (isMatch) {
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
          workspaces: user.workspaces
        },
        token: generateToken(user._id),
      }
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    if (userExists.emailVerified) {
      res.status(400);
      throw new Error('User already exists with this email');
    } else {
      // User exists but email not verified, allow re-registration
      await User.findByIdAndDelete(userExists._id);
    }
  }

  // Create user with unverified status
  const user = await User.create({
    name,
    email,
    password,
    status: 'pending',
    emailVerified: false
  });

  if (user) {
    // Generate and send OTP
    try {
      const otp = await OTP.createOTP(email, 'email_verification');
      const emailResult = await sendOTPEmail(email, otp, name);

      if (!emailResult.success) {
        // If email sending fails, still return success but log the error
        console.error('Failed to send OTP email:', emailResult.error);
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email for verification code.',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified
          },
          requiresVerification: true
        }
      });
    } catch (error) {
      // If OTP creation fails, delete the user and return error
      await User.findByIdAndDelete(user._id);
      res.status(500);
      throw new Error('Failed to send verification email. Please try again.');
    }
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error('Please provide email and OTP');
  }

  try {
    // Verify OTP
    await OTP.verifyOTP(email, otp, 'email_verification');

    // Find and update user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      res.status(400);
      throw new Error('Email is already verified');
    }

    // Update user verification status
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.status = 'active';
    await user.save();

    // Create default workspace for the user
    const workspace = await Workspace.create({
      name: `${user.name}'s Workspace`,
      description: 'Your personal workspace',
      owner: user._id,
      members: [{
        user: user._id,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    // Add workspace to user
    user.workspaces.push(workspace._id);
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(email, user.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
          workspaces: [workspace]
        },
        workspace: {
          _id: workspace._id,
          name: workspace.name,
          description: workspace.description
        },
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    // Increment failed attempts
    try {
      await OTP.incrementAttempts(email, otp, 'email_verification');
    } catch (incrementError) {
      console.error('Failed to increment OTP attempts:', incrementError);
    }

    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Resend OTP for email verification
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide email address');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    res.status(400);
    throw new Error('Email is already verified');
  }

  try {
    // Generate new OTP
    const otp = await OTP.createOTP(email, 'email_verification');
    const emailResult = await sendOTPEmail(email, otp, user.name);

    if (!emailResult.success) {
      res.status(500);
      throw new Error('Failed to send OTP email');
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email address'
    });

  } catch (error) {
    res.status(500);
    throw new Error(error.message || 'Failed to resend OTP');
  }
});

export { authUser, registerUser, verifyEmail, resendOTP };
