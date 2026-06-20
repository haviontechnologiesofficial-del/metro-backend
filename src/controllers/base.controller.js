const ApiResponse = require('../helpers/apiResponse.helper');
const PaginationHelper = require('../helpers/pagination.helper');

class BaseController {
  constructor(service, searchFields = []) {
    this.service = service;
    this.searchFields = searchFields;
  }

  async create(req, res, next) {
    try {
      const record = await this.service.create(req.body, req);
      return ApiResponse.success(res, 'Created successfully', record, {}, 201);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.update(id, req.body, req);
      return ApiResponse.success(res, 'Updated successfully', record);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await this.service.delete(id, req);
      return ApiResponse.success(res, 'Deleted successfully', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.findById(id);
      return ApiResponse.success(res, 'Retrieved successfully', record);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async list(req, res, next) {
    try {
      const { page, limit } = PaginationHelper.getOptions(req.query);
      const search = req.query.search || '';
      
      // Extract filters (remove non-db parameters)
      const filters = { ...req.query };
      delete filters.page;
      delete filters.limit;
      delete filters.search;
      delete filters.sortBy;
      delete filters.sortOrder;
      delete filters.startDate;
      delete filters.endDate;
      delete filters.dateField;

      let dateRange = null;
      if (req.query.startDate && req.query.endDate) {
        dateRange = {
          start: req.query.startDate,
          end: req.query.endDate,
          field: req.query.dateField || 'created_at'
        };
      }

      const data = await this.service.list({
        page,
        limit,
        search,
        searchFields: this.searchFields,
        filters,
        dateRange,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC'
      });

      const paginatedResponse = PaginationHelper.formatResponse(data, page, limit);
      return ApiResponse.success(res, 'Listed successfully', paginatedResponse.rows, paginatedResponse.meta);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }
}

module.exports = BaseController;
