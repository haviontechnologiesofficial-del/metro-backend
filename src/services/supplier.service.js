const BaseService = require('./base.service');
const { supplierRepository, supplierTransactionRepository } = require('../repositories');
const db = require('../utils/db.util');

class SupplierService extends BaseService {
  constructor() {
    super(supplierRepository, 'SUPPLIER');
  }

  async increasePending({ supplierId, amount, referenceType, referenceId, notes }, transaction = null) {
    const supplier = await this.repository.findById(supplierId, { transaction });
    if (!supplier) throw new Error(`Supplier not found with ID ${supplierId}`);

    const fAmount = parseFloat(amount || 0);
    const previousPending = parseFloat(supplier.pending_amount);
    const newPending = previousPending + fAmount;

    await this.repository.update(supplierId, { pending_amount: newPending }, transaction);
    await supplierTransactionRepository.create({
      supplier_id: supplierId,
      transaction_type: 'service_charge',
      amount: fAmount,
      balance_after: newPending,
      reference_type: referenceType,
      reference_id: referenceId,
      notes: notes || `Service balance increased by ${referenceType}`
    }, transaction);

    return { ...supplier, pending_amount: newPending };
  }

  async reducePending({ supplierId, amount, referenceType, referenceId, notes }, transaction = null) {
    const supplier = await this.repository.findById(supplierId, { transaction });
    if (!supplier) throw new Error(`Supplier not found with ID ${supplierId}`);

    const fAmount = parseFloat(amount || 0);
    const previousPending = parseFloat(supplier.pending_amount);
    const newPending = previousPending - fAmount;

    await this.repository.update(supplierId, { pending_amount: newPending }, transaction);
    await supplierTransactionRepository.create({
      supplier_id: supplierId,
      transaction_type: 'payment',
      amount: fAmount,
      balance_after: newPending,
      reference_type: referenceType,
      reference_id: referenceId,
      notes: notes || `Payment of ${fAmount} made to supplier`
    }, transaction);

    return { ...supplier, pending_amount: newPending };
  }

  async recalculatePending(supplierId) {
    const supplier = await this.repository.findById(supplierId);
    if (!supplier) throw new Error(`Supplier not found with ID ${supplierId}`);

    // 1. Sum all final service bill supplier amounts
    const serviceBills = await db.findAll('service_bills', {
      where: { supplier_id: supplierId, bill_status: 'final' }
    });
    const serviceBilled = serviceBills.reduce((sum, b) => sum + parseFloat(b.supplier_amount || 0), 0);

    // 2. Sum product initial stock costs
    const products = await db.findAll('products', {
      where: { supplier_id: supplierId }
    });
    let initialStockCost = 0;
    products.forEach(p => {
      initialStockCost += parseInt(p.initial_stock_qty || 0, 10) * parseFloat(p.cost_price || 0);
    });

    // 3. Sum manual stock additions
    const allStockHistory = await db.query(
      `SELECT sh.*, p.cost_price, p.supplier_id as prod_supplier_id FROM stock_histories sh 
       LEFT JOIN products p ON sh.product_id = p.id 
       WHERE sh.change_type = 'stock_in' AND sh.deleted_at IS NULL`
    );
    let manualStockCost = 0;
    allStockHistory.forEach(h => {
      let notesSupId = null;
      if (h.notes && h.notes.startsWith('{')) {
        try { const obj = JSON.parse(h.notes); notesSupId = obj.supplierId; } catch (e) {}
      }
      if (notesSupId === supplierId) {
        manualStockCost += parseInt(h.qty || 0, 10) * parseFloat(h.cost_price || 0);
      }
    });

    // 4. Sum payments
    const payments = await db.findAll('expenses', {
      where: { supplier_id: supplierId, expense_type: 'supplier_payment' }
    });
    const totalPaid = payments.reduce((sum, e) => {
      return sum + parseFloat(e.cash_amount || 0) + parseFloat(e.online_amount || 0);
    }, 0);

    const totalBilled = serviceBilled + initialStockCost + manualStockCost;
    const newPending = Math.max(0, totalBilled - totalPaid);

    await this.repository.update(supplierId, { pending_amount: newPending });
    return { ...supplier, pending_amount: newPending };
  }

  async getSupplierLedger(supplierId, transaction = null) {
    const query = transaction ? transaction.query : db.query;
    return await query(
      'SELECT * FROM supplier_transactions WHERE supplier_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [supplierId]
    );
  }
}

module.exports = new SupplierService();