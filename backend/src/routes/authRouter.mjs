import express from 'express';
import * as authController from '../controllers/authController.mjs';
import { requireAuth } from '../middleware/auth.mjs';

export const authRouter = express.Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.get('/me', requireAuth, authController.getMe);
