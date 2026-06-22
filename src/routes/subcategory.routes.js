const express = require('express');
const router = express.Router();
const subcategoryController = require('../controllers/subcategory.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createSubcategoryRules, updateSubcategoryRules } = require('../validations/subcategory.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => subcategoryController.list(req, res, next));
router.get('/:id', (req, res, next) => subcategoryController.getById(req, res, next));
router.post('/', createSubcategoryRules, validationMiddleware, (req, res, next) => subcategoryController.create(req, res, next));
router.put('/:id', updateSubcategoryRules, validationMiddleware, (req, res, next) => subcategoryController.update(req, res, next));
router.delete('/:id', (req, res, next) => subcategoryController.delete(req, res, next));

module.exports = router;
