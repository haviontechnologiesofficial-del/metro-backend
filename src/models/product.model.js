const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sku_code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  brand_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  phone_condition: {
    type: DataTypes.STRING,
    allowNull: true // e.g. 'new', 'used', 'refurbished' (for phones)
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  initial_stock_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  current_stock_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  cost_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  selling_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  imei_1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imei_2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  tableName: 'products',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = Product;
