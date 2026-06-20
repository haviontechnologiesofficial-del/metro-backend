const BaseService = require('./base.service');
const { expenseRepository } = require('../repositories');
const financialService = require('./financial.service');
const supplierService = require('./supplier.service');
const Transaction = require('../utils/transaction.util');
const db = require('../utils/db.util');

class ExpenseService extends BaseService {
  constructor() {
    super(expenseRepository, 'EXPENSE');
  }

  async create(data, req) {
    return await Transaction.execute(async (transaction) => {
      let categoryId = data.expense_category_id;
      if (data.category_name) {
        let category = await db.findOne('expense_categories', { name: data.category_name.toUpperCase() });
        if (!category) {
          category = await db.create('expense_categories', {
            name: data.category_name.toUpperCase(),
            status: 'active'
          });
        }
        categoryId = category.id;
      }

      if (!categoryId) {
        const fallbackName = data.expense_type === 'supplier_payment' ? 'SUPPLIER_PAYMENT' : 'GENERAL';
        let fallbackCategory = await db.findOne('expense_categories', { name: fallbackName });
        if (!fallbackCategory) {
          fallbackCategory = await db.create('expense_categories', {
            name: fallbackName,
            status: 'system'
          });
        }
        categoryId = fallbackCategory.id;
      }

      data.expense_category_id = categoryId;
      const fAmount = parseFloat(data.amount || 0);
      const fCash = parseFloat(data.cash_amount || 0);
      const fOnline = parseFloat(data.online_amount || 0);

      if (fCash + fOnline > fAmount) {
        throw new Error('Paid amount cannot exceed total expense amount');
      }

      // Strip transient/helper fields that are not actual DB columns
      const { category_name: _categoryName, ...dbData } = data;

      const expense = await this.repository.create(dbData, transaction);

      const fPaid = fCash + fOnline;
      if (fPaid > 0) {
        await financialService.recordExpense({
          amount: fPaid,
          cashAmount: fCash,
          onlineAmount: fOnline,
          referenceType: 'expense',
          referenceId: expense.id,
          performedBy: req.user ? req.user.id : null,
          notes: data.notes || `Expense: ${expense.expense_type}`
        }, transaction);
      }

      if (expense.expense_type === 'supplier_payment' && expense.supplier_id && fPaid > 0) {
        await supplierService.reducePending({
          supplierId: expense.supplier_id,
          amount: fPaid,
          referenceType: 'expense',
          referenceId: expense.id,
          notes: data.notes || `Supplier payment via Expense ID: ${expense.id}`
        }, transaction);
      }

      await require('./activityLog.service').log({
        moduleName: 'EXPENSE',
        moduleId: expense.id,
        actionType: 'CREATE',
        newData: expense,
        req
      }, transaction);

      return expense;
    });
  }

  async update(id, data, req) {
    return await Transaction.execute(async (transaction) => {
      const expense = await this.repository.findById(id, { transaction });
      if (!expense) throw new Error('Expense not found');

      let categoryId = data.expense_category_id;
      if (data.category_name) {
        let category = await db.findOne('expense_categories', { name: data.category_name.toUpperCase() });
        if (!category) {
          category = await db.create('expense_categories', {
            name: data.category_name.toUpperCase(),
            status: 'active'
          });
        }
        categoryId = category.id;
      }
      if (categoryId) {
        data.expense_category_id = categoryId;
      }

      const oldCash = parseFloat(expense.cash_amount || 0);
      const oldOnline = parseFloat(expense.online_amount || 0);
      const oldTotalPaid = oldCash + oldOnline;

      const newCash = data.cash_amount !== undefined ? parseFloat(data.cash_amount) : oldCash;
      const newOnline = data.online_amount !== undefined ? parseFloat(data.online_amount) : oldOnline;
      const newTotalPaid = newCash + newOnline;

      const cashDiff = newCash - oldCash;
      const onlineDiff = newOnline - oldOnline;
      const totalDiff = newTotalPaid - oldTotalPaid;

      // Strip transient/helper fields that are not actual DB columns
      const { category_name: _categoryName, ...dbData } = data;

      const updated = await this.repository.update(id, dbData, transaction);

      if (totalDiff > 0) {
        await financialService.recordExpense({
          amount: totalDiff,
          cashAmount: cashDiff > 0 ? cashDiff : 0,
          onlineAmount: onlineDiff > 0 ? onlineDiff : 0,
          referenceType: 'expense_payment',
          referenceId: id,
          performedBy: req.user ? req.user.id : null,
          notes: `Additional payment on Edit Expense`
        }, transaction);

        if (expense.supplier_id) {
          await supplierService.reducePending({
            supplierId: expense.supplier_id,
            amount: totalDiff,
            referenceType: 'expense_payment',
            referenceId: id,
            notes: `Additional payment on Edit Expense`
          }, transaction);
        }
      } else if (totalDiff < 0) {
        const refundTotal = Math.abs(totalDiff);
        const refundCash = cashDiff < 0 ? Math.abs(cashDiff) : 0;
        const refundOnline = onlineDiff < 0 ? Math.abs(onlineDiff) : 0;

        await financialService.recordIncome({
          amount: refundTotal,
          cashAmount: refundCash,
          onlineAmount: refundOnline,
          referenceType: 'expense_refund',
          referenceId: id,
          performedBy: req.user ? req.user.id : null,
          notes: `Refund on Edit Expense`
        }, transaction);

        if (expense.supplier_id) {
          await supplierService.increasePending({
            supplierId: expense.supplier_id,
            amount: refundTotal,
            referenceType: 'expense_refund',
            referenceId: id,
            notes: `Refund on Edit Expense`
          }, transaction);
        }
      }

      await require('./activityLog.service').log({
        moduleName: 'EXPENSE',
        moduleId: id,
        actionType: 'UPDATE',
        oldData: { ...expense },
        newData: { ...updated },
        req
      }, transaction);

      return updated;
    });
  }

