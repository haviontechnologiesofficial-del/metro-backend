const BaseController = require('./base.controller');
const expenseCategoryService = require('../services/expenseCategory.service');

class ExpenseCategoryController extends BaseController {
  constructor() {
    super(expenseCategoryService, ['name']);
  }
}

module.exports = new ExpenseCategoryController();
