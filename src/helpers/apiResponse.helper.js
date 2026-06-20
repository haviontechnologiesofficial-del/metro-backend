/**
 * Standard API Response Helper
 */
class ApiResponse {
  static success(res, message = 'Success', data = {}, meta = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta
    });
  }

  static error(res, message = 'Internal Server Error', error = null, statusCode = 500) {
    const response = {
      success: false,
      message,
    };
    if (error && process.env.NODE_ENV === 'development') {
      response.error = error.message || error;
      response.stack = error.stack;
    }
    return res.status(statusCode).json(response);
  }

  static validationError(res, errors, message = 'Validation Failed') {
    return res.status(400).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors]
    });
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, null, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, null, 403);
  }

  static notFound(res, message = 'Resource Not Found') {
    return this.error(res, message, null, 404);
  }

  static badRequest(res, message = 'Bad Request') {
    return this.error(res, message, null, 400);
  }
}

module.exports = ApiResponse;
