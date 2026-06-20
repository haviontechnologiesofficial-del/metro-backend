const express = require('express');
const router = express.Router();
const openBalanceController = require('../controllers/openBalance.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// CRUD operations for balance history records
router.get('/', (req, res, next) => openBalanceController.getAll(req, res, next));
router.get('/:id', (req, res, next) => openBalanceController.getById(req, res, next));
router.put('/:id', (req, res, next) => openBalanceController.update(req, res, next));
router.delete('/:id', (req, res, next) => openBalanceController.delete(req, res, next));

// Add/subtract cash/online amounts to overall balance
router.post('/add-cash-online', (req, res, next) => openBalanceController.addCashOnline(req, res, next));
router.post('/subtract-cash-online', (req, res, next) => openBalanceController.subtractCashOnline(req, res, next));

module.exports = router;