const BaseController = require('./base.controller');
const productService = require('../services/product.service');

class ProductController extends BaseController {
  constructor() {
    super(productService, ['name', 'sku_code', 'imei_1', 'imei_2', 'color', 'barcode']);
  }
}

module.exports = new ProductController();
