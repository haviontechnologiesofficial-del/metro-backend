const { createModel } = require('../utils/model.util');

// All tables used in the application
const TABLES = {
  User: 'users',
  Category: 'categories',
  Brand: 'brands',
  Supplier: 'suppliers',
  Product: 'products',
  AccessoryBill: 'accessory_bills',
  AccessoryBillItem: 'accessory_bill_items',
  MobileSale: 'mobile_sales',
  MobileSaleItem: 'mobile_sale_items',
  ServiceBill: 'service_bills',
  Exchange: 'exchanges',
  ExpenseCategory: 'expense_categories',
  Expense: 'expenses',
  StockHistory: 'stock_histories',
  StockTransaction: 'stock_transactions',
  ActivityLog: 'activity_logs',
  FinancialTransaction: 'financial_transactions',
  BalanceHistory: 'balance_histories',
  SupplierTransaction: 'supplier_transactions'
};

// Create model objects for each table
const models = {};
Object.keys(TABLES).forEach(name => {
  models[name] = createModel(TABLES[name]);
});

module.exports = {
  ...models,
  // For backward compatibility - code that does require('../models') gets the models directly
  User: models.User,
  Category: models.Category,
  Brand: models.Brand,
  Supplier: models.Supplier,
  Product: models.Product,
  AccessoryBill: models.AccessoryBill,
  AccessoryBillItem: models.AccessoryBillItem,
  MobileSale: models.MobileSale,
  MobileSaleItem: models.MobileSaleItem,
  ServiceBill: models.ServiceBill,
  Exchange: models.Exchange,
  ExpenseCategory: models.ExpenseCategory,
  Expense: models.Expense,
  StockHistory: models.StockHistory,
  StockTransaction: models.StockTransaction,
  ActivityLog: models.ActivityLog,
  FinancialTransaction: models.FinancialTransaction,
  BalanceHistory: models.BalanceHistory,
  SupplierTransaction: models.SupplierTransaction
};