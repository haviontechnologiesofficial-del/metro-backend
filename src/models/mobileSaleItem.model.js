const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MobileSaleItem = sequelize.define('MobileSaleItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  mobile_sale_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  brand_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  product_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  phone_stock_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imei_1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imei_2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  tableName: 'mobile_sale_items',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = MobileSaleItem;
