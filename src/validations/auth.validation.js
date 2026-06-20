const { body } = require('express-validator');

const loginRules = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const changePasswordRules = [
  body('oldPassword')
    .notEmpty().withMessage('Old password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
];

const updateProfileRules = [
  body('email')
    .optional({ values: 'falsy' })
    .isEmail().withMessage('Must be a valid email address'),
  body('shop_name').optional({ values: 'falsy' }).isString(),
  body('phone').optional({ values: 'falsy' }).isString(),
  body('address').optional({ values: 'falsy' }).isString()
];

module.exports = {
  loginRules,
  changePasswordRules,
  updateProfileRules
};
