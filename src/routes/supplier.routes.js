const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createSupplierRules, updateSupplierRules } = require('../validations/supplier.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => supplierController.list(req, res, next));
router.get('/:id', (req, res, next) => supplierController.getById(req, res, next));
router.get('/:id/ledger', (req, res, next) => supplierController.getLedger(req, res, next));
router.post('/:id/recalculate-pending', (req, res, next) => supplierController.recalculatePending(req, res, next));
router.post('/', createSupplierRules, validationMiddleware, (req, res, next) => supplierController.create(req, res, next));
router.put('/:id', updateSupplierRules, validationMiddleware, (req, res, next) => supplierController.update(req, res, next));
router.delete('/:id', (req, res, next) => supplierController.delete(req, res, next));

module.exports = router;

