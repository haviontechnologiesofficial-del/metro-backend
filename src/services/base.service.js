const db = require('../utils/db.util');

class BaseService {
  constructor(repository, moduleName) {
    this.repository = repository;
    this.moduleName = moduleName;
  }

  async create(data, req, transaction = null) {
    const record = await this.repository.create(data, transaction);
    const ActivityLogService = require('./activityLog.service');
    if (ActivityLogService && typeof ActivityLogService.log === 'function') {
      await ActivityLogService.log({
        moduleName: this.moduleName,
        moduleId: record.id,
        actionType: 'CREATE',
        newData: record,
        req
      }, transaction);
    }
    return record;
  }

  async update(id, data, req, transaction = null) {
    const record = await this.repository.findById(id, { transaction });
    if (!record) {
      throw new Error(`${this.moduleName} not found`);
    }
    const oldData = { ...record };
    const updatedRecord = await this.repository.update(id, data, transaction);
    const newData = { ...updatedRecord };
    
    const ActivityLogService = require('./activityLog.service');
    if (ActivityLogService && typeof ActivityLogService.log === 'function') {
      await ActivityLogService.log({
        moduleName: this.moduleName,
        moduleId: id,
        actionType: 'UPDATE',
        oldData,
        newData,
        req
      }, transaction);
    }

    return updatedRecord;
  }

  async delete(id, req, transaction = null) {
    const record = await this.repository.findById(id, { transaction });
    if (!record) {
      throw new Error(`${this.moduleName} not found`);
    }
    const oldData = { ...record };
    await this.repository.delete(id, transaction);

    const ActivityLogService = require('./activityLog.service');
    if (ActivityLogService && typeof ActivityLogService.log === 'function') {
      await ActivityLogService.log({
        moduleName: this.moduleName,
        moduleId: id,
        actionType: 'DELETE',
        oldData,
        req
      }, transaction);
    }

    return { id, message: `${this.moduleName} deleted successfully` };
  }

  async findById(id, options = {}) {
    const record = await this.repository.findById(id, options);
    if (!record) {
      throw new Error(`${this.moduleName} not found`);
    }
    return record;
  }

  async list(options) {
    return await this.repository.list(options);
  }
}

module.exports = BaseService;