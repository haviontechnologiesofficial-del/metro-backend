require('dotenv').config();
const mysql = require('mysql2/promise');

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${process.env.PORT || 5000}/api/v1`;

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'metro_mobile',
  namedPlaceholders: true
};

const state = {
  token: null,
  ids: {},
  originalProfile: null,
  rows: []
};

function nowTag() {
  return Date.now().toString(36);
}

function money(v) {
  return Number.parseFloat(v || 0);
}

async function request(method, path, body, headers = {}) {
  const options = { method, headers: { ...headers } };
  if (body !== undefined) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }
  if (state.token) options.headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(`${BASE_URL}${path}`, options);
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { contentType, byteLength: (await res.arrayBuffer()).byteLength };
  }
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), data };
}

function shortBody(res) {
  return JSON.stringify(res.data).slice(0, 240);
}

async function q(conn, sql, params = {}) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

async function one(conn, sql, params = {}) {
  const rows = await q(conn, sql, params);
  return rows[0] || null;
}

function record({ endpoint, method, testData, dbStatus, expected, actual, pass, issue, fix }) {
  state.rows.push({
    endpoint,
    method,
    testData,
    dbStatus,
    expected,
    actual,
    pass: Boolean(pass),
    issue: issue || (pass ? 'None' : 'Unexpected API or DB behavior'),
    fix: fix || (pass ? 'No fix required' : 'Review controller/service validation and persistence logic')
  });
}

async function test(conn, spec) {
  try {
    await spec.run(conn);
  } catch (err) {
    record({
      endpoint: spec.endpoint,
      method: spec.method,
      testData: spec.testData || 'See runner',
      dbStatus: 'Not verified due exception',
      expected: spec.expected || 'Endpoint should complete without unhandled exception',
      actual: err.stack || err.message,
      pass: false,
      issue: err.message,
      fix: 'Reproduce with the shown payload and add error handling/validation around this flow'
    });
  }
}

async function main() {
  const tag = nowTag();
  const conn = await mysql.createConnection(dbConfig);

  await test(conn, {
    endpoint: '/auth/login',
    method: 'POST',
    expected: '200 with accessToken and user persisted in users table',
    run: async () => {
      const payload = { email: 'admin@gmail.com', password: 'Admin@123' };
      const res = await request('POST', '/auth/login', payload);
      const userId = res.data?.data?.user?.id;
      const user = userId ? await one(conn, 'SELECT id,email,role,status FROM users WHERE id=:id AND deleted_at IS NULL', { id: userId }) : null;
      state.token = res.data?.data?.accessToken;
      state.ids.admin = userId;
      record({
        endpoint: '/auth/login',
        method: 'POST',
        testData: JSON.stringify({ email: payload.email, password: '***' }),
        dbStatus: user ? `Verified user ${user.email}, role ${user.role}` : 'User not found',
        expected: 'HTTP 200, success true, JWT issued',
        actual: `HTTP ${res.status}, success=${res.data?.success}, token=${Boolean(state.token)}`,
        pass: res.status === 200 && Boolean(state.token) && Boolean(user),
        issue: !state.token ? 'Login did not issue token' : null,
        fix: !state.token ? 'Check seeded admin credentials and auth service token generation' : null
      });
    }
  });

  const secured = [
    ['GET', '/categories'],
    ['GET', '/brands'],
    ['GET', '/suppliers'],
    ['GET', '/products'],
    ['GET', '/accessory-bills'],
    ['GET', '/mobile-sales'],
    ['GET', '/service-bills'],
    ['GET', '/exchanges'],
    ['GET', '/expenses'],
    ['GET', '/expense-categories'],
    ['GET', '/dashboard/summary'],
    ['GET', '/reports/sales'],
    ['GET', '/activity-logs']
  ];

  for (const [method, path] of secured) {
    await test(conn, {
      endpoint: path,
      method,
      run: async () => {
        const saved = state.token;
        state.token = null;
        const res = await request(method, path);
        state.token = saved;
        record({
          endpoint: path,
          method,
          testData: 'No Authorization header',
          dbStatus: 'No DB mutation expected',
          expected: 'HTTP 401',
          actual: `HTTP ${res.status}`,
          pass: res.status === 401,
          issue: res.status !== 401 ? 'Protected endpoint is reachable without JWT' : null,
          fix: res.status !== 401 ? 'Ensure authMiddleware is mounted before route handlers' : null
        });
      }
    });
  }

  await test(conn, {
    endpoint: '/auth/profile',
    method: 'GET/PUT/POST',
    run: async () => {
      const get = await request('GET', '/auth/profile');
      state.originalProfile = get.data?.data;
      const payload = { shop_name: `Metro QA ${tag}`, phone: '9999988888', address: `QA Street ${tag}` };
      const update = await request('PUT', '/auth/profile', payload);
      const row = await one(conn, 'SELECT shop_name,phone,address FROM users WHERE id=:id', { id: state.ids.admin });
      const form = new FormData();
      form.append('logo', new Blob(['qa-logo'], { type: 'image/png' }), `qa-logo-${tag}.png`);
      const upload = await request('POST', '/auth/upload-logo', form);
      if (state.originalProfile) {
        await request('PUT', '/auth/profile', {
          shop_name: state.originalProfile.shop_name,
          phone: state.originalProfile.phone,
          address: state.originalProfile.address
        });
      }
      record({
        endpoint: '/auth/profile, /auth/upload-logo',
        method: 'GET/PUT/POST',
        testData: JSON.stringify(payload),
        dbStatus: row ? `Profile row updated to ${row.shop_name}; logo upload HTTP ${upload.status}` : 'User row missing',
        expected: 'Profile fetch/update and multipart logo upload succeed',
        actual: `GET ${get.status}, PUT ${update.status}, upload ${upload.status}`,
        pass: get.status === 200 && update.status === 200 && row?.shop_name === payload.shop_name && [200, 201].includes(upload.status),
        issue: upload.status >= 400 ? 'Logo upload endpoint failed for multipart file' : null,
        fix: upload.status >= 400 ? 'Check multer file filters, accepted extensions, and controller response' : null
      });
    }
  });

  async function crudBase(entity) {
    const cfg = {
      categories: { table: 'categories', nameField: 'category_name', body: { category_name: `QA Category ${tag}`, description: 'QA live category' }, update: { description: 'QA live category updated', status: 'inactive' } },
      brands: { table: 'brands', nameField: 'brand_name', body: { brand_name: `QA Brand ${tag}`, description: 'QA live brand' }, update: { description: 'QA live brand updated', status: 'inactive' } },
      suppliers: { table: 'suppliers', nameField: 'name', body: { name: `QA Supplier ${tag}`, supplier_type: 'service', phone: '9888877777', pending_amount: 0, notes: 'QA live supplier' }, update: { notes: 'QA live supplier updated', status: 'active' } }
    }[entity];
    const create = await request('POST', `/${entity}`, cfg.body);
    const id = create.data?.data?.id;
    state.ids[entity] = id;
    const dbCreate = id
      ? await one(conn, `SELECT * FROM ${cfg.table} WHERE id=:id AND deleted_at IS NULL`, { id })
      : await one(conn, `SELECT * FROM ${cfg.table} WHERE ${cfg.nameField}=:name AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`, { name: cfg.body[cfg.nameField] });
    if (!state.ids[entity] && dbCreate?.id) state.ids[entity] = dbCreate.id;
    const actualId = state.ids[entity];
    const list = await request('GET', `/${entity}?page=1&limit=10&search=${encodeURIComponent(tag)}`);
    const get = actualId ? await request('GET', `/${entity}/${actualId}`) : { status: 0, data: null };
    const update = actualId ? await request('PUT', `/${entity}/${actualId}`, cfg.update) : { status: 0, data: null };
    const dbUpdate = state.ids[entity] ? await one(conn, `SELECT * FROM ${cfg.table} WHERE id=:id AND deleted_at IS NULL`, { id: state.ids[entity] }) : null;
    record({
      endpoint: `/${entity}`,
      method: 'POST/GET/PUT',
      testData: JSON.stringify({ create: cfg.body, update: cfg.update }),
      dbStatus: dbCreate && dbUpdate ? `Created ${id}, updated status=${dbUpdate.status}` : 'Create/update not found in DB',
      expected: 'Create, list/search, get, update all succeed and DB row changes',
      actual: `POST ${create.status} ${shortBody(create)}, LIST ${list.status}, GET ${get.status}, PUT ${update.status}`,
      pass: create.status === 201 && list.status === 200 && get.status === 200 && update.status === 200 && Boolean(dbCreate) && Boolean(dbUpdate),
      issue: create.status !== 201 && dbCreate ? `${entity} API returns failure after inserting DB row` : (create.status !== 201 ? `${entity} create failed` : null),
      fix: create.status !== 201 ? 'Break the BaseService <-> ActivityLogService circular dependency and make create/update/delete atomic so audit-log failure cannot leave a false API failure with committed data' : null
    });
  }

  await crudBase('categories');
  await crudBase('brands');
  await crudBase('suppliers');

  await test(conn, {
    endpoint: '/products',
    method: 'POST/GET/PUT',
    run: async () => {
      const accessoryPayload = {
        name: `QA Charger ${tag}`,
        sku_code: `QA-ACC-${tag}`,
        category_id: state.ids.categories,
        brand_id: state.ids.brands,
        supplier_id: state.ids.suppliers,
        initial_stock_qty: 10,
        cost_price: 200,
        selling_price: 499,
        color: 'Black'
      };
      const mobilePayload = {
        name: `QA Phone ${tag}`,
        sku_code: `QA-MOB-${tag}`,
        category_id: state.ids.categories,
        brand_id: state.ids.brands,
        supplier_id: state.ids.suppliers,
        phone_condition: 'new',
        initial_stock_qty: 2,
        cost_price: 15000,
        selling_price: 21000,
        imei_1: `35${tag}000000001`,
        imei_2: `35${tag}000000002`,
        color: 'Blue'
      };
      const acc = await request('POST', '/products', accessoryPayload);
      const mob = await request('POST', '/products', mobilePayload);
      state.ids.accessoryProduct = acc.data?.data?.id || (await one(conn, 'SELECT id FROM products WHERE sku_code=:sku AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1', { sku: accessoryPayload.sku_code }))?.id;
      state.ids.mobileProduct = mob.data?.data?.id || (await one(conn, 'SELECT id FROM products WHERE sku_code=:sku AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1', { sku: mobilePayload.sku_code }))?.id;
      const upd = await request('PUT', `/products/${state.ids.accessoryProduct}`, { selling_price: 549 });
      const accDb = await one(conn, 'SELECT current_stock_qty,selling_price FROM products WHERE id=:id', { id: state.ids.accessoryProduct });
      const stockHist = await one(conn, 'SELECT COUNT(*) AS c FROM stock_histories WHERE product_id=:id', { id: state.ids.accessoryProduct });
      record({
        endpoint: '/products',
        method: 'POST/GET/PUT',
        testData: JSON.stringify({ accessoryPayload, mobilePayload }),
        dbStatus: accDb ? `Stock=${accDb.current_stock_qty}, stock history rows=${stockHist.c}` : 'Product row missing',
        expected: 'Products created with initial stock and stock history; update persisted',
        actual: `Accessory POST ${acc.status} ${shortBody(acc)}, Mobile POST ${mob.status} ${shortBody(mob)}, PUT ${upd.status}`,
        pass: acc.status === 201 && mob.status === 201 && upd.status === 200 && Number(accDb?.current_stock_qty) === 10 && Number(stockHist?.c) > 0,
        issue: acc.status !== 201 && accDb ? 'Product API returns failure after inserting row; stock history is skipped because BaseService audit log throws before ProductService.addStock runs' : (Number(accDb?.current_stock_qty) !== 10 ? 'Initial product stock not stored correctly' : null),
        fix: 'Fix ActivityLogService circular import and wrap product create plus stock history in a transaction'
      });
    }
  });

  await test(conn, {
    endpoint: '/accessory-bills',
    method: 'POST/GET/PUT',
    run: async () => {
      const before = await one(conn, 'SELECT current_stock_qty FROM products WHERE id=:id', { id: state.ids.accessoryProduct });
      const payload = {
        customer_name: `QA Accessory Customer ${tag}`,
        phone: '9876543210',
        type: 'myself',
        cash_amount: 998,
        online_amount: 0,
        bill_status: 'final',
        items: [{ product_id: state.ids.accessoryProduct, qty: 2, unit_price: 499 }]
      };
      const create = await request('POST', '/accessory-bills', payload);
      const id = create.data?.data?.id;
      state.ids.accessoryBill = id;
      const after = await one(conn, 'SELECT current_stock_qty FROM products WHERE id=:id', { id: state.ids.accessoryProduct });
      const itemCount = await one(conn, 'SELECT COUNT(*) AS c FROM accessory_bill_items WHERE accessory_bill_id=:id AND deleted_at IS NULL', { id });
      const tx = await one(conn, 'SELECT amount FROM financial_transactions WHERE reference_type="accessory_bill" AND reference_id=:id AND deleted_at IS NULL', { id });
      const get = await request('GET', `/accessory-bills/${id}`);
      const update = await request('PUT', `/accessory-bills/${id}`, { ...payload, cash_amount: 549, items: [{ product_id: state.ids.accessoryProduct, qty: 1, unit_price: 549 }] });
      const updatedStock = await one(conn, 'SELECT current_stock_qty FROM products WHERE id=:id', { id: state.ids.accessoryProduct });
      record({
        endpoint: '/accessory-bills',
        method: 'POST/GET/PUT',
        testData: JSON.stringify(payload),
        dbStatus: `Items=${itemCount?.c}, finance=${tx?.amount}, stock ${before?.current_stock_qty}->${after?.current_stock_qty}->${updatedStock?.current_stock_qty}`,
        expected: 'Final bill creates item, income transaction, decrements stock; update reverses/reapplies stock',
        actual: `POST ${create.status}, GET ${get.status}, PUT ${update.status}`,
        pass: create.status === 201 && get.status === 200 && update.status === 200 && Number(after.current_stock_qty) === Number(before.current_stock_qty) - 2 && Number(updatedStock.current_stock_qty) === Number(before.current_stock_qty) - 1 && Number(itemCount.c) === 1 && money(tx?.amount) === 998,
        issue: Number(after?.current_stock_qty) !== Number(before?.current_stock_qty) - 2 ? 'Accessory bill did not deduct stock correctly' : null,
        fix: 'Review AccessoryBillService finalization stock and financial transaction block'
      });
    }
  });

  await test(conn, {
    endpoint: '/mobile-sales',
    method: 'POST/GET',
    run: async () => {
      const before = await one(conn, 'SELECT current_stock_qty FROM products WHERE id=:id', { id: state.ids.mobileProduct });
      const payload = {
        customer_name: `QA Mobile Customer ${tag}`,
        phone: '9123456789',
        type: 'retail',
        cash_amount: 21000,
        online_amount: 0,
        status: 'final',
        items: [{ product_id: state.ids.mobileProduct, qty: 1, unit_price: 21000, imei_1: `35${tag}000000101`, imei_2: `35${tag}000000102` }]
      };
      const create = await request('POST', '/mobile-sales', payload);
      const id = create.data?.data?.id;
      state.ids.mobileSale = id;
      const after = await one(conn, 'SELECT current_stock_qty FROM products WHERE id=:id', { id: state.ids.mobileProduct });
      const item = await one(conn, 'SELECT imei_1 FROM mobile_sale_items WHERE mobile_sale_id=:id AND deleted_at IS NULL', { id });
      const tx = await one(conn, 'SELECT amount FROM financial_transactions WHERE reference_type="mobile_sale" AND reference_id=:id AND deleted_at IS NULL', { id });
      const invalid = await request('POST', '/mobile-sales', { ...payload, items: [{ product_id: state.ids.mobileProduct, qty: 1, unit_price: 21000 }] });
      record({
        endpoint: '/mobile-sales',
        method: 'POST/GET',
        testData: JSON.stringify(payload),
        dbStatus: `Stock ${before?.current_stock_qty}->${after?.current_stock_qty}, item IMEI=${item?.imei_1}, finance=${tx?.amount}`,
        expected: 'Final sale persists item/IMEI, deducts stock, records income, rejects missing IMEI',
        actual: `POST ${create.status}, invalid missing IMEI ${invalid.status}`,
        pass: create.status === 201 && Number(after.current_stock_qty) === Number(before.current_stock_qty) - 1 && Boolean(item?.imei_1) && money(tx?.amount) === 21000 && invalid.status === 400,
        issue: invalid.status !== 400 ? 'Final mobile sale accepts item without IMEI' : null,
        fix: invalid.status !== 400 ? 'Keep IMEI validation mandatory for finalized mobile sale items' : null
      });
    }
  });

  await test(conn, {
    endpoint: '/service-bills, /suppliers/:id/ledger',
    method: 'POST/GET',
    run: async () => {
      const before = await one(conn, 'SELECT pending_amount FROM suppliers WHERE id=:id', { id: state.ids.suppliers });
      const payload = {
        customer_name: `QA Service Customer ${tag}`,
        phone: '9000011111',
        service_details: 'Display replacement',
        work_mode: 'outsourced',
        supplier_id: state.ids.suppliers,
        supplier_amount: 3000,
        total_amount: 5000,
        cash_amount: 5000,
        online_amount: 0,
        bill_status: 'final'
      };
      const create = await request('POST', '/service-bills', payload);
      const id = create.data?.data?.id;
      state.ids.serviceBill = id;
      const after = await one(conn, 'SELECT pending_amount FROM suppliers WHERE id=:id', { id: state.ids.suppliers });
      const ledger = await request('GET', `/suppliers/${state.ids.suppliers}/ledger`);
      record({
        endpoint: '/service-bills',
        method: 'POST/GET',
        testData: JSON.stringify(payload),
        dbStatus: `Supplier pending ${before?.pending_amount}->${after?.pending_amount}`,
        expected: 'Outsourced final service bill increases supplier pending and ledger is readable',
        actual: `POST ${create.status}, ledger GET ${ledger.status}`,
        pass: create.status === 201 && ledger.status === 200 && money(after.pending_amount) === money(before.pending_amount) + 3000,
        issue: money(after?.pending_amount) !== money(before?.pending_amount) + 3000 ? 'Supplier pending amount not increased by outsourced service bill' : null,
        fix: 'Review ServiceBillService supplierService.increasePending transaction path'
      });
    }
  });

  await test(conn, {
    endpoint: '/expenses, /expense-categories',
    method: 'POST/GET/PUT/DELETE',
    run: async () => {
      const catCreate = await request('POST', '/expense-categories', { name: `QA EXP ${tag}` });
      state.ids.expenseCategory = catCreate.data?.data?.id || (await one(conn, 'SELECT id FROM expense_categories WHERE name=:name AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1', { name: `QA EXP ${tag}` }))?.id;
      const payload = { amount: 1200, cash_amount: 1000, online_amount: 200, expense_type: 'general', expense_category_id: state.ids.expenseCategory, notes: `QA expense ${tag}` };
      const create = await request('POST', '/expenses', payload);
      const id = create.data?.data?.id;
      state.ids.expense = id;
      const txBefore = await one(conn, 'SELECT amount,cash_amount,online_amount FROM financial_transactions WHERE reference_type="expense" AND reference_id=:id AND deleted_at IS NULL', { id });
      const update = await request('PUT', `/expenses/${id}`, { amount: 1500, cash_amount: 1500, online_amount: 0 });
      const rowAfter = await one(conn, 'SELECT amount,cash_amount,online_amount FROM expenses WHERE id=:id AND deleted_at IS NULL', { id });
      const txAfter = await one(conn, 'SELECT amount,cash_amount,online_amount FROM financial_transactions WHERE reference_type="expense" AND reference_id=:id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1', { id });
      const getCat = await request('GET', `/expense-categories/${state.ids.expenseCategory}`);
      record({
        endpoint: '/expenses',
        method: 'POST/PUT',
        testData: JSON.stringify({ create: payload, update: { amount: 1500, cash_amount: 1500, online_amount: 0 } }),
        dbStatus: `Expense row amount=${rowAfter?.amount}; finance remained amount=${txAfter?.amount}`,
        expected: 'Expense update should keep expense table and financial transaction/balance consistent',
        actual: `POST ${create.status}, PUT ${update.status}, original finance=${txBefore?.amount}, latest finance=${txAfter?.amount}`,
        pass: create.status === 201 && update.status === 200 && money(rowAfter?.amount) === 1500 && money(txAfter?.amount) === 1500,
        issue: money(rowAfter?.amount) === 1500 && money(txAfter?.amount) !== 1500 ? 'Expense update changes expense row but does not reverse/recreate financial transaction, causing balance inconsistency' : null,
        fix: 'Override ExpenseService.update to reverse the previous financial transaction/supplier ledger, then apply the new amount in a single DB transaction'
      });
      record({
        endpoint: '/expense-categories',
        method: 'POST/GET',
        testData: JSON.stringify({ name: `QA EXP ${tag}` }),
        dbStatus: state.ids.expenseCategory ? 'Expense category row created and fetched' : 'No DB row',
        expected: 'Expense category create/get succeeds',
        actual: `POST ${catCreate.status} ${shortBody(catCreate)}, GET ${getCat.status}`,
        pass: catCreate.status === 201 && getCat.status === 200,
        issue: catCreate.status !== 201 && state.ids.expenseCategory ? 'Expense category API returns failure after inserting DB row' : null,
        fix: catCreate.status !== 201 ? 'Fix BaseService audit logging dependency and transaction handling' : null
      });
    }
  });

  await test(conn, {
    endpoint: '/exchanges',
    method: 'POST/GET/PUT',
    run: async () => {
      const form = new FormData();
      Object.entries({
        customer_name: `QA Exchange Customer ${tag}`,
        phone: '9111122222',
        device_details: 'Used iPhone 12 64GB',
        device_color: 'Black',
        imei_1: `35${tag}999999001`,
        exchange_value: '7000',
        notes: `QA exchange ${tag}`
      }).forEach(([k, v]) => form.append(k, v));
      const create = await request('POST', '/exchanges', form);
      const id = create.data?.data?.id;
      state.ids.exchange = id;
      const row = id ? await one(conn, 'SELECT exchange_value FROM exchanges WHERE id=:id AND deleted_at IS NULL', { id }) : null;
      const autoExpense = id ? await one(conn, 'SELECT amount FROM expenses WHERE expense_type="exchange" AND notes LIKE :id AND deleted_at IS NULL', { id: `%${id}%` }) : null;
      const update = id ? await request('PUT', `/exchanges/${id}`, (() => {
        const f = new FormData();
        f.append('exchange_value', '7500');
        f.append('notes', `QA exchange updated ${tag}`);
        return f;
      })()) : { status: 0 };
      const updatedExpense = id ? await one(conn, 'SELECT amount FROM expenses WHERE expense_type="exchange" AND notes LIKE :id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1', { id: `%${id}%` }) : null;
      record({
        endpoint: '/exchanges',
        method: 'POST/GET/PUT',
        testData: 'multipart form with customer/device/exchange_value=7000, then update to 7500',
        dbStatus: `Exchange=${row?.exchange_value}, autoExpense=${autoExpense?.amount}, updatedExpense=${updatedExpense?.amount}`,
        expected: 'Exchange creates row and matching auto expense; update keeps auto expense and balances in sync',
        actual: `POST ${create.status}, PUT ${update.status}`,
        pass: create.status === 201 && update.status === 200 && money(row?.exchange_value) === 7000 && money(autoExpense?.amount) === 7000 && money(updatedExpense?.amount) === 7500,
        issue: money(updatedExpense?.amount) !== 7500 ? 'Exchange update did not keep linked expense in sync with new exchange value' : null,
        fix: 'Fix ExchangeService.update/ExpenseService.update so linked exchange expense and financial balance are recalculated transactionally'
      });
    }
  });

  const readOnlyEndpoints = [
    ['GET', '/dashboard/summary?period=monthly'],
    ['GET', '/dashboard/charts?period=monthly'],
    ['GET', '/dashboard/profit-sheet?period=monthly'],
    ['GET', '/dashboard/daily-balance-sheet'],
    ['GET', '/reports/sales'],
    ['GET', '/reports/service'],
    ['GET', '/reports/expense'],
    ['GET', '/reports/exchange'],
    ['GET', '/reports/stock'],
    ['GET', '/reports/sales?export=excel'],
    ['GET', '/activity-logs']
  ];
  for (const [method, path] of readOnlyEndpoints) {
    await test(conn, {
      endpoint: path,
      method,
      run: async () => {
        const res = await request(method, path);
        record({
          endpoint: path,
          method,
          testData: 'Authenticated read request',
          dbStatus: 'Read-only API; query executed through backend',
          expected: 'HTTP 200 and valid response/body',
          actual: `HTTP ${res.status}, content=${res.headers['content-type'] || 'unknown'}`,
          pass: res.status === 200,
          issue: res.status !== 200 ? `Read endpoint failed: ${JSON.stringify(res.data).slice(0, 300)}` : null,
          fix: res.status !== 200 ? 'Review report/dashboard query joins, filters, and export generation' : null
        });
      }
    });
  }

  await test(conn, {
    endpoint: '/validations-and-edge-cases',
    method: 'POST',
    run: async () => {
      const missingCategory = await request('POST', '/categories', { description: 'missing name' });
      const negativeProduct = await request('POST', '/products', { name: `QA Negative Stock ${tag}`, initial_stock_qty: -5, cost_price: -1, selling_price: -2 });
      const invalidExchange = await request('POST', '/exchanges', (() => {
        const f = new FormData();
        f.append('exchange_value', 'not-a-number');
        return f;
      })());
      record({
        endpoint: '/categories, /products, /exchanges',
        method: 'POST',
        testData: 'Missing required category_name; negative product stock/prices; nonnumeric exchange value',
        dbStatus: 'Validation-only checks; product DB checked if accepted',
        expected: 'All invalid payloads rejected with HTTP 400',
        actual: `category ${missingCategory.status}, negative product ${negativeProduct.status}, exchange ${invalidExchange.status}`,
        pass: missingCategory.status === 400 && negativeProduct.status === 400 && invalidExchange.status === 400,
        issue: negativeProduct.status !== 400 ? 'Product creation accepts negative stock/prices because create validation only requires name' : null,
        fix: negativeProduct.status !== 400 ? 'Apply updateProductRules numeric min validation to createProductRules for stock, cost_price, selling_price, FK UUIDs and allowed status' : null
      });
    }
  });

  const deletes = [
    ['/accessory-bills', 'accessoryBill', 'accessory_bills'],
    ['/mobile-sales', 'mobileSale', 'mobile_sales'],
    ['/service-bills', 'serviceBill', 'service_bills'],
    ['/exchanges', 'exchange', 'exchanges'],
    ['/expenses', 'expense', 'expenses'],
    ['/expense-categories', 'expenseCategory', 'expense_categories'],
    ['/products', 'accessoryProduct', 'products'],
    ['/products', 'mobileProduct', 'products'],
    ['/categories', 'categories', 'categories'],
    ['/brands', 'brands', 'brands'],
    ['/suppliers', 'suppliers', 'suppliers']
  ];
  for (const [path, key, table] of deletes) {
    const id = state.ids[key];
    if (!id) continue;
    await test(conn, {
      endpoint: `${path}/${id}`,
      method: 'DELETE',
      run: async () => {
        const res = await request('DELETE', `${path}/${id}`);
        const row = await one(conn, `SELECT deleted_at FROM ${table} WHERE id=:id`, { id });
        record({
          endpoint: `${path}/${id}`,
          method: 'DELETE',
          testData: `id=${id}`,
          dbStatus: row?.deleted_at ? `Soft deleted at ${row.deleted_at}` : 'deleted_at not set',
          expected: 'HTTP 200 and DB soft delete timestamp set',
          actual: `HTTP ${res.status}`,
          pass: res.status === 200 && Boolean(row?.deleted_at),
          issue: res.status === 200 && !row?.deleted_at ? 'Delete API returned success but row was not soft-deleted' : null,
          fix: 'Ensure repository.delete uses paranoid destroy and service commits transaction'
        });
      }
    });
  }

  const pass = state.rows.filter(r => r.pass).length;
  const fail = state.rows.length - pass;
  console.log(JSON.stringify({
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    database: dbConfig.database,
    total: state.rows.length,
    pass,
    fail,
    rows: state.rows
  }, null, 2));

  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
