const BaseController = require('./base.controller');
const supplierService = require('../services/supplier.service');
const ApiResponse = require('../helpers/apiResponse.helper');

class SupplierController extends BaseController {
  constructor() {
    super(supplierService, ['name', 'phone', 'notes']);
  }

  async getLedger(req, res, next) {
    try {
      const { id } = req.params;
      const ledger = await supplierService.getSupplierLedger(id);
      return ApiResponse.success(res, 'Supplier ledger retrieved successfully', ledger);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async recalculatePending(req, res, next) {
    try {
      const { id } = req.params;
      const supplier = await supplierService.recalculatePending(id);
      return ApiResponse.success(res, 'Pending amount recalculated', supplier);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }
}

module.exports = new SupplierController();
