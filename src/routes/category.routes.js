const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createCategoryRules, updateCategoryRules } = require('../validations/category.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => categoryController.list(req, res, next));
router.get('/:id', (req, res, next) => categoryController.getById(req, res, next));
router.post('/', createCategoryRules, validationMiddleware, (req, res, next) => categoryController.create(req, res, next));
router.put('/:id', updateCategoryRules, validationMiddleware, (req, res, next) => categoryController.update(req, res, next));
router.delete('/:id', (req, res, next) => categoryController.delete(req, res, next));

module.exports = router;
