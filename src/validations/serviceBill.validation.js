const { body } = require('express-validator');

const createServiceBillRules = [
  body('work_mode')
    .optional()
    .isIn(['self', 'outsourced']).withMessage('Work mode must be self or outsourced'),
  body('supplier_id')
    .custom((value, { req }) => {
      if (req.body.work_mode === 'outsourced' && (!value || value.trim() === '')) {
        throw new Error('Supplier ID is mandatory when work mode is outsourced');
      }
      return true;
    }),
  body('total_amount')
    .optional()
    .isNumeric().withMessage('Total amount must be a numeric value'),
  body('supplier_amount')
    .custom((value, { req }) => {
      if (req.body.work_mode === 'outsourced' && (!value || isNaN(parseFloat(value)))) {
        throw new Error('Supplier amount is mandatory when work mode is outsourced');
      }
      return true;
    })
];

module.exports = {
  createServiceBillRules
};
