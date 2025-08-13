import express from 'express';
const router = express.Router();
import { authUser, registerUser, verifyEmail, resendOTP } from '../controllers/authController.js';

router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);

export default router;