const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceBill = sequelize.define('ServiceBill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_no: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  service_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  work_mode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'self' // 'self' or 'outsourced'
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: true // references outsourced service supplier
  },
  supplier_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00 // cost owed to outsourced supplier
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
  bill_status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'draft' // 'draft', 'final', 'completed'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'service_bills',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = ServiceBill;
