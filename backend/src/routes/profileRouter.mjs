import express from 'express';
import * as profileController from '../controllers/profileController.mjs';
import { requireAuth } from '../middleware/auth.mjs';

export const profileRouter = express.Router();

// Profile management
profileRouter.get('/me', requireAuth, profileController.getProfile);
profileRouter.put('/me', requireAuth, profileController.updateProfile);

// Preferences
profileRouter.get('/preferences', requireAuth, profileController.getPreferences);
profileRouter.put('/preferences', requireAuth, profileController.updatePreferences);

// Privacy settings
profileRouter.get('/privacy', requireAuth, profileController.getPrivacy);
profileRouter.put('/privacy', requireAuth, profileController.updatePrivacy);

// Stats
profileRouter.get('/stats', requireAuth, profileController.getStats);

// Block/Mute management
profileRouter.post('/block/:userId', requireAuth, profileController.blockUser);
profileRouter.delete('/block/:userId', requireAuth, profileController.unblockUser);
profileRouter.get('/blocked', requireAuth, profileController.getBlockedUsers);

profileRouter.post('/mute/:userId', requireAuth, profileController.muteUser);
profileRouter.delete('/mute/:userId', requireAuth, profileController.unmuteUser);
profileRouter.get('/muted', requireAuth, profileController.getMutedUsers);

// Public profile - using /user/:username to avoid route conflicts
profileRouter.get('/user/:username', profileController.getPublicProfile);
