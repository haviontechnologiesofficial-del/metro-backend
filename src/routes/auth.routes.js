const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { loginRules, changePasswordRules, updateProfileRules } = require('../validations/auth.validation');

// Public
router.post('/login', loginRules, validationMiddleware, authController.login);

// Protected
router.use(authMiddleware);

router.post('/change-password', changePasswordRules, validationMiddleware, authController.changePassword);
router.get('/profile', authController.getProfile);
router.put('/profile', updateProfileRules, validationMiddleware, authController.updateProfile);
router.post('/upload-logo', uploadMiddleware.single('logo'), authController.uploadLogo);

module.exports = router;
