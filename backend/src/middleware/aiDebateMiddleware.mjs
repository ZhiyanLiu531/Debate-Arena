import { body, param, query, validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

export const validateStartAIDebate = [
  body('topic')
    .trim()
    .notEmpty().withMessage('Topic is required')
    .isLength({ max: 300 }).withMessage('Topic must be 300 characters or fewer'),
  body('userSide')
    .trim()
    .notEmpty().withMessage('userSide is required')
    .isIn(['pro', 'con']).withMessage('userSide must be "pro" or "con"'),
  handleValidationErrors
];

export const validateGetAIDebate = [
  param('debateId')
    .isMongoId().withMessage('debateId must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

export const validateSendMessage = [
  param('debateId')
    .isMongoId().withMessage('debateId must be a valid MongoDB ObjectId'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message cannot be empty')
    .isLength({ max: 2000 }).withMessage('Message must be 2000 characters or fewer'),
  handleValidationErrors
];

export const validateGetUserDebates = [
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

export const validateEndAIDebate = [
  param('debateId')
    .isMongoId().withMessage('debateId must be a valid MongoDB ObjectId'),
  handleValidationErrors
];