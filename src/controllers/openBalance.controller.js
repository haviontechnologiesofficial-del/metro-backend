const FinancialService = require('../services/financial.service');
const ApiResponse = require('../helpers/apiResponse.helper');

class OpenBalanceController {
  /**
   * GET /api/v1/open-balance
   * List all balance history records with pagination & date filtering
   */
  async getAll(req, res, next) {
    try {
      const { startDate, endDate, limit, offset } = req.query;
      const result = await FinancialService.getAllOpenBalances({
        startDate,
        endDate,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined
      });
      return ApiResponse.success(res, 'Open balance records retrieved successfully', result.data, {
        total: result.total,
        limit: limit || 'all',
        offset: offset || 0
      });
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  /**
   * GET /api/v1/open-balance/:id
   * Get a single balance history record by ID
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const record = await FinancialService.getOpenBalanceById(id);
      if (!record) {
        return ApiResponse.notFound(res, 'Open balance record not found');
      }
      return ApiResponse.success(res, 'Open balance record retrieved successfully', record);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  /**
   * PUT /api/v1/open-balance/:id
   * Update open_balance, cash_balance, and/or online_balance for a record
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { openBalance, cashBalance, onlineBalance, notes } = req.body;

      if (openBalance === undefined && cashBalance === undefined && onlineBalance === undefined) {
        return ApiResponse.badRequest(res, 'At least one of openBalance, cashBalance, or onlineBalance is required');
      }

      const updated = await FinancialService.updateOpenBalance(id, {
        openBalance,
        cashBalance,
        onlineBalance,
        notes
      });

      return ApiResponse.success(res, 'Open balance record updated successfully', updated);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  /**
   * DELETE /api/v1/open-balance/:id
   * Soft delete a balance history record
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await FinancialService.deleteOpenBalance(id);
      return ApiResponse.success(res, 'Open balance record deleted successfully', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  /**
   * POST /api/v1/open-balance/add-cash-online
   * Add cash and/or online amount to today's overall balance
   */
  async addCashOnline(req, res, next) {
    try {
      const { cashAmount, onlineAmount, referenceType, notes } = req.body;
      if (!cashAmount && !onlineAmount) {
        return ApiResponse.badRequest(res, 'At least one of cashAmount or onlineAmount is required');
      }
      if (!referenceType) {
        return ApiResponse.badRequest(res, 'referenceType is required');
      }

      const result = await FinancialService.addCashOnline({
        cashAmount: parseFloat(cashAmount || 0),
        onlineAmount: parseFloat(onlineAmount || 0),
        referenceType,
        referenceId: req.body.referenceId || null,
        performedBy: req.user?.id || null,
        notes: notes || `Income from ${referenceType}`
      });

      return ApiResponse.success(res, 'Cash/Online amount added successfully', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  /**
   * POST /api/v1/open-balance/subtract-cash-online
   * Subtract cash and/or online amount from today's overall balance
   */
  async subtractCashOnline(req, res, next) {
    try {
      const { cashAmount, onlineAmount, referenceType, notes } = req.body;
      if (!cashAmount && !onlineAmount) {
        return ApiResponse.badRequest(res, 'At least one of cashAmount or onlineAmount is required');
      }
      if (!referenceType) {
        return ApiResponse.badRequest(res, 'referenceType is required');
      }

      const result = await FinancialService.subtractCashOnline({
        cashAmount: parseFloat(cashAmount || 0),
        onlineAmount: parseFloat(onlineAmount || 0),
        referenceType,
        referenceId: req.body.referenceId || null,
        performedBy: req.user?.id || null,
        notes: notes || `Expense from ${referenceType}`
      });

      return ApiResponse.success(res, 'Cash/Online amount subtracted successfully', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }
}

module.exports = new OpenBalanceController();