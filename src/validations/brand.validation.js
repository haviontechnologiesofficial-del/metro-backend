const { body } = require('express-validator');

const createBrandRules = [
  body('brand_name')
    .notEmpty().withMessage('Brand name is required')
    .isString().withMessage('Brand name must be a string')
];

const updateBrandRules = [
  body('brand_name')
    .optional({ values: 'falsy' })
    .isString().withMessage('Brand name must be a string'),
  body('description')
    .optional({ values: 'falsy' })
    .isString().withMessage('Description must be a string'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

module.exports = {
  createBrandRules,
  updateBrandRules
};
