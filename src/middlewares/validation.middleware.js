const { validationResult } = require('express-validator');
const ApiResponse = require('../helpers/apiResponse.helper');

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorFormatter = ({ msg, path }) => {
      return { field: path, message: msg };
    };
    return ApiResponse.validationError(res, errors.formatWith(errorFormatter).array(), 'Validation failed');
  }
  next();
};

module.exports = validationMiddleware;
