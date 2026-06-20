const JwtUtil = require('../utils/jwt.util');
const ApiResponse = require('../helpers/apiResponse.helper');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Authentication token missing or invalid format');
    }

    const token = authHeader.split(' ')[1];
    const decoded = JwtUtil.verifyToken(token);

    if (!decoded) {
      return ApiResponse.unauthorized(res, 'Token has expired or is invalid');
    }

    // Attach decoded user payload to request
    req.user = decoded;
    next();
  } catch (error) {
    return ApiResponse.error(res, 'Authentication failed', error, 401);
  }
};

module.exports = authMiddleware;
