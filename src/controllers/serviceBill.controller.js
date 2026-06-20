const BaseController = require('./base.controller');
const serviceBillService = require('../services/serviceBill.service');

class ServiceBillController extends BaseController {
  constructor() {
    super(serviceBillService, ['invoice_no', 'customer_name', 'phone']);
  }
}

module.exports = new ServiceBillController();
