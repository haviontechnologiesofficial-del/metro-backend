const BaseService = require('./base.service');
const { serviceBillRepository } = require('../repositories');
const financialService = require('./financial.service');
const supplierService = require('./supplier.service');
const invoiceHelper = require('../helpers/invoice.helper');
const Transaction = require('../utils/transaction.util');

class ServiceBillService extends BaseService {
  constructor() {
    super(serviceBillRepository, 'SERVICE_BILL');
  }

  async create(data, req) {
    return await Transaction.execute(async (transaction) => {
      const invoiceNo = await invoiceHelper.generate('service', transaction);
      data.invoice_no = invoiceNo;

      const fTotal = parseFloat(data.total_amount || 0);
      const fCash = parseFloat(data.cash_amount || 0);
      const fOnline = parseFloat(data.online_amount || 0);
      const fSupplierAmount = parseFloat(data.supplier_amount || 0);

      const bill = await this.repository.create(data, transaction);

      if (bill.bill_status === 'final') {
        const collected = fCash + fOnline;
        if (collected > 0) {
          await financialService.recordIncome({
            amount: collected,
            cashAmount: fCash,
            onlineAmount: fOnline,
            referenceType: 'service_bill',
            referenceId: bill.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Repair Service Payment for Invoice ${bill.invoice_no}`
          }, transaction);
        }

        if (bill.work_mode === 'outsourced' && bill.supplier_id && fSupplierAmount > 0) {
          await supplierService.increasePending({
            supplierId: bill.supplier_id,
            amount: fSupplierAmount,
            referenceType: 'service_bill',
            referenceId: bill.id,
            notes: `Outsourced repair Invoice ${bill.invoice_no}`
          }, transaction);
        }
      }

      await require('./activityLog.service').log({
        moduleName: 'SERVICE_BILL',
        moduleId: bill.id,
        actionType: 'CREATE',
        newData: bill,
        req
      }, transaction);

      return await this.findById(bill.id, { transaction });
    });
  }

  async update(id, data, req) {
    return await Transaction.execute(async (transaction) => {
      const bill = await this.repository.findById(id, { transaction });
      if (!bill) throw new Error('Service Bill not found');
      const oldData = { ...bill };

      if (bill.bill_status === 'final') {
        const oldCollected = parseFloat(bill.cash_amount || 0) + parseFloat(bill.online_amount || 0);
        if (oldCollected > 0) {
          await financialService.recordExpense({
            amount: oldCollected,
            cashAmount: parseFloat(bill.cash_amount || 0),
            onlineAmount: parseFloat(bill.online_amount || 0),
            referenceType: 'service_bill_reversal',
            referenceId: bill.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Reversal of Edit Invoice ${bill.invoice_no}`
          }, transaction);
        }

        const oldSupplierAmount = parseFloat(bill.supplier_amount || 0);
        if (bill.work_mode === 'outsourced' && bill.supplier_id && oldSupplierAmount > 0) {
          await supplierService.reducePending({
            supplierId: bill.supplier_id,
            amount: oldSupplierAmount,
            referenceType: 'service_bill_reversal',
            referenceId: bill.id,
            notes: `Reversal of Edit Outsourced Invoice ${bill.invoice_no}`
          }, transaction);
        }
      }

      await this.repository.update(id, data, transaction);
      const updatedBill = await this.repository.findById(id, { transaction });

      if (updatedBill.bill_status === 'final') {
        const fCash = parseFloat(updatedBill.cash_amount || 0);
        const fOnline = parseFloat(updatedBill.online_amount || 0);
        const collected = fCash + fOnline;

        if (collected > 0) {
          await financialService.recordIncome({
            amount: collected,
            cashAmount: fCash,
            onlineAmount: fOnline,
            referenceType: 'service_bill',
            referenceId: bill.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Repair Service Payment for Invoice ${bill.invoice_no}`
          }, transaction);
        }

        const fSupplierAmount = parseFloat(updatedBill.supplier_amount || 0);
        if (updatedBill.work_mode === 'outsourced' && updatedBill.supplier_id && fSupplierAmount > 0) {
          await supplierService.increasePending({
            supplierId: updatedBill.supplier_id,
            amount: fSupplierAmount,
            referenceType: 'service_bill',
            referenceId: bill.id,
            notes: `Outsourced repair Invoice ${bill.invoice_no}`
          }, transaction);
        }
      }

      await require('./activityLog.service').log({
        moduleName: 'SERVICE_BILL',
        moduleId: bill.id,
        actionType: 'UPDATE',
        oldData,
        newData: { ...updatedBill },
        req
      }, transaction);

      return updatedBill;
    });
  }

  async delete(id, req) {
    return await Transaction.execute(async (transaction) => {
      const bill = await this.repository.findById(id, { transaction });
      if (!bill) throw new Error('Service Bill not found');
      const oldData = { ...bill };

      if (bill.bill_status === 'final') {
        const oldCollected = parseFloat(bill.cash_amount || 0) + parseFloat(bill.online_amount || 0);
        if (oldCollected > 0) {
          await financialService.recordExpense({
            amount: oldCollected,
            cashAmount: parseFloat(bill.cash_amount || 0),
            onlineAmount: parseFloat(bill.online_amount || 0),
            referenceType: 'service_bill_reversal',
            referenceId: bill.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Reversal of Deleted Invoice ${bill.invoice_no}`
          }, transaction);
        }

        const oldSupplierAmount = parseFloat(bill.supplier_amount || 0);
        if (bill.work_mode === 'outsourced' && bill.supplier_id && oldSupplierAmount > 0) {
          await supplierService.reducePending({
            supplierId: bill.supplier_id,
            amount: oldSupplierAmount,
            referenceType: 'service_bill_reversal',
            referenceId: bill.id,
            notes: `Reversal of Deleted Outsourced Invoice ${bill.invoice_no}`
          }, transaction);
        }
      }

      await this.repository.delete(id, transaction);

      await require('./activityLog.service').log({
        moduleName: 'SERVICE_BILL',
        moduleId: id,
        actionType: 'DELETE',
        oldData,
        req
      }, transaction);

      return { id, message: 'Service Bill deleted successfully' };
    });
  }

  async findById(id, options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'suppliers' }, as: 'supplier' }
    ];
    return await super.findById(id, { ...options, includes });
  }

  async list(options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'suppliers' }, as: 'supplier' }
    ];
    return await super.list({ ...options, includes });
  }
}

module.exports = new ServiceBillService();