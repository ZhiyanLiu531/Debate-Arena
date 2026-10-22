import { body, param, query, validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

export const validateGetTopics = [
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

export const validateCreateTopic = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ max: 100 }).withMessage('Category must be 100 characters or fewer'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer'),
  handleValidationErrors
];

export const validateGetChats = [
  param('topicId')
    .isMongoId().withMessage('topicId must be a valid MongoDB ObjectId'),
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