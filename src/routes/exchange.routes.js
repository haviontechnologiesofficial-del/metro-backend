const express = require('express');
const router = express.Router();
const exchangeController = require('../controllers/exchange.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createExchangeRules } = require('../validations/exchange.validation');

router.use(authMiddleware);

const uploadFields = uploadMiddleware.fields([
  { name: 'customer_photo', maxCount: 1 },
  { name: 'id_proof_file', maxCount: 1 },
  { name: 'device_photos', maxCount: 5 }
]);

router.get('/', (req, res, next) => exchangeController.list(req, res, next));
router.get('/:id', (req, res, next) => exchangeController.getById(req, res, next));
router.post('/', uploadFields, createExchangeRules, validationMiddleware, (req, res, next) => exchangeController.create(req, res, next));
router.put('/:id', uploadFields, createExchangeRules, validationMiddleware, (req, res, next) => exchangeController.update(req, res, next));
router.delete('/:id', (req, res, next) => exchangeController.delete(req, res, next));

module.exports = router;
