const db = require('../config/database');
const logger = require('./logger.util');

/**
 * Auto-create all required tables if they don't exist
 */
const autoMigrate = async () => {
  logger.info('Running auto-migration to ensure all tables exist...');

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) NOT NULL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      shop_name VARCHAR(255) DEFAULT NULL,
      logo VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(255) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      role VARCHAR(255) NOT NULL DEFAULT 'admin',
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS categories (
      id CHAR(36) NOT NULL PRIMARY KEY,
      category_name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS subcategories (
      id CHAR(36) NOT NULL PRIMARY KEY,
      subcategory_name VARCHAR(255) NOT NULL,
      category_id CHAR(36) NOT NULL,
      description TEXT DEFAULT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_subcategories_category (category_id),
      CONSTRAINT fk_subcategories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS brands (
      id CHAR(36) NOT NULL PRIMARY KEY,
      brand_name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS suppliers (
      id CHAR(36) NOT NULL PRIMARY KEY,
      supplier_type VARCHAR(255) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(255) DEFAULT NULL,
      pending_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      notes TEXT DEFAULT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS products (
      id CHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sku_code VARCHAR(255) DEFAULT NULL UNIQUE,
      category_id CHAR(36) DEFAULT NULL,
      brand_id CHAR(36) DEFAULT NULL,
      phone_condition VARCHAR(255) DEFAULT NULL,
      supplier_id CHAR(36) DEFAULT NULL,
      initial_stock_qty INT NOT NULL DEFAULT 0,
      current_stock_qty INT NOT NULL DEFAULT 0,
      cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      imei_1 VARCHAR(255) DEFAULT NULL,
      imei_2 VARCHAR(255) DEFAULT NULL,
      color VARCHAR(255) DEFAULT NULL,
      barcode VARCHAR(255) DEFAULT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_products_category (category_id),
      INDEX idx_products_brand (brand_id),
      INDEX idx_products_supplier (supplier_id),
      CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS accessory_bills (
      id CHAR(36) NOT NULL PRIMARY KEY,
      invoice_no VARCHAR(255) NOT NULL UNIQUE,
      customer_name VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(255) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      type VARCHAR(255) NOT NULL DEFAULT 'myself',
      supplier_name VARCHAR(255) DEFAULT NULL,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      gst DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total_before_discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      initial_payment DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      online_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      emi_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      bill_status VARCHAR(255) NOT NULL DEFAULT 'draft',
      notes TEXT DEFAULT NULL,
      warranty VARCHAR(255) DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS accessory_bill_items (
      id CHAR(36) NOT NULL PRIMARY KEY,
      accessory_bill_id CHAR(36) NOT NULL,
      category_id CHAR(36) DEFAULT NULL,
      brand_id CHAR(36) DEFAULT NULL,
      product_id CHAR(36) DEFAULT NULL,
      product_name VARCHAR(255) DEFAULT NULL,
      qty INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      color VARCHAR(255) DEFAULT NULL,
      total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_items_bill (accessory_bill_id),
      CONSTRAINT fk_items_bill FOREIGN KEY (accessory_bill_id) REFERENCES accessory_bills(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_items_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS mobile_sales (
      id CHAR(36) NOT NULL PRIMARY KEY,
      invoice_no VARCHAR(255) NOT NULL UNIQUE,
      customer_name VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(255) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      type VARCHAR(255) NOT NULL DEFAULT 'retail',
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      gst DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total_before_discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      initial_payment DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      online_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      emi_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(255) NOT NULL DEFAULT 'final',
      notes TEXT DEFAULT NULL,
      warranty VARCHAR(255) DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS mobile_sale_items (
      id CHAR(36) NOT NULL PRIMARY KEY,
      mobile_sale_id CHAR(36) NOT NULL,
      category_id CHAR(36) DEFAULT NULL,
      brand_id CHAR(36) DEFAULT NULL,
      product_id CHAR(36) DEFAULT NULL,
      product_name VARCHAR(255) DEFAULT NULL,
      qty INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      phone_stock_type VARCHAR(255) DEFAULT NULL,
      color VARCHAR(255) DEFAULT NULL,
      imei_1 VARCHAR(255) DEFAULT NULL,
      imei_2 VARCHAR(255) DEFAULT NULL,
      total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_sale_items_sale (mobile_sale_id),
      CONSTRAINT fk_sale_items_sale FOREIGN KEY (mobile_sale_id) REFERENCES mobile_sales(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_sale_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_sale_items_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS service_bills (
      id CHAR(36) NOT NULL PRIMARY KEY,
      invoice_no VARCHAR(255) NOT NULL UNIQUE,
      customer_name VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(255) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      service_details TEXT DEFAULT NULL,
      work_mode VARCHAR(255) NOT NULL DEFAULT 'self',
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      supplier_id CHAR(36) DEFAULT NULL,
      supplier_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      online_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      bill_status VARCHAR(255) NOT NULL DEFAULT 'draft',
      notes TEXT DEFAULT NULL,
      warranty VARCHAR(255) DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_service_bills_supplier (supplier_id),
      CONSTRAINT fk_service_bills_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS exchanges (
      id CHAR(36) NOT NULL PRIMARY KEY,
      customer_name VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(255) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      working_status VARCHAR(255) DEFAULT NULL,
      working_place VARCHAR(255) DEFAULT NULL,
      customer_photo VARCHAR(255) DEFAULT NULL,
      id_proof_type VARCHAR(255) DEFAULT NULL,
      id_proof_file VARCHAR(255) DEFAULT NULL,
      device_details VARCHAR(255) DEFAULT NULL,
      device_color VARCHAR(255) DEFAULT NULL,
      imei_1 VARCHAR(255) DEFAULT NULL,
      imei_2 VARCHAR(255) DEFAULT NULL,
      exchange_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      device_photos JSON DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS expense_categories (
      id CHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS expenses (
      id CHAR(36) NOT NULL PRIMARY KEY,
      expense_category_id CHAR(36) NOT NULL,
      supplier_id CHAR(36) DEFAULT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      date DATE NOT NULL,
      cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      online_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      notes TEXT DEFAULT NULL,
      expense_type VARCHAR(255) NOT NULL DEFAULT 'general',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_expenses_category (expense_category_id),
      INDEX idx_expenses_supplier (supplier_id),
      CONSTRAINT fk_expenses_category FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_expenses_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS stock_histories (
      id CHAR(36) NOT NULL PRIMARY KEY,
      product_id CHAR(36) NOT NULL,
      change_type VARCHAR(255) NOT NULL,
      qty INT NOT NULL,
      remaining_stock INT NOT NULL,
      imei_1 VARCHAR(255) DEFAULT NULL,
      imei_2 VARCHAR(255) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_stock_histories_product (product_id),
      CONSTRAINT fk_stock_histories_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS stock_transactions (
      id CHAR(36) NOT NULL PRIMARY KEY,
      product_id CHAR(36) NOT NULL,
      transaction_type VARCHAR(255) NOT NULL,
      qty INT NOT NULL,
      source_ref VARCHAR(255) DEFAULT NULL,
      performed_by CHAR(36) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_stock_transactions_product (product_id),
      INDEX idx_stock_transactions_user (performed_by),
      CONSTRAINT fk_stock_transactions_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_stock_transactions_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS activity_logs (
      id CHAR(36) NOT NULL PRIMARY KEY,
      module_name VARCHAR(255) NOT NULL,
      module_id VARCHAR(255) DEFAULT NULL,
      action_type VARCHAR(255) NOT NULL,
      old_data JSON DEFAULT NULL,
      new_data JSON DEFAULT NULL,
      performed_by CHAR(36) DEFAULT NULL,
      ip_address VARCHAR(255) DEFAULT NULL,
      user_agent VARCHAR(255) DEFAULT NULL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_activity_logs_module (module_name),
      INDEX idx_activity_logs_user (performed_by),
      CONSTRAINT fk_activity_logs_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS financial_transactions (
      id CHAR(36) NOT NULL PRIMARY KEY,
      transaction_type VARCHAR(255) NOT NULL,
      payment_method VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      online_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      reference_type VARCHAR(255) DEFAULT NULL,
      reference_id VARCHAR(255) DEFAULT NULL,
      performed_by CHAR(36) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_financial_transactions_user (performed_by),
      CONSTRAINT fk_financial_transactions_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS balance_histories (
      id CHAR(36) NOT NULL PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      open_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      cash_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      online_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS supplier_transactions (
      id CHAR(36) NOT NULL PRIMARY KEY,
      supplier_id CHAR(36) NOT NULL,
      transaction_type VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      balance_after DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      reference_type VARCHAR(255) DEFAULT NULL,
      reference_id VARCHAR(255) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME DEFAULT NULL,
      INDEX idx_supplier_transactions_supplier (supplier_id),
      CONSTRAINT fk_supplier_transactions_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const createSql of tables) {
    try {
      await db.pool.execute(createSql);
    } catch (error) {
      // If foreign key constraint fails (table referenced doesn't exist yet), skip and try later
      if (error.code === 'ER_CANT_CREATE_TABLE') {
        logger.warn(`Table creation deferred (FK dependency): ${error.message}`);
      } else {
        logger.error(`Error creating table: ${error.message}`);
        throw error;
      }
    }
  }

  // Ensure existing tables have subcategory_id columns
  try {
    const [columns] = await db.pool.execute("SHOW COLUMNS FROM products LIKE 'subcategory_id'");
    if (columns.length === 0) {
      logger.info('Adding subcategory_id column to products table...');
      await db.pool.execute(`
        ALTER TABLE products 
        ADD COLUMN subcategory_id CHAR(36) DEFAULT NULL AFTER category_id,
        ADD INDEX idx_products_subcategory (subcategory_id),
        ADD CONSTRAINT fk_products_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
      logger.info('subcategory_id column added to products table.');
    }
  } catch (error) {
    logger.error('Error adding subcategory_id column to products table:', error);
  }

  try {
    const [columns] = await db.pool.execute("SHOW COLUMNS FROM mobile_sale_items LIKE 'subcategory_id'");
    if (columns.length === 0) {
      logger.info('Adding subcategory_id column to mobile_sale_items table...');
      await db.pool.execute(`
        ALTER TABLE mobile_sale_items 
        ADD COLUMN subcategory_id CHAR(36) DEFAULT NULL AFTER category_id,
        ADD INDEX idx_sale_items_subcategory (subcategory_id),
        ADD CONSTRAINT fk_sale_items_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
      logger.info('subcategory_id column added to mobile_sale_items.');
    }
  } catch (error) {
    logger.error('Error adding subcategory_id column to mobile_sale_items:', error);
  }

  try {
    const [columns] = await db.pool.execute("SHOW COLUMNS FROM accessory_bill_items LIKE 'subcategory_id'");
    if (columns.length === 0) {
      logger.info('Adding subcategory_id column to accessory_bill_items table...');
      await db.pool.execute(`
        ALTER TABLE accessory_bill_items 
        ADD COLUMN subcategory_id CHAR(36) DEFAULT NULL AFTER category_id,
        ADD INDEX idx_accessory_items_subcategory (subcategory_id),
        ADD CONSTRAINT fk_accessory_items_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
      logger.info('subcategory_id column added to accessory_bill_items.');
    }
  } catch (error) {
    logger.error('Error adding subcategory_id column to accessory_bill_items:', error);
  }
  try {
    const [columns] = await db.pool.execute("SHOW COLUMNS FROM mobile_sales LIKE 'warranty'");
    if (columns.length === 0) {
      logger.info('Adding warranty column to mobile_sales table...');
      await db.pool.execute("ALTER TABLE mobile_sales ADD COLUMN warranty VARCHAR(255) DEFAULT NULL AFTER notes");
      logger.info('warranty column added to mobile_sales.');
    }
  } catch (error) {
    logger.error('Error adding warranty column to mobile_sales:', error);
  }

  try {
    const [columns] = await db.pool.execute("SHOW COLUMNS FROM accessory_bills LIKE 'warranty'");
    if (columns.length === 0) {
      logger.info('Adding warranty column to accessory_bills table...');
      await db.pool.execute("ALTER TABLE accessory_bills ADD COLUMN warranty VARCHAR(255) DEFAULT NULL AFTER notes");
      logger.info('warranty column added to accessory_bills.');
    }
  } catch (error) {
    logger.error('Error adding warranty column to accessory_bills:', error);
  }

  try {
    const [columns] = await db.pool.execute("SHOW COLUMNS FROM service_bills LIKE 'warranty'");
    if (columns.length === 0) {
      logger.info('Adding warranty column to service_bills table...');
      await db.pool.execute("ALTER TABLE service_bills ADD COLUMN warranty VARCHAR(255) DEFAULT NULL AFTER notes");
      logger.info('warranty column added to service_bills.');
    }
  } catch (error) {
    logger.error('Error adding warranty column to service_bills:', error);
  }

  logger.info('Auto-migration completed successfully.');
};

module.exports = autoMigrate;