const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockTransaction = sequelize.define('StockTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  transaction_type: {
    type: DataTypes.STRING,
    allowNull: false // 'in' or 'out'
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  source_ref: {
    type: DataTypes.STRING,
    allowNull: true // references sales/bills/purchase transactions
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true // references user who triggered it
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_transactions',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = StockTransaction;
