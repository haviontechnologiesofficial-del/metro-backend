const authService = require('../services/auth.service');
const ApiResponse = require('../helpers/apiResponse.helper');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password, req });
      return ApiResponse.success(res, 'Login successful', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;
      const result = await authService.changePassword({ userId, oldPassword, newPassword, req });
      return ApiResponse.success(res, 'Password changed successfully', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const profile = await authService.getProfile(userId);
      return ApiResponse.success(res, 'Profile retrieved successfully', profile);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      const result = await authService.updateProfile({ userId, updateData, req });
      return ApiResponse.success(res, 'Profile updated successfully', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async uploadLogo(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.badRequest(res, 'Logo file is required');
      }
      
      const userId = req.user.id;
      // Express multer path (Windows format with forward slashes for URL friendliness)
      const logoPath = req.file.path.replace(/\\/g, '/');
      const result = await authService.updateLogo({ userId, logoPath, req });
      
      return ApiResponse.success(res, 'Logo uploaded successfully', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }
}

module.exports = new AuthController();
