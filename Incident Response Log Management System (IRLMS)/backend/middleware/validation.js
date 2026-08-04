const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const incidentValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required'),
  body('typeId')
    .isInt({ min: 1 }).withMessage('Valid Type ID is required'),
  body('severityId')
    .isInt({ min: 1, max: 4 }).withMessage('Severity must be 1-4'),
  body('assetId')
    .optional()
    .isInt({ min: 1 }).withMessage('Valid Asset ID required'),
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

module.exports = { incidentValidation, loginValidation, handleValidationErrors };