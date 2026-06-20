const BaseService = require('./base.service');
const { mobileSaleRepository, mobileSaleItemRepository } = require('../repositories');
const stockService = require('./stock.service');
const financialService = require('./financial.service');
const invoiceHelper = require('../helpers/invoice.helper');
const Transaction = require('../utils/transaction.util');

class MobileSaleService extends BaseService {
  constructor() {
    super(mobileSaleRepository, 'MOBILE_SALE');
  }

  async create(data, req) {
    return await Transaction.execute(async (transaction) => {
      const invoiceNo = await invoiceHelper.generate('mobile', transaction);
      data.invoice_no = invoiceNo;

      const items = data.items || [];
      
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
      const fGrandTotal = (fSubtotal + fGst) - fDiscount;

      data.subtotal = fSubtotal;
      data.total_before_discount = fSubtotal + fGst;
      data.grand_total = fGrandTotal;

      const fCash = parseFloat(data.cash_amount || 0);
      const fOnline = parseFloat(data.online_amount || 0);
      const fInitial = fCash + fOnline;

      data.initial_payment = fInitial;
      data.emi_amount = parseFloat(data.emi_amount || 0);
      
      const { items: _, ...headerData } = data;
      const sale = await this.repository.create(headerData, transaction);

      for (const item of items) {
        item.mobile_sale_id = sale.id;
        if (!item.product_name && item.product_id) {
          const db = require('../utils/db.util');
          const prod = await db.findById('products', item.product_id);
          if (prod) {
            item.product_name = prod.name;
            item.phone_stock_type = item.phone_stock_type || prod.phone_condition;
          }
        }
        await mobileSaleItemRepository.create(item, transaction);
      }

      if (sale.status === 'final') {
        for (const item of items) {
          if (item.product_id) {
            await stockService.reduceStock({
              productId: item.product_id,
              qty: item.qty,
              imei_1: item.imei_1,
              imei_2: item.imei_2,
              sourceRef: `MOB_SALE-${sale.id}`,
              performedBy: req.user ? req.user.id : null,
              notes: `Sold IMEI ${item.imei_1} via Invoice ${sale.invoice_no}`
            }, transaction);
          }
        }

        const fEmi = parseFloat(sale.emi_amount || 0);
        const totalIncome = fInitial + fEmi;
        if (totalIncome > 0) {
          await financialService.recordIncome({
            amount: totalIncome,
            cashAmount: fCash,
            onlineAmount: fOnline + fEmi,
            referenceType: 'mobile_sale',
            referenceId: sale.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Payment for Invoice ${sale.invoice_no}`
          }, transaction);
        }
      }

      await require('./activityLog.service').log({
        moduleName: 'MOBILE_SALE',
        moduleId: sale.id,
        actionType: 'CREATE',
        newData: sale,
        req
      }, transaction);

      return await this.findById(sale.id, { transaction });
    });
  }

  async update(id, data, req) {
    return await Transaction.execute(async (transaction) => {
      const sale = await this.repository.findById(id, { transaction });
      if (!sale) throw new Error('Mobile Sale not found');
      const oldData = { ...sale };

      if (sale.status === 'final') {
        const db = require('../utils/db.util');
        const saleItems = await db.findAll('mobile_sale_items', { where: { mobile_sale_id: id } });

        for (const item of saleItems) {
          if (item.product_id) {
            await stockService.addStock({
              productId: item.product_id,
              qty: item.qty,
              imei_1: item.imei_1,
              imei_2: item.imei_2,
              sourceRef: `MOB_SALE_REV-${sale.id}`,
              performedBy: req.user ? req.user.id : null,
              notes: `Restored stock on Edit Invoice ${sale.invoice_no}`
            }, transaction);
          }
        }

        const oldInitial = parseFloat(sale.initial_payment || 0);
        const oldEmi = parseFloat(sale.emi_amount || 0);
        const oldTotalIncome = oldInitial + oldEmi;
        if (oldTotalIncome > 0) {
          await financialService.recordExpense({
            amount: oldTotalIncome,
            cashAmount: parseFloat(sale.cash_amount || 0),
            onlineAmount: parseFloat(sale.online_amount || 0) + oldEmi,
            referenceType: 'mobile_sale_reversal',
            referenceId: sale.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Reversal of Edit Invoice ${sale.invoice_no}`
          }, transaction);
        }
      }

      const items = data.items || [];
      let calculatedSubtotal = 0;
      items.forEach(item => {
        const qty = parseInt(item.qty || 1, 10);
        const price = parseFloat(item.unit_price || 0);
        item.total = qty * price;
        calculatedSubtotal += item.total;
      });

      data.subtotal = items.length > 0 ? calculatedSubtotal : parseFloat(data.subtotal || sale.subtotal);
      data.gst = parseFloat(data.gst !== undefined ? data.gst : sale.gst);
      data.discount = parseFloat(data.discount !== undefined ? data.discount : sale.discount);
      data.total_before_discount = parseFloat(data.subtotal) + parseFloat(data.gst);
      data.grand_total = (parseFloat(data.subtotal) + parseFloat(data.gst)) - parseFloat(data.discount);
      data.cash_amount = parseFloat(data.cash_amount !== undefined ? data.cash_amount : sale.cash_amount);
      data.online_amount = parseFloat(data.online_amount !== undefined ? data.online_amount : sale.online_amount);
      data.initial_payment = parseFloat(data.cash_amount) + parseFloat(data.online_amount);

      const { items: _, ...updateData } = data;
      await this.repository.update(id, updateData, transaction);

      if (data.items) {
        await transaction.query('DELETE FROM mobile_sale_items WHERE mobile_sale_id = ?', [id]);
        for (const item of items) {
          item.mobile_sale_id = id;
          if (!item.product_name && item.product_id) {
            const db = require('../utils/db.util');
            const prod = await db.findById('products', item.product_id);
            if (prod) {
              item.product_name = prod.name;
              item.phone_stock_type = item.phone_stock_type || prod.phone_condition;
            }
          }
          await mobileSaleItemRepository.create(item, transaction);
        }
      }

      const updatedSale = await this.repository.findById(id, { transaction });

      if (updatedSale.status === 'final') {
        const db = require('../utils/db.util');
        const updatedItems = await db.findAll('mobile_sale_items', { where: { mobile_sale_id: id } });

        for (const item of updatedItems) {
          if (item.product_id) {
            await stockService.reduceStock({
              productId: item.product_id,
              qty: item.qty,
              imei_1: item.imei_1,
              imei_2: item.imei_2,
              sourceRef: `MOB_SALE-${id}`,
              performedBy: req.user ? req.user.id : null,
              notes: `Sold IMEI ${item.imei_1} via Invoice ${sale.invoice_no}`
            }, transaction);
          }
        }

        const newInitial = parseFloat(updatedSale.initial_payment || 0);
        const newEmi = parseFloat(updatedSale.emi_amount || 0);
        const newTotalIncome = newInitial + newEmi;
        if (newTotalIncome > 0) {
          await financialService.recordIncome({
            amount: newTotalIncome,
            cashAmount: parseFloat(updatedSale.cash_amount || 0),
            onlineAmount: parseFloat(updatedSale.online_amount || 0) + newEmi,
            referenceType: 'mobile_sale',
            referenceId: id,
            performedBy: req.user ? req.user.id : null,
            notes: `Payment for Invoice ${sale.invoice_no}`
          }, transaction);
        }
      }

      await require('./activityLog.service').log({
        moduleName: 'MOBILE_SALE',
        moduleId: id,
        actionType: 'UPDATE',
        oldData,
        newData: { ...updatedSale },
        req
      }, transaction);

      return updatedSale;
    });
  }

