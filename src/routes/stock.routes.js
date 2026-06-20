const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res, next) => stockController.listStockAdditions(req, res, next));
router.post('/', (req, res, next) => stockController.createStockAddition(req, res, next));
router.get('/movements/:productId', (req, res, next) => stockController.getProductMovements(req, res, next));

module.exports = router;
