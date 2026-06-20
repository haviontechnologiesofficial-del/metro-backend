const reportService = require('../services/report.service');
const ApiResponse = require('../helpers/apiResponse.helper');

class ReportController {
  /**
   * Helper to stream exports or return standard JSON responses
   */
  async handleReportResponse(res, reportName, headers, data, format) {
    if (format === 'excel') {
      const buffer = await reportService.exportToExcel(reportName, headers, data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${reportName.toLowerCase().replace(/ /g, '_')}_report.xlsx`);
      return res.end(buffer);
    } else if (format === 'pdf') {
      const buffer = await reportService.exportToPdf(reportName, headers, data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${reportName.toLowerCase().replace(/ /g, '_')}_report.pdf`);
      return res.end(buffer);
    } else {
      // Default to JSON
      return ApiResponse.success(res, `${reportName} retrieved successfully`, data);
    }
  }

  async getSalesReport(req, res, next) {
    try {
      const data = await reportService.getSalesReport(req.query);
      const headers = [
        { label: 'Date', key: 'date', width: 12 },
        { label: 'Invoice No', key: 'invoice_no', width: 18 },
        { label: 'Customer', key: 'customer', width: 15 },
        { label: 'Type', key: 'type', width: 15 },
        { label: 'Product', key: 'product', width: 25 },
        { label: 'Category', key: 'category', width: 15 },
        { label: 'Brand', key: 'brand', width: 12 },
        { label: 'Qty', key: 'qty', width: 8 },
        { label: 'Price', key: 'price', width: 12 },
        { label: 'Total', key: 'total', width: 12 }
      ];
      return await this.handleReportResponse(res, 'Sales Report', headers, data, req.query.export);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getServiceReport(req, res, next) {
    try {
      const data = await reportService.getServiceReport(req.query);
      const headers = [
        { label: 'Date', key: 'date', width: 12 },
        { label: 'Invoice No', key: 'invoice_no', width: 18 },
        { label: 'Customer', key: 'customer', width: 15 },
        { label: 'Mode', key: 'work_mode', width: 12 },
        { label: 'Partner', key: 'supplier', width: 15 },
        { label: 'Partner Cost', key: 'supplier_charge', width: 14 },
        { label: 'Total Bill', key: 'total_amount', width: 12 },
        { label: 'Cash Col', key: 'collected_cash', width: 12 },
        { label: 'Online Col', key: 'collected_online', width: 12 }
      ];
      return await this.handleReportResponse(res, 'Service Repairs Report', headers, data, req.query.export);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getExpenseReport(req, res, next) {
    try {
      const data = await reportService.getExpenseReport(req.query);
      const headers = [
        { label: 'Date', key: 'date', width: 12 },
        { label: 'Category', key: 'category', width: 15 },
        { label: 'Supplier', key: 'supplier', width: 15 },
        { label: 'Type', key: 'expense_type', width: 15 },
        { label: 'Total Amount', key: 'amount', width: 14 },
        { label: 'Cash Paid', key: 'cash_amount', width: 12 },
        { label: 'Online Paid', key: 'online_amount', width: 12 },
        { label: 'Notes', key: 'notes', width: 25 }
      ];
      return await this.handleReportResponse(res, 'Expense Outflow Report', headers, data, req.query.export);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getExchangeReport(req, res, next) {
    try {
      const data = await reportService.getExchangeReport(req.query);
      const headers = [
        { label: 'Date', key: 'date', width: 12 },
        { label: 'Customer', key: 'customer', width: 15 },
        { label: 'Phone', key: 'phone', width: 12 },
        { label: 'Device', key: 'device', width: 20 },
        { label: 'Color', key: 'color', width: 10 },
        { label: 'IMEI', key: 'imei', width: 18 },
        { label: 'Value', key: 'exchange_value', width: 12 }
      ];
      return await this.handleReportResponse(res, 'Device Exchange Report', headers, data, req.query.export);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getStockReport(req, res, next) {
    try {
      const data = await reportService.getStockReport(req.query);
      const headers = [
        { label: 'SKU', key: 'sku', width: 15 },
        { label: 'Name', key: 'name', width: 25 },
        { label: 'Category', key: 'category', width: 15 },
        { label: 'Brand', key: 'brand', width: 12 },
        { label: 'Supplier', key: 'supplier', width: 15 },
        { label: 'Condition', key: 'condition', width: 12 },
        { label: 'Cost', key: 'cost', width: 10 },
        { label: 'Price', key: 'price', width: 10 },
        { label: 'Stock', key: 'current_stock', width: 10 },
        { label: 'Status', key: 'status', width: 10 }
      ];
      return await this.handleReportResponse(res, 'Inventory Stock Report', headers, data, req.query.export);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getOverallReport(req, res, next) {
    try {
      const data = await reportService.getOverallReport(req.query);
      return ApiResponse.success(res, 'Overall report retrieved successfully', data);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getCategoryReport(req, res, next) {
    try {
      const { categoryId } = req.params;
      const data = await reportService.getCategoryReport(categoryId, req.query);
      return ApiResponse.success(res, 'Category report retrieved successfully', data);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }
}

module.exports = new ReportController();
