const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockHistory = sequelize.define('StockHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  change_type: {
    type: DataTypes.STRING,
    allowNull: false // 'stock_in', 'stock_out', 'sale', 'adjustment', 'initial'
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  remaining_stock: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  imei_1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imei_2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_histories',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = StockHistory;
