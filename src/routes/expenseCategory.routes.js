const express = require('express');
const router = express.Router();
const expenseCategoryController = require('../controllers/expenseCategory.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createExpenseCategoryRules } = require('../validations/expenseCategory.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => expenseCategoryController.list(req, res, next));
router.get('/:id', (req, res, next) => expenseCategoryController.getById(req, res, next));
router.post('/', createExpenseCategoryRules, validationMiddleware, (req, res, next) => expenseCategoryController.create(req, res, next));
router.put('/:id', createExpenseCategoryRules, validationMiddleware, (req, res, next) => expenseCategoryController.update(req, res, next));
router.delete('/:id', (req, res, next) => expenseCategoryController.delete(req, res, next));

module.exports = router;
