const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/summary', (req, res, next) => dashboardController.getSummary(req, res, next));
router.get('/charts', (req, res, next) => dashboardController.getCharts(req, res, next));
router.get('/profit-sheet', (req, res, next) => dashboardController.getProfitSheet(req, res, next));
router.get('/daily-balance-sheet', (req, res, next) => dashboardController.getDailyBalanceSheet(req, res, next));
router.get('/detailed-balance-sheet', (req, res, next) => dashboardController.getDetailedBalanceSheet(req, res, next));
router.post('/adjust-balance', (req, res, next) => dashboardController.adjustBalance(req, res, next));

module.exports = router;
