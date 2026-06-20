const { body } = require('express-validator');

const createSupplierRules = [
  body('name')
    .notEmpty().withMessage('Supplier name is required')
    .isString().withMessage('Supplier name must be a string')
];

const updateSupplierRules = [
  body('name')
    .optional({ values: 'falsy' })
    .isString().withMessage('Supplier name must be a string'),
  body('supplier_type')
    .optional({ values: 'falsy' })
    .isString().withMessage('Supplier type must be a string'),
  body('phone')
    .optional({ values: 'falsy' })
    .isString().withMessage('Phone must be a string'),
  body('pending_amount')
    .optional({ values: 'falsy' })
    .isNumeric().withMessage('Pending amount must be a number'),
  body('notes')
    .optional({ values: 'falsy' })
    .isString().withMessage('Notes must be a string'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

module.exports = {
  createSupplierRules,
  updateSupplierRules
};
