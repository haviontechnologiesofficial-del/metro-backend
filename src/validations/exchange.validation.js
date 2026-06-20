const { body } = require('express-validator');

const createExchangeRules = [
  body('exchange_value')
    .notEmpty().withMessage('Exchange value is required')
    .isNumeric().withMessage('Exchange value must be a numeric value')
];

module.exports = {
  createExchangeRules
};
