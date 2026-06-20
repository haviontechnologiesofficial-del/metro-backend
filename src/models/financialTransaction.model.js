const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialTransaction = sequelize.define('FinancialTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  transaction_type: {
    type: DataTypes.STRING,
    allowNull: false // 'income', 'expense', 'balance_adjustment'
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: false // 'cash', 'online', 'both'
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  cash_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  online_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  reference_type: {
    type: DataTypes.STRING,
    allowNull: true // 'accessory_bill', 'mobile_sale', 'service_bill', 'exchange', 'expense'
  },
  reference_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'financial_transactions',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = FinancialTransaction;
