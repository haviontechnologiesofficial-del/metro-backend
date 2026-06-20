const BaseController = require('./base.controller');
const brandService = require('../services/brand.service');

class BrandController extends BaseController {
  constructor() {
    super(brandService, ['brand_name', 'description']);
  }
}

module.exports = new BrandController();
