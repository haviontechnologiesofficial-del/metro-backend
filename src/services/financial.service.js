const db = require('../utils/db.util');

class FinancialService {
  // ──────────────────────────────────────────────
  // Open Balance CRUD Operations
  // ──────────────────────────────────────────────

  /**
   * Get all balance history records with optional date range filtering
   */
  static async getAllOpenBalances({ startDate, endDate, limit, offset } = {}) {
    const where = {};
    if (startDate && endDate) {
      where.date = { between: [startDate, endDate] };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    const rows = await db.findAll('balance_histories', {
      where,
      orderBy: 'date',
      orderDir: 'DESC',
      limit,
      offset
    });

    const total = await db.count('balance_histories', where);

    return {
      data: rows.map(r => ({
        id: r.id,
        date: r.date,
        open_balance: parseFloat(r.open_balance),
        cash_balance: parseFloat(r.cash_balance),
        online_balance: parseFloat(r.online_balance),
        total_balance: parseFloat(r.total_balance),
        created_at: r.created_at,
        updated_at: r.updated_at
      })),
      total
    };
  }

  /**
   * Get a single balance history record by ID
   */
  static async getOpenBalanceById(id) {
    const record = await db.findById('balance_histories', id);
    if (!record) return null;

    return {
      id: record.id,
      date: record.date,
      open_balance: parseFloat(record.open_balance),
      cash_balance: parseFloat(record.cash_balance),
      online_balance: parseFloat(record.online_balance),
      total_balance: parseFloat(record.total_balance),
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  }

  /**
   * Update a balance history record (open_balance, cash_balance, online_balance)
   */
  static async updateOpenBalance(id, { openBalance, cashBalance, onlineBalance, notes }) {
    const record = await db.findById('balance_histories', id);
    if (!record) throw new Error('Balance record not found');

    const updateData = {};
    if (openBalance !== undefined) updateData.open_balance = parseFloat(openBalance);
    if (cashBalance !== undefined) updateData.cash_balance = parseFloat(cashBalance);
    if (onlineBalance !== undefined) updateData.online_balance = parseFloat(onlineBalance);

    // Recalculate total if either cash or online changed
    const newCash = updateData.cash_balance !== undefined ? updateData.cash_balance : parseFloat(record.cash_balance);
    const newOnline = updateData.online_balance !== undefined ? updateData.online_balance : parseFloat(record.online_balance);
    updateData.total_balance = newCash + newOnline;

    const updated = await db.update('balance_histories', id, updateData);
    return {
      id: updated.id,
      date: updated.date,
      open_balance: parseFloat(updated.open_balance),
      cash_balance: parseFloat(updated.cash_balance),
      online_balance: parseFloat(updated.online_balance),
      total_balance: parseFloat(updated.total_balance),
      created_at: updated.created_at,
      updated_at: updated.updated_at
    };
  }

  /**
   * Soft delete a balance history record
   */
  static async deleteOpenBalance(id) {
    const record = await db.findById('balance_histories', id);
    if (!record) throw new Error('Balance record not found');

    await db.delete('balance_histories', id);
    return { id, deleted: true };
  }

  // ──────────────────────────────────────────────
  // Core Balance Operations (for overall balance)
  // ──────────────────────────────────────────────

  static async getOrCreateBalanceRecord(dateStr, transaction = null) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const query = transaction ? transaction.query : db.query;

    let rows = await query('SELECT * FROM balance_histories WHERE date = ? AND deleted_at IS NULL', [targetDate]);

    if (rows.length > 0) {
      return rows[0];
    }

    const previousRows = await query(
      'SELECT * FROM balance_histories WHERE date < ? AND deleted_at IS NULL ORDER BY date DESC LIMIT 1',
      [targetDate]
    );

    let openBalance = 0;
    let cashBalance = 0;
    let onlineBalance = 0;

    if (previousRows.length > 0) {
      cashBalance = parseFloat(previousRows[0].cash_balance);
      onlineBalance = parseFloat(previousRows[0].online_balance);
      openBalance = cashBalance + onlineBalance;
    }

    try {
      await query(
        'INSERT INTO balance_histories (id, date, open_balance, cash_balance, online_balance, total_balance, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, NOW(), NOW())',
        [targetDate, openBalance, cashBalance, onlineBalance, cashBalance + onlineBalance]
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY' && !error.message.includes('Duplicate entry')) {
        throw error;
      }
    }

    rows = await query('SELECT * FROM balance_histories WHERE date = ? AND deleted_at IS NULL', [targetDate]);
    return rows[0];
  }

  /**
   * Add cash and/or online amounts to today's overall balance (simplified income)
   */
  static async addCashOnline({ cashAmount, onlineAmount, referenceType, referenceId, performedBy, notes }, transaction = null) {
    const today = new Date().toISOString().split('T')[0];
    const balanceRecord = await this.getOrCreateBalanceRecord(today, transaction);

    const fCash = parseFloat(cashAmount || 0);
    const fOnline = parseFloat(onlineAmount || 0);

    const newCash = parseFloat(balanceRecord.cash_balance) + fCash;
    const newOnline = parseFloat(balanceRecord.online_balance) + fOnline;

    const query = transaction ? transaction.query : db.query;
    await query('UPDATE balance_histories SET cash_balance = ?, online_balance = ?, total_balance = ? WHERE id = ?',
      [newCash, newOnline, newCash + newOnline, balanceRecord.id]);

    const result = await query(
      'INSERT INTO financial_transactions (id, transaction_type, payment_method, amount, cash_amount, online_amount, reference_type, reference_id, performed_by, notes, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      ['income', fCash > 0 && fOnline > 0 ? 'both' : (fCash > 0 ? 'cash' : 'online'), fCash + fOnline, fCash, fOnline, referenceType, referenceId, performedBy, notes || `Income from ${referenceType || 'overall'}`]
    );

    return result;
  }

  /**
   * Subtract cash and/or online amounts from today's overall balance (simplified expense)
   */
  static async subtractCashOnline({ cashAmount, onlineAmount, referenceType, referenceId, performedBy, notes }, transaction = null) {
    const today = new Date().toISOString().split('T')[0];
    const balanceRecord = await this.getOrCreateBalanceRecord(today, transaction);

    const fCash = parseFloat(cashAmount || 0);
    const fOnline = parseFloat(onlineAmount || 0);

    const newCash = parseFloat(balanceRecord.cash_balance) - fCash;
    const newOnline = parseFloat(balanceRecord.online_balance) - fOnline;

    const query = transaction ? transaction.query : db.query;
    await query('UPDATE balance_histories SET cash_balance = ?, online_balance = ?, total_balance = ? WHERE id = ?',
      [newCash, newOnline, newCash + newOnline, balanceRecord.id]);

    const result = await query(
      'INSERT INTO financial_transactions (id, transaction_type, payment_method, amount, cash_amount, online_amount, reference_type, reference_id, performed_by, notes, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      ['expense', fCash > 0 && fOnline > 0 ? 'both' : (fCash > 0 ? 'cash' : 'online'), fCash + fOnline, fCash, fOnline, referenceType, referenceId, performedBy, notes || `Expense from ${referenceType || 'overall'}`]
    );

    return result;
  }

  /**
   * Record income transaction and update balance history
   */
  static async recordIncome({ amount, cashAmount, onlineAmount, referenceType, referenceId, performedBy, notes }, transaction = null) {
    const today = new Date().toISOString().split('T')[0];
    const balanceRecord = await this.getOrCreateBalanceRecord(today, transaction);

    const fCash = parseFloat(cashAmount || 0);
    const fOnline = parseFloat(onlineAmount || 0);
    const fAmount = amount !== undefined ? parseFloat(amount) : (fCash + fOnline);

    const newCash = parseFloat(balanceRecord.cash_balance) + fCash;
    const newOnline = parseFloat(balanceRecord.online_balance) + fOnline;

    const query = transaction ? transaction.query : db.query;
    await query('UPDATE balance_histories SET cash_balance = ?, online_balance = ?, total_balance = ? WHERE id = ?',
      [newCash, newOnline, newCash + newOnline, balanceRecord.id]);

    const result = await query(
      'INSERT INTO financial_transactions (id, transaction_type, payment_method, amount, cash_amount, online_amount, reference_type, reference_id, performed_by, notes, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      ['income', fCash > 0 && fOnline > 0 ? 'both' : (fCash > 0 ? 'cash' : 'online'), fAmount, fCash, fOnline, referenceType, referenceId, performedBy, notes || `Income from ${referenceType || 'overall'}`]
    );

    return result;
  }

  /**
   * Record expense transaction and update balance history
   */
  static async recordExpense({ amount, cashAmount, onlineAmount, referenceType, referenceId, performedBy, notes }, transaction = null) {
    const today = new Date().toISOString().split('T')[0];
    const balanceRecord = await this.getOrCreateBalanceRecord(today, transaction);

    const fCash = parseFloat(cashAmount || 0);
    const fOnline = parseFloat(onlineAmount || 0);
    const fAmount = amount !== undefined ? parseFloat(amount) : (fCash + fOnline);

    const newCash = parseFloat(balanceRecord.cash_balance) - fCash;
    const newOnline = parseFloat(balanceRecord.online_balance) - fOnline;

    const query = transaction ? transaction.query : db.query;
    await query('UPDATE balance_histories SET cash_balance = ?, online_balance = ?, total_balance = ? WHERE id = ?',
      [newCash, newOnline, newCash + newOnline, balanceRecord.id]);

    const result = await query(
      'INSERT INTO financial_transactions (id, transaction_type, payment_method, amount, cash_amount, online_amount, reference_type, reference_id, performed_by, notes, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      ['expense', fCash > 0 && fOnline > 0 ? 'both' : (fCash > 0 ? 'cash' : 'online'), fAmount, fCash, fOnline, referenceType, referenceId, performedBy, notes || `Expense from ${referenceType || 'overall'}`]
    );

    return result;
  }

  /**
   * Get today's overall balance
   */
  static async getOverallBalance(transaction = null) {
    const balanceRecord = await this.getOrCreateBalanceRecord(null, transaction);
    return {
      cash_balance: parseFloat(balanceRecord.cash_balance),
      online_balance: parseFloat(balanceRecord.online_balance),
      open_balance: parseFloat(balanceRecord.open_balance),
      total_balance: parseFloat(balanceRecord.total_balance)
    };
  }
}

module.exports = FinancialService;