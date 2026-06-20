const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brand.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { createBrandRules, updateBrandRules } = require('../validations/brand.validation');

router.use(authMiddleware);

router.get('/', (req, res, next) => brandController.list(req, res, next));
router.get('/:id', (req, res, next) => brandController.getById(req, res, next));
router.post('/', createBrandRules, validationMiddleware, (req, res, next) => brandController.create(req, res, next));
router.put('/:id', updateBrandRules, validationMiddleware, (req, res, next) => brandController.update(req, res, next));
router.delete('/:id', (req, res, next) => brandController.delete(req, res, next));

module.exports = router;
