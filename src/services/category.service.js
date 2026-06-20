const BaseService = require('./base.service');
const { categoryRepository } = require('../repositories');

class CategoryService extends BaseService {
  constructor() {
    super(categoryRepository, 'CATEGORY');
  }
}

module.exports = new CategoryService();
