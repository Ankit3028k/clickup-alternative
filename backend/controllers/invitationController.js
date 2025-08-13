import asyncHandler from 'express-async-handler';
import TeamInvitation from '../models/TeamInvitation.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import { sendTeamInvitationEmail } from '../services/emailService.js';

// @desc    Send team invitation
// @route   POST /api/invitations/send
// @access  Private
const sendInvitation = asyncHandler(async (req, res) => {
  const { email, workspaceId, role = 'member', personalMessage } = req.body;
  const inviterId = req.user._id;

  // Validation
  if (!email || !workspaceId) {
    res.status(400);
    throw new Error('Please provide email and workspace ID');
  }

  // Check if workspace exists and user has permission to invite
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    res.status(404);
    throw new Error('Workspace not found');
  }

  // Check if user is a member of the workspace with appropriate permissions
  const userMembership = workspace.members.find(
    member => member.user.toString() === inviterId.toString()
  );

  if (!userMembership) {
    res.status(403);
    throw new Error('You are not a member of this workspace');
  }

  // Check if user has permission to invite (admin or manager)
  if (!['admin', 'manager'].includes(userMembership.role)) {
    res.status(403);
    throw new Error('You do not have permission to invite members to this workspace');
  }

  // Check if user is trying to invite themselves
  if (email.toLowerCase() === req.user.email.toLowerCase()) {
    res.status(400);
    throw new Error('You cannot invite yourself');
  }

  // Check if user is already a member of the workspace
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const isAlreadyMember = workspace.members.some(
      member => member.user.toString() === existingUser._id.toString()
    );
    
    if (isAlreadyMember) {
      res.status(400);
      throw new Error('User is already a member of this workspace');
    }
  }

  try {
    // Create invitation
    const invitation = await TeamInvitation.createInvitation({
      email: email.toLowerCase(),
      workspaceId,
      invitedBy: inviterId,
      role,
      inviterName: req.user.name,
      workspaceName: workspace.name,
      personalMessage
    });

    // Send invitation email
    const emailResult = await sendTeamInvitationEmail(
      email,
      req.user.name,
      workspace.name,
      invitation.token
    );

    if (!emailResult.success) {
      // If email sending fails, delete the invitation
      await TeamInvitation.findByIdAndDelete(invitation._id);
      res.status(500);
      throw new Error('Failed to send invitation email');
    }

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitation: {
          _id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt
        }
      }
    });

  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Accept team invitation
// @route   POST /api/invitations/accept/:token
// @access  Public
const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { userId } = req.body; // This will be provided after user registration/login

  if (!token) {
    res.status(400);
    throw new Error('Invitation token is required');
  }

  try {
    // Find invitation
    const invitation = await TeamInvitation.findByToken(token);
    
    // If userId is provided, use it; otherwise, check if user exists with invitation email
    let user;
    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        res.status(404);
        throw new Error('User not found');
      }
      
      // Verify that the user's email matches the invitation email
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        res.status(403);
        throw new Error('This invitation is not for your email address');
      }
    } else {
      // Check if user exists with the invitation email
      user = await User.findOne({ email: invitation.email });
      if (!user) {
        res.status(400);
        throw new Error('Please register or login first to accept this invitation');
      }
    }

    // Check if user's email is verified
    if (!user.emailVerified) {
      res.status(400);
      throw new Error('Please verify your email address before accepting invitations');
    }

    // Accept invitation
    await invitation.accept(user._id);

    // Add user to workspace
    const workspace = await Workspace.findById(invitation.workspaceId);
    workspace.members.push({
      user: user._id,
      role: invitation.role,
      joinedAt: new Date()
    });
    await workspace.save();

    // Add workspace to user's workspaces
    if (!user.workspaces.includes(workspace._id)) {
      user.workspaces.push(workspace._id);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        workspace: {
          _id: workspace._id,
          name: workspace.name,
          description: workspace.description,
          role: invitation.role
        },
        user: {
          _id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });

  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Get invitation details by token
// @route   GET /api/invitations/:token
// @access  Public
const getInvitationDetails = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    res.status(400);
    throw new Error('Invitation token is required');
  }

  try {
    const invitation = await TeamInvitation.findByToken(token);
    
    res.json({
      success: true,
      data: {
        invitation: {
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          metadata: invitation.metadata
        },
        workspace: {
          _id: invitation.workspaceId._id,
          name: invitation.workspaceId.name,
          description: invitation.workspaceId.description
        },
        inviter: {
          name: invitation.invitedBy.name
        }
      }
    });

  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Decline team invitation
// @route   POST /api/invitations/decline/:token
// @access  Public
const declineInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    res.status(400);
    throw new Error('Invitation token is required');
  }

  try {
    const invitation = await TeamInvitation.findByToken(token);
    await invitation.decline();

    res.json({
      success: true,
      message: 'Invitation declined successfully'
    });

  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Get workspace invitations (for workspace admins)
// @route   GET /api/invitations/workspace/:workspaceId
// @access  Private
const getWorkspaceInvitations = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user._id;

  // Check if workspace exists and user has permission
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    res.status(404);
    throw new Error('Workspace not found');
  }

  const userMembership = workspace.members.find(
    member => member.user.toString() === userId.toString()
  );

  if (!userMembership || !['admin', 'manager'].includes(userMembership.role)) {
    res.status(403);
    throw new Error('You do not have permission to view invitations for this workspace');
  }

  const invitations = await TeamInvitation.find({ workspaceId })
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });

  const stats = await TeamInvitation.getStats(workspaceId);

  res.json({
    success: true,
    data: {
      invitations,
      stats
    }
  });
});

export {
  sendInvitation,
  acceptInvitation,
  getInvitationDetails,
  declineInvitation,
  getWorkspaceInvitations
};
