const BaseService = require('./base.service');
const { expenseCategoryRepository } = require('../repositories');

class ExpenseCategoryService extends BaseService {
  constructor() {
    super(expenseCategoryRepository, 'EXPENSE_CATEGORY');
  }
}

module.exports = new ExpenseCategoryService();
