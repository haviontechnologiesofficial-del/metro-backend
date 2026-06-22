const { body } = require('express-validator');

const createAccessoryBillRules = [
  body('type')
    .optional()
    .isIn(['myself', 'near_shop']).withMessage('Type must be myself or near_shop'),
  body('supplier_name')
    .custom((value, { req }) => {
      if (req.body.type === 'near_shop' && (!value || value.trim() === '')) {
        throw new Error('Supplier name is mandatory when type is near_shop');
      }
      return true;
    }),
  body('items')
    .optional()
    .isArray().withMessage('Items must be an array'),
  body('items.*.product_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Product ID must be a valid UUID'),
  body('items.*.qty')
    .optional()
    .isInt({ min: 1 }).withMessage('Qty must be at least 1'),
  body('items.*.unit_price')
    .optional()
    .isNumeric().withMessage('Unit price must be a numeric value')
];

module.exports = {
  createAccessoryBillRules
};
