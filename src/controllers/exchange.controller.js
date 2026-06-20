const BaseController = require('./base.controller');
const exchangeService = require('../services/exchange.service');
const ApiResponse = require('../helpers/apiResponse.helper');

class ExchangeController extends BaseController {
  constructor() {
    super(exchangeService, ['customer_name', 'phone', 'device_details', 'imei_1', 'imei_2']);
  }

  // Override create to intercept multer files
  async create(req, res, next) {
    try {
      const data = { ...req.body };

      // Parse existing device photos if any (passed as JSON string in body)
      let existingPhotos = [];
      if (data.device_photos) {
        try {
          existingPhotos = typeof data.device_photos === 'string'
            ? JSON.parse(data.device_photos)
            : data.device_photos;
        } catch (e) {
          // ignore
        }
      }
      if (!Array.isArray(existingPhotos)) {
        existingPhotos = [];
      }

      // Parse uploaded files if present
      if (req.files) {
        if (req.files['customer_photo'] && req.files['customer_photo'][0]) {
          data.customer_photo = req.files['customer_photo'][0].path.replace(/\\/g, '/');
        }
        if (req.files['id_proof_file'] && req.files['id_proof_file'][0]) {
          data.id_proof_file = req.files['id_proof_file'][0].path.replace(/\\/g, '/');
        }
        if (req.files['device_photos']) {
          const photoPaths = req.files['device_photos'].map(file => file.path.replace(/\\/g, '/'));
          data.device_photos = [...existingPhotos, ...photoPaths];
        } else {
          data.device_photos = existingPhotos;
        }
      } else {
        data.device_photos = existingPhotos;
      }

      const record = await this.service.create(data, req);
      return ApiResponse.success(res, 'Exchange record created successfully', record, {}, 201);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  // Override update to intercept multer files
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = { ...req.body };

      // Parse existing device photos if any (passed as JSON string in body)
      let existingPhotos = [];
      if (data.device_photos) {
        try {
          existingPhotos = typeof data.device_photos === 'string'
            ? JSON.parse(data.device_photos)
            : data.device_photos;
        } catch (e) {
          // ignore
        }
      }
      if (!Array.isArray(existingPhotos)) {
        existingPhotos = [];
      }

      if (req.files) {
        if (req.files['customer_photo'] && req.files['customer_photo'][0]) {
          data.customer_photo = req.files['customer_photo'][0].path.replace(/\\/g, '/');
        }
        if (req.files['id_proof_file'] && req.files['id_proof_file'][0]) {
          data.id_proof_file = req.files['id_proof_file'][0].path.replace(/\\/g, '/');
        }
        if (req.files['device_photos']) {
          const photoPaths = req.files['device_photos'].map(file => file.path.replace(/\\/g, '/'));
          data.device_photos = [...existingPhotos, ...photoPaths];
        } else {
          data.device_photos = existingPhotos;
        }
      } else {
        data.device_photos = existingPhotos;
      }

      const record = await this.service.update(id, data, req);
      return ApiResponse.success(res, 'Exchange record updated successfully', record);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }
}

module.exports = new ExchangeController();
