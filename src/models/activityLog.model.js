const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  module_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  module_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  action_type: {
    type: DataTypes.STRING,
    allowNull: false // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
  },
  old_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  new_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true // User ID, NULL if system action or unauthenticated
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'activity_logs',
  underscored: true,
  timestamps: false // Handled manually via timestamp field
});

module.exports = ActivityLog;
