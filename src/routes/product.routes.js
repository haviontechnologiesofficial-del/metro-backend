const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createProductRules, updateProductRules } = require('../validations/product.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => productController.list(req, res, next));
router.get('/:id', (req, res, next) => productController.getById(req, res, next));
router.post('/', createProductRules, validationMiddleware, (req, res, next) => productController.create(req, res, next));
router.put('/:id', updateProductRules, validationMiddleware, (req, res, next) => productController.update(req, res, next));
router.delete('/:id', (req, res, next) => productController.delete(req, res, next));

module.exports = router;
