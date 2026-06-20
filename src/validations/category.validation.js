const { body } = require('express-validator');

const createCategoryRules = [
  body('category_name')
    .notEmpty().withMessage('Category name is required')
    .isString().withMessage('Category name must be a string')
];

const updateCategoryRules = [
  body('category_name')
    .optional({ values: 'falsy' })
    .isString().withMessage('Category name must be a string'),
  body('description')
    .optional({ values: 'falsy' })
    .isString().withMessage('Description must be a string'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

module.exports = {
  createCategoryRules,
  updateCategoryRules
};
