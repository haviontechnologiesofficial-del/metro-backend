const { body } = require('express-validator');

const createMobileSaleRules = [
  body('type')
    .optional()
    .isIn(['retail', 'wholesale']).withMessage('Type must be retail or wholesale'),
  body('items')
    .optional()
    .isArray().withMessage('Items must be an array'),
  body('items.*.product_id')
    .optional()
    .isUUID().withMessage('Product ID must be a valid UUID'),
  body('items.*.qty')
    .optional()
    .isInt({ min: 1 }).withMessage('Qty must be at least 1'),
  body('items.*.unit_price')
    .optional()
    .isNumeric().withMessage('Unit price must be a numeric value'),
  body('items.*.imei_1')
    .custom((value, { req }) => {
      if (req.body.status === 'final' && (!value || value.trim() === '')) {
        throw new Error('IMEI 1 is mandatory for mobile items on finalized sales');
      }
      return true;
    })
];

module.exports = {
  createMobileSaleRules
};
