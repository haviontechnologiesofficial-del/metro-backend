const BaseController = require('./base.controller');
const subcategoryService = require('../services/subcategory.service');

class SubcategoryController extends BaseController {
  constructor() {
    super(subcategoryService, ['subcategory_name', 'description']);
  }
}

module.exports = new SubcategoryController();
