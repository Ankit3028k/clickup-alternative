import express from 'express';
import {
  sendInvitation,
  acceptInvitation,
  getInvitationDetails,
  declineInvitation,
  getWorkspaceInvitations
} from '../controllers/invitationController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.post('/send', authMiddleware, sendInvitation);
router.get('/workspace/:workspaceId', authMiddleware, getWorkspaceInvitations);

// Public routes (for invitation handling)
router.get('/:token', getInvitationDetails);
router.post('/accept/:token', acceptInvitation);
router.post('/decline/:token', declineInvitation);

export default router;
