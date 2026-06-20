const ApiResponse = require('../helpers/apiResponse.helper');
const logger = require('../utils/logger.util');

const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error
  logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip} \nStack: ${err.stack}`);

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errorDetails = err.errors.map(e => ({ field: e.path, message: `${e.path} already exists.` }));
    return ApiResponse.validationError(res, errorDetails, 'Unique constraint validation failed');
  }

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const errorDetails = err.errors.map(e => ({ field: e.path, message: e.message }));
    return ApiResponse.validationError(res, errorDetails, 'Database validation failed');
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return ApiResponse.badRequest(res, 'Database foreign key constraint violation. Ensure referenced record exists.');
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid JWT token');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Expired JWT token');
  }

  return ApiResponse.error(res, err.message, err, err.statusCode);
};

module.exports = errorMiddleware;
