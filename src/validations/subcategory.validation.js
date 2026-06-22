const { body } = require('express-validator');

const createSubcategoryRules = [
  body('subcategory_name')
    .notEmpty().withMessage('Subcategory name is required')
    .isString().withMessage('Subcategory name must be a string'),
  body('category_id')
    .notEmpty().withMessage('Category ID is required')
    .isUUID().withMessage('Category ID must be a valid UUID')
];

const updateSubcategoryRules = [
  body('subcategory_name')
    .optional({ values: 'falsy' })
    .isString().withMessage('Subcategory name must be a string'),
  body('category_id')
    .optional({ values: 'falsy' })
    .isUUID().withMessage('Category ID must be a valid UUID'),
  body('description')
    .optional({ values: 'falsy' })
    .isString().withMessage('Description must be a string'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

module.exports = {
  createSubcategoryRules,
  updateSubcategoryRules
};
