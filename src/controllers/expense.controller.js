const BaseController = require('./base.controller');
const expenseService = require('../services/expense.service');

class ExpenseController extends BaseController {
  constructor() {
    super(expenseService, ['notes', 'expense_type']);
  }

  async recordPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { cashOut, onlineOut, at, note } = req.body;
      const result = await expenseService.recordPayment(id, { cashOut, onlineOut, at, note }, req);
      return require('../helpers/apiResponse.helper').success(res, 'Payment recorded successfully', result);
    } catch (error) {
      return require('../helpers/apiResponse.helper').error(res, error.message, error, 400);
    }
  }

  async getPayments(req, res, next) {
    try {
      const { id } = req.params;
      const result = await expenseService.getPayments(id);
      return require('../helpers/apiResponse.helper').success(res, 'Payments retrieved successfully', result);
    } catch (error) {
      return require('../helpers/apiResponse.helper').error(res, error.message, error, 400);
    }
  }
}

module.exports = new ExpenseController();
