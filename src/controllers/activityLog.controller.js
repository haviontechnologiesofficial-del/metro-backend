const BaseController = require('./base.controller');
const activityLogService = require('../services/activityLog.service');

class ActivityLogController extends BaseController {
  constructor() {
    super(activityLogService, ['module_name', 'action_type', 'module_id']);
  }
}

module.exports = new ActivityLogController();
