const { body } = require('express-validator');

const createExpenseRules = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isNumeric().withMessage('Amount must be a numeric value'),
  body('expense_type')
    .optional()
    .isIn(['general', 'supplier_payment', 'exchange']).withMessage('Invalid expense type'),
  body('date')
    .optional()
    .isDate().withMessage('Date must be a valid date format')
];

const updateExpenseRules = [
  body('amount').optional({ values: 'falsy' }).isNumeric(),
  body('cash_amount').optional({ values: 'falsy' }).isNumeric(),
  body('online_amount').optional({ values: 'falsy' }).isNumeric(),
  body('expense_type').optional({ values: 'falsy' }).isIn(['general', 'supplier_payment', 'exchange']),
  body('date').optional({ values: 'falsy' }).isDate(),
  body('expense_category_id').optional({ values: 'falsy' }).isUUID().withMessage('Expense category ID must be UUID'),
  body('supplier_id').optional({ values: 'falsy' }).isUUID().withMessage('Supplier ID must be UUID')
];

module.exports = {
  createExpenseRules,
  updateExpenseRules
};
