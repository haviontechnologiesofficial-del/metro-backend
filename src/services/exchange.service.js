const BaseService = require('./base.service');
const { exchangeRepository } = require('../repositories');
const expenseService = require('./expense.service');
const Transaction = require('../utils/transaction.util');
const db = require('../utils/db.util');

class ExchangeService extends BaseService {
  constructor() {
    super(exchangeRepository, 'EXCHANGE');
  }

  async create(data, req) {
    return await Transaction.execute(async (transaction) => {
      const fValue = parseFloat(data.exchange_value || 0);
      
      const isExchange = data.is_exchange !== undefined 
        ? (data.is_exchange === true || data.is_exchange === 'true' || data.is_exchange === 1) 
        : (data.isExchange === true || data.isExchange === 'true' || data.isExchange === 1 || data.isExchange === undefined);
      
      const cashOut = isExchange ? 0 : parseFloat(data.cash_amount !== undefined ? data.cash_amount : (data.cashOut || 0));
      const onlineOut = isExchange ? 0 : parseFloat(data.online_amount !== undefined ? data.online_amount : (data.onlineOut || 0));

      // Strip transient/computed fields that are not DB columns
      const { is_exchange, isExchange: _isExchange, cashOut: _cashOut, onlineOut: _onlineOut,
              expenseId: _expenseId, cash_amount, online_amount, ...dbData } = data;

      if (dbData.device_photos !== undefined && dbData.device_photos !== null && typeof dbData.device_photos === 'object') {
        dbData.device_photos = JSON.stringify(dbData.device_photos);
      }

      const exchange = await this.repository.create(dbData, transaction);

      const typeLabel = isExchange ? 'Exchange' : 'Buy old device';
      const expenseNote = `${typeLabel}: ${data.device_details || 'Device'} (IMEI: ${data.imei_1 || 'N/A'}) [Exchange ID: ${exchange.id}]`;

      await expenseService.create({
        amount: fValue,
        cash_amount: cashOut,
        online_amount: onlineOut,
        expense_type: 'exchange',
        category_name: 'EXCHANGE',
        date: new Date().toISOString().split('T')[0],
        notes: expenseNote,
        supplier_id: null
      }, {
        user: req.user,
        headers: req.headers,
        socket: req.socket
      }, transaction);

      await require('./activityLog.service').log({
        moduleName: 'EXCHANGE',
        moduleId: exchange.id,
        actionType: 'CREATE',
        newData: exchange,
        req
      }, transaction);

      return exchange;
    });
  }

  async update(id, data, req) {
    return await Transaction.execute(async (transaction) => {
      const exchange = await this.repository.findById(id, { transaction });
      if (!exchange) throw new Error('Exchange record not found');
      const oldData = { ...exchange };
      const previousValue = parseFloat(exchange.exchange_value || 0);
      const newValue = parseFloat(data.exchange_value !== undefined ? data.exchange_value : previousValue);

      // Strip transient/computed fields that are not DB columns
      const { is_exchange, isExchange: _isExchange, cashOut: _cashOut, onlineOut: _onlineOut,
              expenseId: _expenseId, cash_amount, online_amount, ...dbData } = data;

      if (dbData.device_photos !== undefined && dbData.device_photos !== null && typeof dbData.device_photos === 'object') {
        dbData.device_photos = JSON.stringify(dbData.device_photos);
      }

      await this.repository.update(id, dbData, transaction);

      const expenses = await db.findAll('expenses', {
        where: {
          expense_type: 'exchange'
        }
      });

      const matchingExpense = expenses.find(e => e.notes && e.notes.includes(exchange.id));
      if (matchingExpense) {
        const isExchange = data.is_exchange !== undefined 
          ? (data.is_exchange === true || data.is_exchange === 'true' || data.is_exchange === 1) 
          : (data.isExchange !== undefined 
              ? (data.isExchange === true || data.isExchange === 'true' || data.isExchange === 1)
              : (parseFloat(matchingExpense.cash_amount) === 0 && parseFloat(matchingExpense.online_amount) === 0));

        const cashOut = isExchange ? 0 : parseFloat(data.cash_amount !== undefined ? data.cash_amount : (data.cashOut !== undefined ? data.cashOut : matchingExpense.cash_amount));
        const onlineOut = isExchange ? 0 : parseFloat(data.online_amount !== undefined ? data.online_amount : (data.onlineOut !== undefined ? data.onlineOut : matchingExpense.online_amount));

        const typeLabel = isExchange ? 'Exchange' : 'Buy old device';
        const updatedDeviceDetails = data.device_details !== undefined ? data.device_details : exchange.device_details;
        const updatedImei1 = data.imei_1 !== undefined ? data.imei_1 : exchange.imei_1;
        const updatedNote = `${typeLabel}: ${updatedDeviceDetails || 'Device'} (IMEI: ${updatedImei1 || 'N/A'}) [Exchange ID: ${exchange.id}]`;

        await expenseService.update(matchingExpense.id, {
          amount: newValue,
          cash_amount: cashOut,
          online_amount: onlineOut,
          notes: updatedNote
        }, {
          user: req.user,
          headers: req.headers,
          socket: req.socket
        }, transaction);
      }

      await require('./activityLog.service').log({
        moduleName: 'EXCHANGE',
        moduleId: exchange.id,
        actionType: 'UPDATE',
        oldData,
        newData: { ...exchange, ...data },
        req
      }, transaction);

      return { ...exchange, ...data };
    });
  }

  async delete(id, req) {
    return await Transaction.execute(async (transaction) => {
      const exchange = await this.repository.findById(id, { transaction });
      if (!exchange) throw new Error('Exchange record not found');
      const oldData = { ...exchange };

      const expenses = await db.findAll('expenses', {
        where: {
          expense_type: 'exchange'
        }
      });

      const matchingExpense = expenses.find(e => e.notes && e.notes.includes(exchange.id));
      if (matchingExpense) {
        await expenseService.delete(matchingExpense.id, {
          user: req.user,
          headers: req.headers,
          socket: req.socket
        }, transaction);
      }

      await this.repository.delete(id, transaction);

      await require('./activityLog.service').log({
        moduleName: 'EXCHANGE',
        moduleId: id,
        actionType: 'DELETE',
        oldData,
        req
      }, transaction);

      return { id, message: 'Exchange record and automatic expense deleted and reversed successfully' };
    });
  }

  async findById(id, options = {}) {
    const record = await super.findById(id, options);
    if (record) {
      await this._populateExpenseDetails(record, options.transaction);
    }
    return record;
  }

  async list(options = {}) {
    const result = await super.list(options);
    if (result && result.rows) {
      for (const row of result.rows) {
        await this._populateExpenseDetails(row, options.transaction);
      }
    }
    return result;
  }

  async _populateExpenseDetails(record, transaction = null) {
    const expenses = await db.findAll('expenses', {
      where: { expense_type: 'exchange' },
      transaction
    });
    const matchingExpense = expenses.find(e => e.notes && e.notes.includes(record.id));
    if (matchingExpense) {
      const c = parseFloat(matchingExpense.cash_amount || 0);
      const o = parseFloat(matchingExpense.online_amount || 0);
      record.isExchange = (c === 0 && o === 0);
      record.cashOut = c;
      record.onlineOut = o;
      record.expenseId = matchingExpense.id;
    } else {
      record.isExchange = true;
      record.cashOut = 0;
      record.onlineOut = 0;
      record.expenseId = null;
    }
  }
}

module.exports = new ExchangeService();