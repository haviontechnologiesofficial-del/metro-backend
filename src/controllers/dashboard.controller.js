const dashboardService = require('../services/dashboard.service');
const ApiResponse = require('../helpers/apiResponse.helper');

class DashboardController {
  async getSummary(req, res, next) {
    try {
      const { period, startDate, endDate } = req.query;
      const stats = await dashboardService.getSummary({ period, startDate, endDate });
      return ApiResponse.success(res, 'Dashboard summary retrieved successfully', stats);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getCharts(req, res, next) {
    try {
      const { period, startDate, endDate } = req.query;
      const charts = await dashboardService.getCharts({ period, startDate, endDate });
      return ApiResponse.success(res, 'Dashboard charts retrieved successfully', charts);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getProfitSheet(req, res, next) {
    try {
      const { period, startDate, endDate } = req.query;
      const profitSheet = await dashboardService.getProfitSheet({ period, startDate, endDate });
      return ApiResponse.success(res, 'Profit balance sheet retrieved successfully', profitSheet);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getDailyBalanceSheet(req, res, next) {
    try {
      const { period, startDate, endDate } = req.query;
      const balanceSheet = await dashboardService.getDailyBalanceSheet({ period, startDate, endDate });
      return ApiResponse.success(res, 'Daily balance sheets retrieved successfully', balanceSheet);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getDetailedBalanceSheet(req, res, next) {
    try {
      const { period, startDate, endDate } = req.query;
      const detailedSheet = await dashboardService.getDetailedBalanceSheet({ period, startDate, endDate });
      return ApiResponse.success(res, 'Detailed balance sheet retrieved successfully', detailedSheet);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async adjustBalance(req, res, next) {
    try {
      const { cashBalance, onlineBalance, notes } = req.body;
      if (cashBalance === undefined || onlineBalance === undefined) {
        return ApiResponse.badRequest(res, 'cashBalance and onlineBalance are required');
      }
      const result = await dashboardService.adjustBalance({
        cashBalance: Number(cashBalance),
        onlineBalance: Number(onlineBalance),
        notes: notes || ''
      });
      return ApiResponse.success(res, 'Balance adjusted successfully', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }
}

module.exports = new DashboardController();