  async delete(id, req) {
    return await Transaction.execute(async (transaction) => {
      const sale = await this.repository.findById(id, { transaction });
      if (!sale) throw new Error('Mobile Sale not found');
      const oldData = { ...sale };

      if (sale.status === 'final') {
        const db = require('../utils/db.util');
        const saleItems = await db.findAll('mobile_sale_items', { where: { mobile_sale_id: id } });

        for (const item of saleItems) {
          if (item.product_id) {
            await stockService.addStock({
              productId: item.product_id,
              qty: item.qty,
              imei_1: item.imei_1,
              imei_2: item.imei_2,
              sourceRef: `MOB_SALE_DEL-${sale.id}`,
              performedBy: req.user ? req.user.id : null,
              notes: `Restored stock on Delete of Invoice ${sale.invoice_no}`
            }, transaction);
          }
        }

        const oldInitial = parseFloat(sale.initial_payment || 0);
        const oldEmi = parseFloat(sale.emi_amount || 0);
        const oldTotalIncome = oldInitial + oldEmi;
        if (oldTotalIncome > 0) {
          await financialService.recordExpense({
            amount: oldTotalIncome,
            cashAmount: parseFloat(sale.cash_amount || 0),
            onlineAmount: parseFloat(sale.online_amount || 0) + oldEmi,
            referenceType: 'mobile_sale_reversal',
            referenceId: sale.id,
            performedBy: req.user ? req.user.id : null,
            notes: `Reversal of Deleted Invoice ${sale.invoice_no}`
          }, transaction);
        }
      }

      await transaction.query('DELETE FROM mobile_sale_items WHERE mobile_sale_id = ?', [id]);
      await this.repository.delete(id, transaction);

      await require('./activityLog.service').log({
        moduleName: 'MOBILE_SALE',
        moduleId: id,
        actionType: 'DELETE',
        oldData,
        req
      }, transaction);

      return { id, message: 'Mobile Sale and related items deleted successfully' };
    });
  }

  async findById(id, options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'mobile_sale_items' }, as: 'items' }
    ];
    return await super.findById(id, { ...options, includes });
  }

  async list(options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'mobile_sale_items' }, as: 'items' }
    ];
    return await super.list({ ...options, includes });
  }
}

module.exports = new MobileSaleService();