  async delete(id, req) {
    return await Transaction.execute(async (transaction) => {
      const expense = await this.repository.findById(id, { transaction });
      if (!expense) throw new Error('Expense not found');

      const fCash = parseFloat(expense.cash_amount || 0);
      const fOnline = parseFloat(expense.online_amount || 0);
      const fPaid = fCash + fOnline;

      await this.repository.delete(id, transaction);

      if (fPaid > 0) {
        await financialService.recordIncome({
          amount: fPaid,
          cashAmount: fCash,
          onlineAmount: fOnline,
          referenceType: 'expense_reversal',
          referenceId: expense.id,
          performedBy: req.user ? req.user.id : null,
          notes: `Reversal of deleted expense ID: ${expense.id}`
        }, transaction);
      }

      if (expense.expense_type === 'supplier_payment' && expense.supplier_id && fPaid > 0) {
        await supplierService.increasePending({
          supplierId: expense.supplier_id,
          amount: fPaid,
          referenceType: 'expense_reversal',
          referenceId: expense.id,
          notes: `Reversal of deleted supplier payment Expense ID: ${expense.id}`
        }, transaction);
      }

      await require('./activityLog.service').log({
        moduleName: 'EXPENSE',
        moduleId: expense.id,
        actionType: 'DELETE',
        oldData: { ...expense },
        req
      }, transaction);

      return { id, message: 'Expense deleted and balances reversed successfully' };
    });
  }

  async recordPayment(id, { cashOut, onlineOut, at, note }, req) {
    return await Transaction.execute(async (transaction) => {
      const expense = await this.repository.findById(id, { transaction });
      if (!expense) throw new Error('Expense not found');

      const c = parseFloat(cashOut || 0);
      const o = parseFloat(onlineOut || 0);
      const total = c + o;

      if (total <= 0) throw new Error('Payment amount must be greater than zero');

      const newCash = parseFloat(expense.cash_amount || 0) + c;
      const newOnline = parseFloat(expense.online_amount || 0) + o;
      await transaction.query('UPDATE expenses SET cash_amount = ?, online_amount = ? WHERE id = ?', [newCash, newOnline, id]);

      await financialService.recordExpense({
        amount: total,
        cashAmount: c,
        onlineAmount: o,
        referenceType: 'expense_payment',
        referenceId: expense.id,
        performedBy: req.user ? req.user.id : null,
        notes: note || `Payment for Expense: ${expense.notes || ''}`
      }, transaction);

      if (expense.supplier_id) {
        await supplierService.reducePending({
          supplierId: expense.supplier_id,
          amount: total,
          referenceType: 'expense_payment',
          referenceId: expense.id,
          notes: note || `Supplier payment for Expense ID: ${expense.id}`
        }, transaction);
      }

      return { ...expense, cash_amount: newCash, online_amount: newOnline };
    });
  }

  async getPayments(expenseId) {
    const txs = await db.findAll('financial_transactions', {
      where: {
        reference_id: expenseId
      }
    });

    return txs
      .filter(tx => parseFloat(tx.amount) > 0 &&
        (tx.reference_type === 'expense' || tx.reference_type === 'expense_payment'))
      .map(tx => ({
        id: tx.id,
        expenseId: tx.reference_id,
        amount: parseFloat(tx.amount),
        note: tx.notes || '',
        cashOut: parseFloat(tx.cash_amount),
        onlineOut: parseFloat(tx.online_amount),
        at: tx.created_at
      }));
  }

  async findById(id, options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'expense_categories' }, as: 'category' },
      { model: { tableName: 'suppliers' }, as: 'supplier' }
    ];
    return await super.findById(id, { ...options, includes });
  }

  async list(options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'expense_categories' }, as: 'category' },
      { model: { tableName: 'suppliers' }, as: 'supplier' }
    ];
    return await super.list({ ...options, includes });
  }
}

module.exports = new ExpenseService();