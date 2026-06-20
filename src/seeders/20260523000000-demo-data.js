'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Seed Admin User
    const adminId = uuidv4();
    await queryInterface.bulkInsert('users', [{
      id: adminId,
      email: 'admin@gmail.com',
      password: '$2a$10$R9J0P.sgrcRmBGNV0uwzM.W0h2MXjc8piJS9JAy6nTg2LeWrDEtFa', // Admin@123
      shop_name: 'Metro Mobile Shop',
      logo: null,
      phone: '9876543210',
      address: '123 Main Street, Metro City',
      role: 'admin',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }]);

    // 2. Seed Categories
    const categoryPhoneId = uuidv4();
    const categoryAccessoryId = uuidv4();
    const categoryServiceId = uuidv4();

    await queryInterface.bulkInsert('categories', [
      {
        id: categoryPhoneId,
        category_name: 'Mobile Phones',
        description: 'Smartphones and Feature Phones',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: categoryAccessoryId,
        category_name: 'Accessories',
        description: 'Cases, Chargers, Headphones, etc.',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: categoryServiceId,
        category_name: 'Services',
        description: 'Repairs and Maintenance Services',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // 3. Seed Brands
    const brandAppleId = uuidv4();
    const brandSamsungId = uuidv4();
    const brandXiaomiId = uuidv4();

    await queryInterface.bulkInsert('brands', [
      {
        id: brandAppleId,
        brand_name: 'Apple',
        description: 'Apple Inc. devices',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: brandSamsungId,
        brand_name: 'Samsung',
        description: 'Samsung Electronics devices',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: brandXiaomiId,
        brand_name: 'Xiaomi',
        description: 'Xiaomi devices',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // 4. Seed Expense Categories
    await queryInterface.bulkInsert('expense_categories', [
      {
        id: uuidv4(),
        name: 'EXCHANGE',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'RENT',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'ELECTRICITY',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'SALARY',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'SUPPLIER_PAYMENT',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('expense_categories', null, {});
    await queryInterface.bulkDelete('brands', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
