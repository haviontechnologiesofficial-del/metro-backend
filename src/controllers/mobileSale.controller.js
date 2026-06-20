const BaseController = require('./base.controller');
const mobileSaleService = require('../services/mobileSale.service');

class MobileSaleController extends BaseController {
  constructor() {
    super(mobileSaleService, ['invoice_no', 'customer_name', 'phone']);
  }
}

module.exports = new MobileSaleController();
