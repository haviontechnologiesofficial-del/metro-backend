const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLog.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);
router.use(roleMiddleware('admin')); // Only admins can view audit logs

router.get('/', (req, res, next) => activityLogController.list(req, res, next));
router.get('/:id', (req, res, next) => activityLogController.getById(req, res, next));

module.exports = router;
