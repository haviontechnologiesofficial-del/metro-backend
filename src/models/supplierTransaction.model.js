const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierTransaction = sequelize.define('SupplierTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  transaction_type: {
    type: DataTypes.STRING,
    allowNull: false // 'service_charge', 'payment', 'expense_deduction', 'initial'
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  balance_after: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00 // supplier pending_amount after transaction is applied
  },
  reference_type: {
    type: DataTypes.STRING,
    allowNull: true // 'service_bill', 'expense', 'manual'
  },
  reference_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'supplier_transactions',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = SupplierTransaction;
