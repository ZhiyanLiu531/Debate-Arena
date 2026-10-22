import express from 'express';
import {
  startAIDebate,
  getAIDebate,
  sendMessageToAI,
  getUserAIDebates,
  endAIDebate,
  evaluateAIDebate
} from '../controllers/aiDebateController.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import * as aiDebateMiddleware from '../middleware/aiDebateMiddleware.mjs';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/ai-debates - Start a new AI debate
router.post('/', requireAuth, aiDebateMiddleware.validateStartAIDebate, startAIDebate);

// GET /api/ai-debates - Get all AI debates for the current user
router.get('/', requireAuth, aiDebateMiddleware.validateGetUserDebates, getUserAIDebates);

// GET /api/ai-debates/:debateId - Get a specific AI debate
router.get('/:debateId', requireAuth, aiDebateMiddleware.validateGetAIDebate, getAIDebate);

// POST /api/ai-debates/:debateId/message - Send a message and get AI response
router.post('/:debateId/message', requireAuth, aiDebateMiddleware.validateSendMessage, sendMessageToAI);

// POST /api/ai-debates/:debateId/end - End an AI debate
router.post('/:debateId/end', requireAuth, aiDebateMiddleware.validateEndAIDebate, endAIDebate);

// GET /api/ai-debates/:debateId/evaluate - Evaluate a completed AI debate
router.get('/:debateId/evaluate', requireAuth, aiDebateMiddleware.validateGetAIDebate, evaluateAIDebate);

export default router;
