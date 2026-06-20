const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/sales', (req, res, next) => reportController.getSalesReport(req, res, next));
router.get('/service', (req, res, next) => reportController.getServiceReport(req, res, next));
router.get('/expense', (req, res, next) => reportController.getExpenseReport(req, res, next));
router.get('/exchange', (req, res, next) => reportController.getExchangeReport(req, res, next));
router.get('/stock', (req, res, next) => reportController.getStockReport(req, res, next));
router.get('/overall', (req, res, next) => reportController.getOverallReport(req, res, next));
router.get('/category/:categoryId', (req, res, next) => reportController.getCategoryReport(req, res, next));

module.exports = router;
