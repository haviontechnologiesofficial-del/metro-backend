const ApiResponse = require('../helpers/apiResponse.helper');

/**
 * Middleware to restrict access based on user role
 * @param {Array<string>|string} allowedRoles - Single role or array of roles permitted to access route
 */
const roleMiddleware = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(res, 'You do not have permission to perform this action');
    }

    next();
  };
};

module.exports = roleMiddleware;
