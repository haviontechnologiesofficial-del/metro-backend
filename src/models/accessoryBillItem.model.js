const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccessoryBillItem = sequelize.define('AccessoryBillItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  accessory_bill_id: {
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
  color: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  tableName: 'accessory_bill_items',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = AccessoryBillItem;
