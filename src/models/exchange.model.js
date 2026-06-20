const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Exchange = sequelize.define('Exchange', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  working_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  working_place: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customer_photo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  id_proof_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  id_proof_file: {
    type: DataTypes.STRING,
    allowNull: true
  },
  device_details: {
    type: DataTypes.STRING,
    allowNull: true
  },
  device_color: {
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
  exchange_value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  device_photos: {
    type: DataTypes.JSON,
    allowNull: true // Max 5 image paths array, stored as JSON in MySQL
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'exchanges',
  underscored: true,
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = Exchange;
