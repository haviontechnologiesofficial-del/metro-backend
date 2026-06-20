const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const loggerMiddleware = require('./middlewares/logger.middleware');
const errorMiddleware = require('./middlewares/error.middleware');
const ApiResponse = require('./helpers/apiResponse.helper');

// Initialize Express App
const app = express();

// Create uploads sub-directories on startup if not exist
const uploadDirs = [
  'src/uploads',
  'src/uploads/customers',
  'src/uploads/exchange',
  'src/uploads/idproofs',
  'src/uploads/logos',
  'src/uploads/invoices',
  'src/logs'
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading static images across origins
}));

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global Rate Limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000, // limit each IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// 2. Parsers & Logger
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(loggerMiddleware);

// 3. Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple request XSS / SQL Injection sanitization middleware
app.use((req, res, next) => {
  const sanitize = (val) => {
    if (typeof val === 'string') {
      // Basic strip script tags
      return val.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/onload=/gi, '')
                .trim();
    }
    if (Array.isArray(val)) {
      return val.map(sanitize);
    }
    if (typeof val === 'object' && val !== null) {
      const clean = {};
      Object.keys(val).forEach(k => {
        clean[k] = sanitize(val[k]);
      });
      return clean;
    }
    return val;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
});

// 4. Routes Registry
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const brandRoutes = require('./routes/brand.routes');
const supplierRoutes = require('./routes/supplier.routes');
const productRoutes = require('./routes/product.routes');
const accessoryBillRoutes = require('./routes/accessoryBill.routes');
const mobileSaleRoutes = require('./routes/mobileSale.routes');
const serviceBillRoutes = require('./routes/serviceBill.routes');
const exchangeRoutes = require('./routes/exchange.routes');
const expenseRoutes = require('./routes/expense.routes');
const expenseCategoryRoutes = require('./routes/expenseCategory.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const stockRoutes = require('./routes/stock.routes');
const openBalanceRoutes = require('./routes/openBalance.routes');

// API Versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/accessory-bills', accessoryBillRoutes);
app.use('/api/v1/mobile-sales', mobileSaleRoutes);
app.use('/api/v1/service-bills', serviceBillRoutes);
app.use('/api/v1/exchanges', exchangeRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/expense-categories', expenseCategoryRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/activity-logs', activityLogRoutes);
app.use('/api/v1/stocks', stockRoutes);
app.use('/api/v1/open-balance', openBalanceRoutes);

// Base Route
app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to Metro Mobile Shop ERP API service (v1)',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// 404 Route
app.use((req, res, next) => {
  return ApiResponse.notFound(res, `API route not found: ${req.originalUrl}`);
});

// 5. Global Error Handler Middleware
app.use(errorMiddleware);

module.exports = app;
