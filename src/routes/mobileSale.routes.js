const express = require('express');
const router = express.Router();
const mobileSaleController = require('../controllers/mobileSale.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createMobileSaleRules } = require('../validations/mobileSale.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => mobileSaleController.list(req, res, next));
router.get('/:id', (req, res, next) => mobileSaleController.getById(req, res, next));
router.post('/', createMobileSaleRules, validationMiddleware, (req, res, next) => mobileSaleController.create(req, res, next));
router.put('/:id', createMobileSaleRules, validationMiddleware, (req, res, next) => mobileSaleController.update(req, res, next));
router.delete('/:id', (req, res, next) => mobileSaleController.delete(req, res, next));

module.exports = router;
