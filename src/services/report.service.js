const db = require('../utils/db.util');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class ReportService {
  parseFilters(query) {
    return {
      startDate: query.startDate,
      endDate: query.endDate,
      invoice: query.invoice
    };
  }

  async getSalesReport(query) {
    const { startDate, endDate, invoice } = query;
    let sf = '', sp = [];

    if (startDate && endDate) {
      sf = ' AND created_at >= ? AND created_at <= ?';
      sp = [startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z'];
    }

    // Fetch Mobile Sales
    const mobSales = await db.query(
      `SELECT ms.*, msi.*, c.category_name, b.brand_name
       FROM mobile_sales ms
       LEFT JOIN mobile_sale_items msi ON ms.id = msi.mobile_sale_id AND msi.deleted_at IS NULL
       LEFT JOIN categories c ON msi.category_id = c.id AND c.deleted_at IS NULL
       LEFT JOIN brands b ON msi.brand_id = b.id AND b.deleted_at IS NULL
       WHERE ms.status = 'final' AND ms.deleted_at IS NULL${sf}
       ORDER BY ms.created_at DESC`,
      sp
    );

    // Fetch Accessory Bills
    const accSales = await db.query(
      `SELECT ab.*, abi.*, c.category_name, b.brand_name
       FROM accessory_bills ab
       LEFT JOIN accessory_bill_items abi ON ab.id = abi.accessory_bill_id AND abi.deleted_at IS NULL
       LEFT JOIN categories c ON abi.category_id = c.id AND c.deleted_at IS NULL
       LEFT JOIN brands b ON abi.brand_id = b.id AND b.deleted_at IS NULL
       WHERE ab.bill_status = 'final' AND ab.deleted_at IS NULL${sf}
       ORDER BY ab.created_at DESC`,
      sp
    );

    const flatSales = [];

    const mobMap = {};
    mobSales.forEach(row => {
      if (!mobMap[row.id]) {
        mobMap[row.id] = { ...row, items: [] };
      }
      if (row.product_name) {
        flatSales.push({
          date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
          invoice_no: row.invoice_no,
          customer: row.customer_name || 'N/A',
          type: 'Mobile Sale',
          product: row.product_name || 'Phone',
          category: row.category_name || 'N/A',
          brand: row.brand_name || 'N/A',
          qty: row.qty || 1,
          price: parseFloat(row.unit_price || 0),
          total: parseFloat(row.total || 0)
        });
      }
    });

    const accMap = {};
    accSales.forEach(row => {
      if (!accMap[row.id]) {
        accMap[row.id] = { ...row, items: [] };
      }
      if (row.product_name) {
        flatSales.push({
          date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
          invoice_no: row.invoice_no,
          customer: row.customer_name || 'N/A',
          type: 'Accessory Bill',
          product: row.product_name || 'Accessory',
          category: row.category_name || 'N/A',
          brand: row.brand_name || 'N/A',
          qty: row.qty || 1,
          price: parseFloat(row.unit_price || 0),
          total: parseFloat(row.total || 0)
        });
      }
    });

    let filteredSales = flatSales;
    if (query.brand) {
      filteredSales = filteredSales.filter(s => s.brand.toLowerCase().includes(query.brand.toLowerCase()));
    }
    if (query.category) {
      filteredSales = filteredSales.filter(s => s.category.toLowerCase().includes(query.category.toLowerCase()));
    }

    return filteredSales;
  }

  async getServiceReport(query) {
    const { startDate, endDate, supplier } = query;
    let sf = '', sp = [];

    if (startDate && endDate) {
      sf = ' AND created_at >= ? AND created_at <= ?';
      sp = [startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z'];
    }

    let supplierId = null;
    if (supplier) {
      const sup = await db.findOne('suppliers', { name: { like: `%${supplier}%` } });
      if (sup) supplierId = sup.id;
    }

    let supWhere = '';
    let supParams = [];
    if (supplierId) {
      supWhere = ' AND supplier_id = ?';
      supParams = [supplierId];
    }

    const bills = await db.query(
      `SELECT sb.*, s.name as supplier_name
       FROM service_bills sb
       LEFT JOIN suppliers s ON sb.supplier_id = s.id AND s.deleted_at IS NULL
       WHERE sb.bill_status = 'final' AND sb.deleted_at IS NULL${sf}${supWhere}
       ORDER BY sb.created_at DESC`,
      [...sp, ...supParams]
    );

    return bills.map(bill => ({
      date: bill.created_at ? new Date(bill.created_at).toISOString().split('T')[0] : '',
      invoice_no: bill.invoice_no,
      customer: bill.customer_name || 'N/A',
      work_mode: bill.work_mode,
      supplier: bill.supplier_name || (bill.work_mode === 'self' ? 'In-house' : 'N/A'),
      supplier_charge: parseFloat(bill.supplier_amount),
      total_amount: parseFloat(bill.total_amount),
      collected_cash: parseFloat(bill.cash_amount),
      collected_online: parseFloat(bill.online_amount)
    }));
  }

  async getExpenseReport(query) {
    const { startDate, endDate, supplier } = query;
    let ef = '', ep = [];

    if (startDate && endDate) {
      ef = ' AND e.date >= ? AND e.date <= ?';
      ep = [startDate, endDate];
    }

    let supplierId = null;
    if (supplier) {
      const sup = await db.findOne('suppliers', { name: { like: `%${supplier}%` } });
      if (sup) supplierId = sup.id;
    }

    let supWhere = '';
    let supParams = [];
    if (supplierId) {
      supWhere = ' AND e.supplier_id = ?';
      supParams = [supplierId];
    }

    const expenses = await db.query(
      `SELECT e.*, ec.name as category_name, s.name as supplier_name
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.expense_category_id = ec.id AND ec.deleted_at IS NULL
       LEFT JOIN suppliers s ON e.supplier_id = s.id AND s.deleted_at IS NULL
       WHERE e.deleted_at IS NULL${ef}${supWhere}
       ORDER BY e.date DESC`,
      [...ep, ...supParams]
    );

    return expenses.map(exp => ({
      date: exp.date,
      category: exp.category_name || 'N/A',
      supplier: exp.supplier_name || 'N/A',
      expense_type: exp.expense_type,
      amount: parseFloat(exp.amount),
      cash_amount: parseFloat(exp.cash_amount),
      online_amount: parseFloat(exp.online_amount),
      notes: exp.notes || ''
    }));
  }

  async getExchangeReport(query) {
    const { startDate, endDate } = query;
    let sf = '', sp = [];

    if (startDate && endDate) {
      sf = ' WHERE created_at >= ? AND created_at <= ? AND deleted_at IS NULL';
      sp = [startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z'];
    } else {
      sf = ' WHERE deleted_at IS NULL';
    }

    const exchanges = await db.query(
      `SELECT * FROM exchanges${sf} ORDER BY created_at DESC`,
      sp
    );

    return exchanges.map(ex => ({
      date: ex.created_at ? new Date(ex.created_at).toISOString().split('T')[0] : '',
      customer: ex.customer_name || 'N/A',
      phone: ex.phone || 'N/A',
      device: ex.device_details || 'N/A',
      color: ex.device_color || 'N/A',
      imei: ex.imei_1 || 'N/A',
      exchange_value: parseFloat(ex.exchange_value)
    }));
  }

  async getStockReport(query) {
    let where = [];
    let params = [];

    if (query.status) {
      where.push('p.status = ?');
      params.push(query.status);
    }
    if (query.category_id) {
      where.push('p.category_id = ?');
      params.push(query.category_id);
    }
    if (query.brand_id) {
      where.push('p.brand_id = ?');
      params.push(query.brand_id);
    }

    const whereClause = where.length > 0 ? 'AND ' + where.join(' AND ') : '';

    const products = await db.query(
      `SELECT p.*, c.category_name, b.brand_name, s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id AND c.deleted_at IS NULL
       LEFT JOIN brands b ON p.brand_id = b.id AND b.deleted_at IS NULL
       LEFT JOIN suppliers s ON p.supplier_id = s.id AND s.deleted_at IS NULL
       WHERE p.deleted_at IS NULL ${whereClause}
       ORDER BY p.current_stock_qty ASC`,
      params
    );

    return products.map(prod => ({
      sku: prod.sku_code || 'N/A',
      name: prod.name,
      category: prod.category_name || 'N/A',
      brand: prod.brand_name || 'N/A',
      supplier: prod.supplier_name || 'N/A',
      condition: prod.phone_condition || 'N/A',
      cost: parseFloat(prod.cost_price),
      price: parseFloat(prod.selling_price),
      current_stock: prod.current_stock_qty,
      status: prod.status
    }));
  }

  async exportToExcel(reportName, headers, data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportName);

    worksheet.columns = headers.map(header => ({
      header: header.label,
      key: header.key,
      width: header.width || 15
    }));

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };

    worksheet.addRows(data);
    return await workbook.xlsx.writeBuffer();
  }

  exportToPdf(reportName, headers, data) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fontSize(18).text(reportName, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown();

      const tableTop = 130;
      let y = tableTop;

      doc.fontSize(10).font('Helvetica-Bold');
      let x = 30;
      headers.forEach(header => {
        doc.text(header.label, x, y, { width: header.width * 6, truncate: true });
        x += header.width * 6;
      });

      doc.moveDown();
      y += 20;
      doc.font('Helvetica').fontSize(9);

      data.forEach(row => {
        if (y > 750) { doc.addPage(); y = 50; }
        x = 30;
        headers.forEach(header => {
          const val = row[header.key] !== undefined ? String(row[header.key]) : '';
          doc.text(val, x, y, { width: header.width * 6, truncate: true });
          x += header.width * 6;
        });
        y += 18;
      });

      doc.end();
    });
  }

  buildRangePresets() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const seven = new Date(today);
    seven.setDate(seven.getDate() - 6);
    const thirty = new Date(today);
    thirty.setDate(thirty.getDate() - 29);

    const toLocalIsoDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return [
      { key: 'today', label: 'Today', from: toLocalIsoDate(today), to: toLocalIsoDate(today) },
      { key: '7d', label: 'Last 7 days', from: toLocalIsoDate(seven), to: toLocalIsoDate(today) },
      { key: '30d', label: 'Last 30 days', from: toLocalIsoDate(thirty), to: toLocalIsoDate(today) },
      { key: 'all', label: 'All time', from: '2000-01-01', to: toLocalIsoDate(today) }
    ];
  }

  async getOverallReportDataForRange(startDate, endDate) {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    // Sales Metrics
    const mobSalesRows = await db.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total FROM mobile_sales 
       WHERE status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const mobSalesTotal = parseFloat(mobSalesRows[0]?.total || 0);

    const accSalesRows = await db.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total FROM accessory_bills 
       WHERE bill_status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const accSalesTotal = parseFloat(accSalesRows[0]?.total || 0);
    const totalSales = mobSalesTotal + accSalesTotal;

    const mobSalesCountRows = await db.query(
      `SELECT COALESCE(SUM(msi.qty), 0) as total FROM mobile_sale_items msi
       LEFT JOIN mobile_sales ms ON msi.mobile_sale_id = ms.id
       WHERE ms.status = 'final' AND ms.deleted_at IS NULL AND msi.deleted_at IS NULL AND ms.created_at >= ? AND ms.created_at <= ?`,
      [start, end]
    );
    const mobSalesCount = parseInt(mobSalesCountRows[0]?.total || 0, 10);

    const accSalesCountRows = await db.query(
      `SELECT COALESCE(SUM(abi.qty), 0) as total FROM accessory_bill_items abi
       LEFT JOIN accessory_bills ab ON abi.accessory_bill_id = ab.id
       WHERE ab.bill_status = 'final' AND ab.deleted_at IS NULL AND abi.deleted_at IS NULL AND ab.created_at >= ? AND ab.created_at <= ?`,
      [start, end]
    );
    const accSalesCount = parseInt(accSalesCountRows[0]?.total || 0, 10);
    const soldUnits = mobSalesCount + accSalesCount;

    const mobCashRows = await db.query(
      `SELECT COALESCE(SUM(cash_amount), 0) as total FROM mobile_sales 
       WHERE status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const accCashRows = await db.query(
      `SELECT COALESCE(SUM(cash_amount), 0) as total FROM accessory_bills 
       WHERE bill_status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const salesCash = parseFloat(mobCashRows[0]?.total || 0) + parseFloat(accCashRows[0]?.total || 0);

    const mobOnlineRows = await db.query(
      `SELECT COALESCE(SUM(online_amount), 0) as total FROM mobile_sales 
       WHERE status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const mobEmiRows = await db.query(
      `SELECT COALESCE(SUM(emi_amount), 0) as total FROM mobile_sales 
       WHERE status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const accOnlineRows = await db.query(
      `SELECT COALESCE(SUM(online_amount), 0) as total FROM accessory_bills 
       WHERE bill_status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const accEmiRows = await db.query(
      `SELECT COALESCE(SUM(emi_amount), 0) as total FROM accessory_bills 
       WHERE bill_status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );

    const mobSalesOnline = parseFloat(mobOnlineRows[0]?.total || 0);
    const mobSalesEmi = parseFloat(mobEmiRows[0]?.total || 0);
    const accSalesOnline = parseFloat(accOnlineRows[0]?.total || 0);
    const accSalesEmi = parseFloat(accEmiRows[0]?.total || 0);
    const salesOnline = mobSalesOnline + mobSalesEmi + accSalesOnline + accSalesEmi;

    // Service Metrics
    const srvRows = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM service_bills 
       WHERE bill_status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const serviceTotal = parseFloat(srvRows[0]?.total || 0);

    const srvCountRows = await db.query(
      `SELECT COUNT(*) as count FROM service_bills 
       WHERE bill_status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const serviceLines = parseInt(srvCountRows[0]?.count || 0, 10);

    const srvCashRows = await db.query(
      `SELECT COALESCE(SUM(cash_amount), 0) as total FROM service_bills 
       WHERE bill_status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const srvOnlineRows = await db.query(
      `SELECT COALESCE(SUM(online_amount), 0) as total FROM service_bills 
       WHERE bill_status = 'final' AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const serviceCash = parseFloat(srvCashRows[0]?.total || 0);
    const serviceOnline = parseFloat(srvOnlineRows[0]?.total || 0);

    // Expense Metrics
    const expRows = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
       WHERE deleted_at IS NULL AND date >= ? AND date <= ?`,
      [startDate, endDate]
    );
    const totalExpense = parseFloat(expRows[0]?.total || 0);

    const expCountRows = await db.query(
      `SELECT COUNT(*) as count FROM expenses 
       WHERE deleted_at IS NULL AND date >= ? AND date <= ?`,
      [startDate, endDate]
    );
    const paymentsCount = parseInt(expCountRows[0]?.count || 0, 10);

    const expCashRows = await db.query(
      `SELECT COALESCE(SUM(cash_amount), 0) as total FROM expenses 
       WHERE deleted_at IS NULL AND date >= ? AND date <= ?`,
      [startDate, endDate]
    );
    const expOnlineRows = await db.query(
      `SELECT COALESCE(SUM(online_amount), 0) as total FROM expenses 
       WHERE deleted_at IS NULL AND date >= ? AND date <= ?`,
      [startDate, endDate]
    );
    const expenseCash = parseFloat(expCashRows[0]?.total || 0);
    const expenseOnline = parseFloat(expOnlineRows[0]?.total || 0);

    return {
      sales: { totalSales, soldUnits, cashIn: salesCash, onlineIn: salesOnline },
      service: { totalService: serviceTotal, serviceLines, cashIn: serviceCash, onlineIn: serviceOnline },
      expense: { totalExpense, paymentsCount, cashOut: expenseCash, onlineOut: expenseOnline }
    };
  }

  async getOverallReport(query) {
    const { startDate, endDate } = query;
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate query parameters are required');
    }

    const mainMetrics = await this.getOverallReportDataForRange(startDate, endDate);

    const presets = this.buildRangePresets();
    const presetRows = [];
    for (const p of presets) {
      const metrics = await this.getOverallReportDataForRange(p.from, p.to);
      const totalExpenses = metrics.expense.totalExpense;
      const totalProfit = metrics.sales.totalSales + metrics.service.totalService - totalExpenses;
      presetRows.push({
        key: p.key,
        label: p.label,
        sales: metrics.sales.totalSales,
        service: metrics.service.totalService,
        expenses: totalExpenses,
        totalProfit
      });
    }

    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    // Get all categories
    const allCategories = await db.query('SELECT id, category_name FROM categories WHERE deleted_at IS NULL');
    const categoryNameById = {};
    allCategories.forEach(c => { categoryNameById[c.id] = c.category_name; });

    // Stock qty by category
    const products = await db.query('SELECT category_id, current_stock_qty FROM products WHERE deleted_at IS NULL');
    const stockQtyByCategory = {};
    products.forEach(p => {
      const catId = p.category_id || 'unknown';
      stockQtyByCategory[catId] = (stockQtyByCategory[catId] || 0) + parseInt(p.current_stock_qty || 0, 10);
    });

    // Mobile Sale Items grouped by category
    const mobItems = await db.query(
      `SELECT msi.category_id, COALESCE(SUM(msi.qty), 0) as sold_qty, COALESCE(SUM(msi.total), 0) as sales_amount
       FROM mobile_sale_items msi
       LEFT JOIN mobile_sales ms ON msi.mobile_sale_id = ms.id
       WHERE ms.status = 'final' AND msi.deleted_at IS NULL AND ms.deleted_at IS NULL
       AND ms.created_at >= ? AND ms.created_at <= ?
       GROUP BY msi.category_id`,
      [start, end]
    );

    // Accessory Bill Items grouped by category
    const accItems = await db.query(
      `SELECT abi.category_id, COALESCE(SUM(abi.qty), 0) as sold_qty, COALESCE(SUM(abi.total), 0) as sales_amount
       FROM accessory_bill_items abi
       LEFT JOIN accessory_bills ab ON abi.accessory_bill_id = ab.id
       WHERE ab.bill_status = 'final' AND abi.deleted_at IS NULL AND ab.deleted_at IS NULL
       AND ab.created_at >= ? AND ab.created_at <= ?
       GROUP BY abi.category_id`,
      [start, end]
    );

    const soldByCategory = {};
    const salesByCategory = {};

    const mergeItems = (items) => {
      items.forEach(item => {
        const catId = item.category_id || 'unknown';
        const qty = parseInt(item.sold_qty || 0, 10);
        const amount = parseFloat(item.sales_amount || 0);
        soldByCategory[catId] = (soldByCategory[catId] || 0) + qty;
        salesByCategory[catId] = (salesByCategory[catId] || 0) + amount;
      });
    };
    mergeItems(mobItems);
    mergeItems(accItems);

    const allCategoryIds = new Set([
      ...Object.keys(stockQtyByCategory),
      ...Object.keys(soldByCategory),
      ...Object.keys(salesByCategory)
    ]);

    const categoryWiseRows = [...allCategoryIds]
      .map(catId => ({
        categoryId: catId,
        categoryName: categoryNameById[catId] || (catId === 'unknown' ? 'Unknown' : catId),
        soldQty: soldByCategory[catId] || 0,
        salesAmount: salesByCategory[catId] || 0,
        stockQty: stockQtyByCategory[catId] || 0
      }))
      .sort((a, b) => b.soldQty - a.soldQty || b.salesAmount - a.salesAmount);

    return { ...mainMetrics, presetRows, categoryWiseRows };
  }

  async getCategoryReport(categoryId, query) {
    const { startDate, endDate } = query;
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate query parameters are required');
    }

    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    // Category Name
    let categoryName = 'Category';
    if (categoryId !== 'unknown') {
      const catRows = await db.query('SELECT category_name FROM categories WHERE id = ? AND deleted_at IS NULL', [categoryId]);
      if (catRows.length > 0) categoryName = catRows[0].category_name;
    } else {
      categoryName = 'Unknown';
    }

    // Current Stock Qty for this category
    const stockProducts = await db.query(
      `SELECT COALESCE(SUM(current_stock_qty), 0) as total FROM products 
       WHERE ${categoryId === 'unknown' ? 'category_id IS NULL' : 'category_id = ?'} AND deleted_at IS NULL`,
      categoryId === 'unknown' ? [] : [categoryId]
    );
    const totalStockQty = parseInt(stockProducts[0]?.total || 0, 10);

    // Mobile Sale Items for this category
    const mobItems = await db.query(
      `SELECT msi.product_id, COALESCE(SUM(msi.qty), 0) as sold_qty, COALESCE(SUM(msi.total), 0) as sales_amount
       FROM mobile_sale_items msi
       LEFT JOIN mobile_sales ms ON msi.mobile_sale_id = ms.id
       WHERE ${categoryId === 'unknown' ? 'msi.category_id IS NULL' : 'msi.category_id = ?'}
       AND ms.status = 'final' AND msi.deleted_at IS NULL AND ms.deleted_at IS NULL
       AND ms.created_at >= ? AND ms.created_at <= ?
       GROUP BY msi.product_id`,
      categoryId === 'unknown' ? [start, end] : [categoryId, start, end]
    );

    // Accessory Bill Items for this category
    const accItems = await db.query(
      `SELECT abi.product_id, COALESCE(SUM(abi.qty), 0) as sold_qty, COALESCE(SUM(abi.total), 0) as sales_amount
       FROM accessory_bill_items abi
       LEFT JOIN accessory_bills ab ON abi.accessory_bill_id = ab.id
       WHERE ${categoryId === 'unknown' ? 'abi.category_id IS NULL' : 'abi.category_id = ?'}
       AND ab.bill_status = 'final' AND abi.deleted_at IS NULL AND ab.deleted_at IS NULL
       AND ab.created_at >= ? AND ab.created_at <= ?
       GROUP BY abi.product_id`,
      categoryId === 'unknown' ? [start, end] : [categoryId, start, end]
    );

    const soldByProduct = {};
    const salesByProduct = {};
    const productIds = new Set();

    const mergeProducts = (items) => {
      items.forEach(item => {
        if (item.product_id) {
          productIds.add(item.product_id);
          const qty = parseInt(item.sold_qty || 0, 10);
          const amount = parseFloat(item.sales_amount || 0);
          soldByProduct[item.product_id] = (soldByProduct[item.product_id] || 0) + qty;
          salesByProduct[item.product_id] = (salesByProduct[item.product_id] || 0) + amount;
        }
      });
    };
    mergeProducts(mobItems);
    mergeProducts(accItems);

    const products = await db.query(
      `SELECT id, name, sku_code FROM products WHERE id IN (?) AND deleted_at IS NULL`,
      [[...productIds]]
    );

    const productById = {};
    products.forEach(p => { productById[p.id] = p; });

    const rows = [...productIds]
      .map(pid => {
        const p = productById[pid];
        return {
          productId: pid,
          productName: p ? p.name : '—',
          sku: p ? (p.sku_code || '') : '',
          soldQty: soldByProduct[pid] || 0,
          salesAmount: salesByProduct[pid] || 0
        };
      })
      .sort((a, b) => b.soldQty - a.soldQty || b.salesAmount - a.salesAmount);

    const totalSoldQty = rows.reduce((sum, r) => sum + r.soldQty, 0);
    const totalSales = rows.reduce((sum, r) => sum + r.salesAmount, 0);

    return { categoryName, totalSoldQty, totalSales, totalStockQty, rows };
  }
}

module.exports = new ReportService();