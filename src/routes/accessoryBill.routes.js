const express = require('express');
const router = express.Router();
const accessoryBillController = require('../controllers/accessoryBill.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createAccessoryBillRules } = require('../validations/accessoryBill.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => accessoryBillController.list(req, res, next));
router.get('/:id', (req, res, next) => accessoryBillController.getById(req, res, next));
router.post('/', createAccessoryBillRules, validationMiddleware, (req, res, next) => accessoryBillController.create(req, res, next));
router.put('/:id', createAccessoryBillRules, validationMiddleware, (req, res, next) => accessoryBillController.update(req, res, next));
router.delete('/:id', (req, res, next) => accessoryBillController.delete(req, res, next));

module.exports = router;
