const { userRepository } = require('../repositories');
const PasswordUtil = require('../utils/password.util');
const JwtUtil = require('../utils/jwt.util');
const ActivityLogService = require('./activityLog.service');

class AuthService {
  async login({ email, password, req }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new Error('Your account is currently inactive');
    }

    const isMatch = await PasswordUtil.verify(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      shop_name: user.shop_name
    };

    const accessToken = JwtUtil.generateToken(tokenPayload);
    const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);

    // Log Activity
    await ActivityLogService.log({
      moduleName: 'AUTH',
      moduleId: user.id,
      actionType: 'LOGIN',
      newData: { email: user.email, role: user.role },
      req: { user, headers: req.headers, socket: req.socket }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        shop_name: user.shop_name,
        logo: user.logo,
        phone: user.phone,
        address: user.address,
        role: user.role,
        status: user.status
      },
      accessToken,
      refreshToken
    };
  }

  async changePassword({ userId, oldPassword, newPassword, req }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await PasswordUtil.verify(oldPassword, user.password);
    if (!isMatch) {
      throw new Error('Incorrect current password');
    }

    const hashedPassword = await PasswordUtil.hash(newPassword);
    
    const oldData = { password: '***' };
    user.password = hashedPassword;
    await user.save();

    await ActivityLogService.log({
      moduleName: 'AUTH',
      moduleId: user.id,
      actionType: 'PASSWORD_CHANGE',
      oldData,
      newData: { password: '***' },
      req
    });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      shop_name: user.shop_name,
      logo: user.logo,
      phone: user.phone,
      address: user.address,
      role: user.role,
      status: user.status
    };
  }

  async updateProfile({ userId, updateData, req }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldData = user.toJSON();
    
    // Prevent modifying role or status via standard profile update
    delete updateData.role;
    delete updateData.status;
    delete updateData.password;

    await user.update(updateData);
    const newData = user.toJSON();

    await ActivityLogService.log({
      moduleName: 'AUTH',
      moduleId: user.id,
      actionType: 'PROFILE_UPDATE',
      oldData,
      newData,
      req
    });

    return {
      id: user.id,
      email: user.email,
      shop_name: user.shop_name,
      logo: user.logo,
      phone: user.phone,
      address: user.address,
      role: user.role
    };
  }

  async updateLogo({ userId, logoPath, req }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldData = { logo: user.logo };
    user.logo = logoPath;
    await user.save();

    await ActivityLogService.log({
      moduleName: 'AUTH',
      moduleId: user.id,
      actionType: 'LOGO_UPDATE',
      oldData,
      newData: { logo: logoPath },
      req
    });

    return { logo: logoPath };
  }
}

module.exports = new AuthService();
