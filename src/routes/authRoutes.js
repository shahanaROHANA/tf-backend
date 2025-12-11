// import express from 'express';
// import { register, login, forgetPassword, resetPassword, googleAuth, googleAuthCallback } from '../controllers/authController.js';
// import { authLimiter, passwordResetLimiter } from '../middleware/rateLimitMiddleware.js';
// import passport from 'passport';

// const router = express.Router();

// // Auth routes
// router.post('/register', authLimiter, register);
// router.post('/login', login);
// router.post('/forget-password', passwordResetLimiter, forgetPassword);
// router.post('/reset-password', authLimiter, resetPassword);

// // Google OAuth routes
// router.get('/google', googleAuth);
// router.get('/google/callback', passport.authenticate('google', { session: false }), googleAuthCallback);

// export default router;
import express from 'express';
import passport from 'passport';

import { 
  register, 
  login, 
  forgetPassword, 
  resetPassword, 
  googleAuth, 
  googleAuthCallback,
  verifyToken 
} from '../controllers/authController.js';

import { 
  authLimiter, 
  passwordResetLimiter 
} from '../middleware/rateLimitMiddleware.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Auth routes
router.post('/register', authLimiter, register);
router.post('/login', login);
router.post('/forget-password', passwordResetLimiter, forgetPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Token verification route
router.get('/verify', protect, verifyToken);

// Google OAuth routes
router.get('/google', googleAuth);
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  googleAuthCallback
);

export default router;