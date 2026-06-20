const { body } = require('express-validator');

const createExpenseCategoryRules = [
  body('name')
    .notEmpty().withMessage('Expense Category name is required')
    .isString().withMessage('Expense Category name must be a string')
];

module.exports = {
  createExpenseCategoryRules
};
