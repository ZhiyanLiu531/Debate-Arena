import { body, param, query, validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

export const validateCreateRoom = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer'),
  body('topicId')
    .notEmpty().withMessage('topicId is required')
    .isMongoId().withMessage('topicId must be a valid MongoDB ObjectId'),
  body('hostSide')
    .trim()
    .notEmpty().withMessage('hostSide is required')
    .isIn(['pro', 'con']).withMessage('hostSide must be "pro" or "con"'),
  handleValidationErrors
];

export const validateGetRoomById = [
  param('roomId')
    .isMongoId().withMessage('roomId must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

export const validateJoinChat = [
  param('roomId')
    .isMongoId().withMessage('roomId must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

export const validateLeaveChat = [
  param('roomId')
    .isMongoId().withMessage('roomId must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

export const validatePollChat = [
  param('roomId')
    .isMongoId().withMessage('roomId must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

export const validateSendMessage = [
  param('roomId')
    .isMongoId().withMessage('roomId must be a valid MongoDB ObjectId'),
  body('text')
    .trim()
    .notEmpty().withMessage('Message text cannot be empty')
    .isLength({ max: 2000 }).withMessage('Message must be 2000 characters or fewer'),
  handleValidationErrors
];

export const validateGetMessages = [
  param('roomId')
    .isMongoId().withMessage('roomId must be a valid MongoDB ObjectId'),
  query('page')
    .optional()
    .isInt({ min: 0 }).withMessage('page must be a non-negative integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
    .toInt(),
  handleValidationErrors
];

export const validateGetChatHistory = [
  query('page')
    .optional()
    .isInt({ min: 0 }).withMessage('page must be a non-negative integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
    .toInt(),
  handleValidationErrors
];

export const validateEvaluate = [
  param('roomId')
    .isMongoId().withMessage('roomId must be a valid MongoDB ObjectId'),
  handleValidationErrors
];