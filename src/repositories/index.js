const BaseRepository = require('./base.repository');

// Map model names to table names
const TABLES = {
  user: 'users',
  category: 'categories',
  brand: 'brands',
  supplier: 'suppliers',
  product: 'products',
  accessoryBill: 'accessory_bills',
  accessoryBillItem: 'accessory_bill_items',
  mobileSale: 'mobile_sales',
  mobileSaleItem: 'mobile_sale_items',
  serviceBill: 'service_bills',
  exchange: 'exchanges',
  expenseCategory: 'expense_categories',
  expense: 'expenses',
  stockHistory: 'stock_histories',
  stockTransaction: 'stock_transactions',
  activityLog: 'activity_logs',
  financialTransaction: 'financial_transactions',
  balanceHistory: 'balance_histories',
  supplierTransaction: 'supplier_transactions'
};

class UserRepository extends BaseRepository {
  constructor() {
    super(TABLES.user);
  }

  async findByEmail(email) {
    const db = require('../utils/db.util');
    return await db.findOne(TABLES.user, { email });
  }
}

class CategoryRepository extends BaseRepository {
  constructor() {
    super(TABLES.category);
  }
}

class BrandRepository extends BaseRepository {
  constructor() {
    super(TABLES.brand);
  }
}

class SupplierRepository extends BaseRepository {
  constructor() {
    super(TABLES.supplier);
  }
}

class ProductRepository extends BaseRepository {
  constructor() {
    super(TABLES.product);
  }
}

class AccessoryBillRepository extends BaseRepository {
  constructor() {
    super(TABLES.accessoryBill);
  }
}

class AccessoryBillItemRepository extends BaseRepository {
  constructor() {
    super(TABLES.accessoryBillItem);
  }
}

class MobileSaleRepository extends BaseRepository {
  constructor() {
    super(TABLES.mobileSale);
  }
}

class MobileSaleItemRepository extends BaseRepository {
  constructor() {
    super(TABLES.mobileSaleItem);
  }
}

class ServiceBillRepository extends BaseRepository {
  constructor() {
    super(TABLES.serviceBill);
  }
}

class ExchangeRepository extends BaseRepository {
  constructor() {
    super(TABLES.exchange);
  }
}

class ExpenseCategoryRepository extends BaseRepository {
  constructor() {
    super(TABLES.expenseCategory);
  }

  async findByName(name) {
    const db = require('../utils/db.util');
    return await db.findOne(TABLES.expenseCategory, { name });
  }
}

class ExpenseRepository extends BaseRepository {
  constructor() {
    super(TABLES.expense);
  }
}

class StockHistoryRepository extends BaseRepository {
  constructor() {
    super(TABLES.stockHistory);
  }
}

class StockTransactionRepository extends BaseRepository {
  constructor() {
    super(TABLES.stockTransaction);
  }
}

class ActivityLogRepository extends BaseRepository {
  constructor() {
    super(TABLES.activityLog);
  }
}

class FinancialTransactionRepository extends BaseRepository {
  constructor() {
    super(TABLES.financialTransaction);
  }
}

class BalanceHistoryRepository extends BaseRepository {
  constructor() {
    super(TABLES.balanceHistory);
  }
}

class SupplierTransactionRepository extends BaseRepository {
  constructor() {
    super(TABLES.supplierTransaction);
  }
}

module.exports = {
  userRepository: new UserRepository(),
  categoryRepository: new CategoryRepository(),
  brandRepository: new BrandRepository(),
  supplierRepository: new SupplierRepository(),
  productRepository: new ProductRepository(),
  accessoryBillRepository: new AccessoryBillRepository(),
  accessoryBillItemRepository: new AccessoryBillItemRepository(),
  mobileSaleRepository: new MobileSaleRepository(),
  mobileSaleItemRepository: new MobileSaleItemRepository(),
  serviceBillRepository: new ServiceBillRepository(),
  exchangeRepository: new ExchangeRepository(),
  expenseCategoryRepository: new ExpenseCategoryRepository(),
  expenseRepository: new ExpenseRepository(),
  stockHistoryRepository: new StockHistoryRepository(),
  stockTransactionRepository: new StockTransactionRepository(),
  activityLogRepository: new ActivityLogRepository(),
  financialTransactionRepository: new FinancialTransactionRepository(),
  balanceHistoryRepository: new BalanceHistoryRepository(),
  supplierTransactionRepository: new SupplierTransactionRepository()
};