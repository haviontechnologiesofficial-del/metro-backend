const upload = require('../helpers/upload.helper');
const ApiResponse = require('../helpers/apiResponse.helper');

const uploadMiddleware = {
  single: (fieldname) => {
    return (req, res, next) => {
      upload.single(fieldname)(req, res, (err) => {
        if (err) {
          return ApiResponse.badRequest(res, err.message);
        }
        next();
      });
    };
  },
  array: (fieldname, maxCount = 5) => {
    return (req, res, next) => {
      upload.array(fieldname, maxCount)(req, res, (err) => {
        if (err) {
          return ApiResponse.badRequest(res, err.message);
        }
        next();
      });
    };
  },
  fields: (fieldsArray) => {
    return (req, res, next) => {
      upload.fields(fieldsArray)(req, res, (err) => {
        if (err) {
          return ApiResponse.badRequest(res, err.message);
        }
        next();
      });
    };
  }
};

module.exports = uploadMiddleware;
