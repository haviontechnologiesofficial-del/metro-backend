const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadFolder = 'src/uploads';
    
    if (file.fieldname === 'logo') {
      uploadFolder = process.env.UPLOAD_PATH_LOGOS || 'src/uploads/logos';
    } else if (file.fieldname === 'customer_photo') {
      uploadFolder = process.env.UPLOAD_PATH_CUSTOMERS || 'src/uploads/customers';
    } else if (file.fieldname === 'id_proof_file') {
      uploadFolder = process.env.UPLOAD_PATH_IDPROOFS || 'src/uploads/idproofs';
    } else if (file.fieldname === 'device_photos') {
      uploadFolder = process.env.UPLOAD_PATH_EXCHANGE || 'src/uploads/exchange';
    } else if (file.fieldname === 'invoice') {
      uploadFolder = process.env.UPLOAD_PATH_INVOICES || 'src/uploads/invoices';
    }

    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
