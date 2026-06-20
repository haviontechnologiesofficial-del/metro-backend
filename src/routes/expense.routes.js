const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createExpenseRules, updateExpenseRules } = require('../validations/expense.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => expenseController.list(req, res, next));
router.get('/:id', (req, res, next) => expenseController.getById(req, res, next));
router.post('/', createExpenseRules, validationMiddleware, (req, res, next) => expenseController.create(req, res, next));
router.put('/:id', updateExpenseRules, validationMiddleware, (req, res, next) => expenseController.update(req, res, next));
router.delete('/:id', (req, res, next) => expenseController.delete(req, res, next));
router.post('/:id/payments', (req, res, next) => expenseController.recordPayment(req, res, next));
router.get('/:id/payments', (req, res, next) => expenseController.getPayments(req, res, next));

module.exports = router;
