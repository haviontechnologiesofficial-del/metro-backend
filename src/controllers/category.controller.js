const BaseController = require('./base.controller');
const categoryService = require('../services/category.service');

class CategoryController extends BaseController {
  constructor() {
    super(categoryService, ['category_name', 'description']);
  }
}

module.exports = new CategoryController();
