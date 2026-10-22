import express from 'express';
import * as topicsController from '../controllers/topicsController.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import * as topicsMiddleware from '../middleware/topicsMiddleware.mjs'

export const topicsRouter = express.Router();

topicsRouter.get('/', requireAuth, topicsMiddleware.validateGetTopics, topicsController.getTopics);
topicsRouter.post('/', requireAuth, topicsMiddleware.validateCreateTopic, topicsController.createTopic);
topicsRouter.get('/:topicId/chats', topicsMiddleware.validateGetChats, requireAuth, topicsController.getChats);