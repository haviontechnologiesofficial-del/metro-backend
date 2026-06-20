const BaseService = require('./base.service');
const { activityLogRepository } = require('../repositories');
const db = require('../utils/db.util');

class ActivityLogService extends BaseService {
  constructor() {
    super(activityLogRepository, 'ACTIVITY_LOG');
  }

  async log({ moduleName, moduleId, actionType, oldData, newData, req }, transaction = null) {
    try {
      const performedBy = req && req.user ? req.user.id : null;
      const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
      const userAgent = req ? req.headers['user-agent'] : null;

      const cleanData = (data) => {
        if (!data) return null;
        const copy = JSON.parse(JSON.stringify(data));
        const sensitiveFields = ['password', 'token', 'refreshToken'];
        sensitiveFields.forEach(field => {
          if (copy[field]) copy[field] = '********';
        });
        // Return as object for MySQL JSON column type
        return copy;
      };

      const insertData = {
        module_name: moduleName,
        module_id: moduleId ? String(moduleId) : null,
        action_type: actionType,
        old_data: cleanData(oldData),
        new_data: cleanData(newData),
        performed_by: performedBy,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date()
      };

      // Convert JSON objects to strings for MySQL prepared statements
      if (typeof insertData.old_data === 'object' && insertData.old_data !== null) {
        insertData.old_data = JSON.stringify(insertData.old_data);
      }
      if (typeof insertData.new_data === 'object' && insertData.new_data !== null) {
        insertData.new_data = JSON.stringify(insertData.new_data);
      }

      await activityLogRepository.create(insertData, transaction);
    } catch (error) {
      console.error('Failed to write activity log:', error);
    }
  }

  async list(options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'users' }, as: 'user', attributes: ['id', 'email', 'shop_name', 'role'] }
    ];
    if (options.dateRange) {
      options.dateRange.field = 'timestamp';
    }
    return await super.list({ ...options, includes });
  }
}

module.exports = new ActivityLogService();