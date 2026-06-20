const { body } = require('express-validator');

const createProductRules = [
  body('name')
    .notEmpty().withMessage('Product name is required')
    .isString().withMessage('Product name must be a string')
];

const updateProductRules = [
  body('name').optional({ values: 'falsy' }).isString(),
  body('sku_code').optional({ values: 'falsy' }).isString(),
  body('category_id').optional({ values: 'falsy' }).isUUID().withMessage('Category ID must be a valid UUID'),
  body('brand_id').optional({ values: 'falsy' }).isUUID().withMessage('Brand ID must be a valid UUID'),
  body('phone_condition').optional({ values: 'falsy' }).isString(),
  body('supplier_id').optional({ values: 'falsy' }).isUUID().withMessage('Supplier ID must be a valid UUID'),
  body('initial_stock_qty').optional({ values: 'falsy' }).isInt({ min: 0 }),
  body('current_stock_qty').optional({ values: 'falsy' }).isInt({ min: 0 }),
  body('cost_price').optional({ values: 'falsy' }).isNumeric(),
  body('selling_price').optional({ values: 'falsy' }).isNumeric(),
  body('imei_1').optional({ values: 'falsy' }).isString(),
  body('imei_2').optional({ values: 'falsy' }).isString(),
  body('color').optional({ values: 'falsy' }).isString(),
  body('barcode').optional({ values: 'falsy' }).isString(),
  body('status').optional({ values: 'falsy' }).isIn(['active', 'inactive', 'sold'])
];

module.exports = {
  createProductRules,
  updateProductRules
};
