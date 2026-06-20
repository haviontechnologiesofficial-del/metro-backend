const BaseService = require('./base.service');
const { brandRepository } = require('../repositories');

class BrandService extends BaseService {
  constructor() {
    super(brandRepository, 'BRAND');
  }
}

module.exports = new BrandService();
