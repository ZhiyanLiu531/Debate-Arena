import express from 'express';
import * as chatsController from '../controllers/chatsController.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import * as chatMiddleware from '../middleware/chatsMiddleware.mjs';

export const chatsRouter = express.Router();

chatsRouter.post('/', requireAuth, chatMiddleware.validateCreateRoom, chatsController.createRoom);
chatsRouter.get('/history', requireAuth, chatMiddleware.validateGetChatHistory, chatsController.getChatHistory);
chatsRouter.get('/:roomId', requireAuth, chatMiddleware.validateGetRoomById, chatsController.getRoomById);
chatsRouter.get('/:roomId/messages', requireAuth, chatMiddleware.validateGetMessages, chatsController.getMessages);
chatsRouter.get('/:roomId/poll', requireAuth, chatMiddleware.validatePollChat, chatsController.pollChat);
chatsRouter.post('/:roomId/join', requireAuth, chatMiddleware.validateJoinChat, chatsController.joinChat);
chatsRouter.post('/:roomId/end', requireAuth, chatMiddleware.validateLeaveChat, chatsController.leaveChat);
chatsRouter.post('/:roomId/message', requireAuth, chatMiddleware.validateSendMessage, chatsController.sendMessage);
chatsRouter.get('/:roomId/evaluate', requireAuth, chatMiddleware.validateEvaluate, chatsController.evaluateChat);