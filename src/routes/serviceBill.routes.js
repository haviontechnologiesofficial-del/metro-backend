const express = require('express');
const router = express.Router();
const serviceBillController = require('../controllers/serviceBill.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createServiceBillRules } = require('../validations/serviceBill.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => serviceBillController.list(req, res, next));
router.get('/:id', (req, res, next) => serviceBillController.getById(req, res, next));
router.post('/', createServiceBillRules, validationMiddleware, (req, res, next) => serviceBillController.create(req, res, next));
router.put('/:id', createServiceBillRules, validationMiddleware, (req, res, next) => serviceBillController.update(req, res, next));
router.delete('/:id', (req, res, next) => serviceBillController.delete(req, res, next));

module.exports = router;
