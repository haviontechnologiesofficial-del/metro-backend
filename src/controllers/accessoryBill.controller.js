const BaseController = require('./base.controller');
const accessoryBillService = require('../services/accessoryBill.service');

class AccessoryBillController extends BaseController {
  constructor() {
    super(accessoryBillService, ['invoice_no', 'customer_name', 'phone', 'supplier_name']);
  }
}

module.exports = new AccessoryBillController();
