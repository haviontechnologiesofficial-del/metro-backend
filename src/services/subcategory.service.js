const BaseService = require('./base.service');
const { subcategoryRepository } = require('../repositories');

class SubcategoryService extends BaseService {
  constructor() {
    super(subcategoryRepository, 'SUBCATEGORY');
  }
}

module.exports = new SubcategoryService();
