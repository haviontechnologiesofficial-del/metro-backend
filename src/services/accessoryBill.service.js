const BaseService = require('./base.service');
const { accessoryBillRepository, accessoryBillItemRepository } = require('../repositories');
const stockService = require('./stock.service');
const financialService = require('./financial.service');
const invoiceHelper = require('../helpers/invoice.helper');
const Transaction = require('../utils/transaction.util');

class AccessoryBillService extends BaseService {
  constructor() {
    super(accessoryBillRepository, 'ACCESSORY_BILL');
  }

  async create(data, req) {
    return await Transaction.execute(async (transaction) => {
      // 1. Auto generate invoice number
      const invoiceNo = await invoiceHelper.generate('accessory', transaction);
      data.invoice_no = invoiceNo;

      const items = data.items || [];
      
      // Calculate financial totals
      let calculatedSubtotal = 0;
      items.forEach(item => {
        const qty = parseInt(item.qty || 1, 10);
        const price = parseFloat(item.unit_price || 0);
        item.total = qty * price;
        calculatedSubtotal += item.total;
      });

      const fSubtotal = calculatedSubtotal;
      const fGst = parseFloat(data.gst || 0);
      const fDiscount = parseFloat(data.discount || 0);
      const fGrandTotal = fSubtotal - fDiscount;

      data.subtotal = fSubtotal;
      data.total_before_discount = fSubtotal;
      data.grand_total = fGrandTotal;

      // Handle split payments
      const fCash = parseFloat(data.cash_amount || 0);
      const fOnline = parseFloat(data.online_amount || 0);
      const fInitial = fCash + fOnline;

      data.initial_payment = fInitial;
      data.emi_amount = parseFloat(data.emi_amount || 0);

      // 2. Create Bill Header
      const { items: _, ...headerData } = data;
      const bill = await this.repository.create(headerData, transaction);

      // 3. Create Bill Items
      for (const item of items) {
        item.accessory_bill_id = bill.id;
        
        // Fetch product details for name cache if missing
        if (!item.product_name && item.product_id) {
          const db = require('../utils/db.util');
          const prod = await db.findById('products', item.product_id);
          if (prod) {
            item.product_name = prod.name;
          }
        }
        
        await accessoryBillItemRepository.create(item, transaction);
      }

      // 4. If Finalized -> Deduct stock and add balances
      if (bill.bill_status === 'final') {
        // A. Stock deduction
        for (const item of items) {
          if (item.product_id) {
            await stockService.reduceStock({
              productId: item.product_id,
              qty: item.qty,
              imei_1: null,
              imei_2: null,
              sourceRef: `ACC_BILL-${bill.id}`,
              performedBy: req.user ? req.user.id : null,
              notes: `Sold via Invoice ${bill.invoice_no}`
            }, transaction);
          }
        }

        // B. Centralized Financial Record
        const fEmi = parseFloat(bill.emi_amount || 0);
        const totalIncome = fInitial + fEmi;
        if (totalIncome > 0) {
          await financialService.recordIncome({
            amount: totalIncome,
            cashAmount: fCash,
            onlineAmount: fOnline + fEmi,
            referenceType: 'accessory_bill',
            referenceId: bill.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Payment for Invoice ${bill.invoice_no}`
          }, transaction);
        }
      }

      // Log Activity
      await require('./activityLog.service').log({
        moduleName: 'ACCESSORY_BILL',
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
      const bill = await this.repository.findById(id, {
        includes: [{ model: { tableName: 'accessory_bill_items' }, as: 'items' }],
        transaction
      });

      if (!bill) {
        throw new Error('Accessory Bill not found');
      }

      const oldData = { ...bill };

      // 1. REVERSE PREVIOUS ACTIONS if the bill was final
      if (bill.bill_status === 'final') {
        // Get items for this bill
        const db = require('../utils/db.util');
        const items = await db.findAll('accessory_bill_items', {
          where: { accessory_bill_id: id }
        });

        // A. Restore Stock levels
        for (const item of items) {
          if (item.product_id) {
            await stockService.addStock({
              productId: item.product_id,
              qty: item.qty,
              sourceRef: `ACC_BILL_REV-${bill.id}`,
              performedBy: req.user ? req.user.id : null,
              notes: `Stock restored on Edit of Invoice ${bill.invoice_no}`
            }, transaction);
          }
        }

        // B. Reverse Balances (treated as expense reversal)
        const oldInitial = parseFloat(bill.initial_payment || 0);
        const oldEmi = parseFloat(bill.emi_amount || 0);
        const oldTotalIncome = oldInitial + oldEmi;
        if (oldTotalIncome > 0) {
          await financialService.recordExpense({
            amount: oldTotalIncome,
            cashAmount: parseFloat(bill.cash_amount || 0),
            onlineAmount: parseFloat(bill.online_amount || 0) + oldEmi,
            referenceType: 'accessory_bill_reversal',
            referenceId: bill.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Reversal of Edit Invoice ${bill.invoice_no}`
          }, transaction);
        }
      }

      // 2. RECALCULATE and Update
      const items = data.items || [];
      let calculatedSubtotal = 0;
      items.forEach(item => {
        const qty = parseInt(item.qty || 1, 10);
        const price = parseFloat(item.unit_price || 0);
        item.total = qty * price;
        calculatedSubtotal += item.total;
      });

      const fSubtotal = items.length > 0 ? calculatedSubtotal : parseFloat(data.subtotal || bill.subtotal);
      const fGst = parseFloat(data.gst !== undefined ? data.gst : bill.gst);
      const fDiscount = parseFloat(data.discount !== undefined ? data.discount : bill.discount);
      const fGrandTotal = fSubtotal - fDiscount;

      data.subtotal = fSubtotal;
      data.total_before_discount = fSubtotal;
      data.grand_total = fGrandTotal;

      data.cash_amount = parseFloat(data.cash_amount !== undefined ? data.cash_amount : bill.cash_amount);
      data.online_amount = parseFloat(data.online_amount !== undefined ? data.online_amount : bill.online_amount);
      data.initial_payment = parseFloat(data.cash_amount) + parseFloat(data.online_amount);

      // Update Bill Header
      const { items: _, ...updateData } = data;
      await this.repository.update(id, updateData, transaction);

      // 3. Update Bill Items if array is supplied
      if (data.items) {
        // Delete old items
        if (transaction) {
          await transaction.query('DELETE FROM accessory_bill_items WHERE accessory_bill_id = ?', [id]);
        }

        // Insert new items
        for (const item of items) {
          item.accessory_bill_id = id;
          if (!item.product_name && item.product_id) {
            const db = require('../utils/db.util');
            const prod = await db.findById('products', item.product_id);
            if (prod) {
              item.product_name = prod.name;
            }
          }
          await accessoryBillItemRepository.create(item, transaction);
        }
      }

      // Re-fetch the updated bill
      const updatedBill = await this.repository.findById(id, {
        includes: [{ model: { tableName: 'accessory_bill_items' }, as: 'items' }],
        transaction
      });

      // 4. APPLY NEW ACTIONS if new state is finalized
      if (updatedBill.bill_status === 'final') {
        const db = require('../utils/db.util');
        const billItems = await db.findAll('accessory_bill_items', {
          where: { accessory_bill_id: id }
        });

        // A. Deduct Stock
        for (const item of billItems) {
          if (item.product_id) {
            await stockService.reduceStock({
              productId: item.product_id,
              qty: item.qty,
              sourceRef: `ACC_BILL-${id}`,
              performedBy: req.user ? req.user.id : null,
              notes: `Sold via Invoice ${bill.invoice_no}`
            }, transaction);
          }
        }

        // B. Add new Balances
        const newInitial = parseFloat(updatedBill.initial_payment || 0);
        const newEmi = parseFloat(updatedBill.emi_amount || 0);
        const newTotalIncome = newInitial + newEmi;
        if (newTotalIncome > 0) {
          await financialService.recordIncome({
            amount: newTotalIncome,
            cashAmount: parseFloat(updatedBill.cash_amount || 0),
            onlineAmount: parseFloat(updatedBill.online_amount || 0) + newEmi,
            referenceType: 'accessory_bill',
            referenceId: id,
            performedBy: req.user ? req.user.id : null,
            notes: `Payment for Invoice ${bill.invoice_no}`
          }, transaction);
        }
      }

      // Log Activity
      await require('./activityLog.service').log({
        moduleName: 'ACCESSORY_BILL',
        moduleId: id,
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
      const bill = await this.repository.findById(id, {
        transaction
      });

      if (!bill) {
        throw new Error('Accessory Bill not found');
      }

      const oldData = { ...bill };
      const db = require('../utils/db.util');

      // 1. REVERSE ACTIONS if the bill was final
      if (bill.bill_status === 'final') {
        const items = await db.findAll('accessory_bill_items', {
          where: { accessory_bill_id: id }
        });

        // A. Restore Stock levels
        for (const item of items) {
          if (item.product_id) {
            await stockService.addStock({
              productId: item.product_id,
              qty: item.qty,
              sourceRef: `ACC_BILL_DEL-${bill.id}`,
              performedBy: req.user ? req.user.id : null,
              notes: `Stock restored on Delete of Invoice ${bill.invoice_no}`
            }, transaction);
          }
        }

        // B. Reverse balances
        const oldInitial = parseFloat(bill.initial_payment || 0);
        const oldEmi = parseFloat(bill.emi_amount || 0);
        const oldTotalIncome = oldInitial + oldEmi;
        if (oldTotalIncome > 0) {
          await financialService.recordExpense({
            amount: oldTotalIncome,
            cashAmount: parseFloat(bill.cash_amount || 0),
            onlineAmount: parseFloat(bill.online_amount || 0) + oldEmi,
            referenceType: 'accessory_bill_reversal',
            referenceId: bill.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Reversal of Deleted Invoice ${bill.invoice_no}`
          }, transaction);
        }
      }

      // 2. Delete items & bill
      await transaction.query('DELETE FROM accessory_bill_items WHERE accessory_bill_id = ?', [id]);
      await this.repository.delete(id, transaction);

      // Log Activity
      await require('./activityLog.service').log({
        moduleName: 'ACCESSORY_BILL',
        moduleId: id,
        actionType: 'DELETE',
        oldData,
        req
      }, transaction);

      return { id, message: 'Accessory Bill and related items deleted successfully' };
    });
  }

  async findById(id, options = {}) {
    const includes = options.includes || [
      {
        model: { tableName: 'accessory_bill_items' },
        as: 'items'
      }
    ];
    return await super.findById(id, { ...options, includes });
  }

  async list(options = {}) {
    const includes = options.includes || [
      {
        model: { tableName: 'accessory_bill_items' },
        as: 'items'
      }
    ];
    return await super.list({ ...options, includes });
  }
}

module.exports = new AccessoryBillService();