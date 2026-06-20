const db = require('../utils/db.util');
const financialService = require('./financial.service');

class DashboardService {
  getDateRangeClause(period, startDate, endDate, dateField = 'created_at') {
    if (period === 'custom' && startDate && endDate) {
      let start = startDate;
      let end = endDate;
      if (dateField === 'created_at') {
        if (startDate.length === 10) start = startDate + 'T00:00:00.000Z';
        if (endDate.length === 10) end = endDate + 'T23:59:59.999Z';
      }
      return { field: dateField, start, end };
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    switch (period) {
      case 'today': break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'weekly': start.setDate(start.getDate() - 7); break;
      case 'monthly': start.setDate(start.getDate() - 30); break;
      case 'yearly': start.setDate(start.getDate() - 365); break;
      default: return null;
    }

    return {
      field: dateField,
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  async getSummary({ period, startDate, endDate }) {
    const balances = await financialService.getOverallBalance();
    const dateFilter = this.getDateRangeClause(period, startDate, endDate, 'created_at');

    return await db.transaction(async (tx) => {
      let query = tx.query;

      // Get accessory sales total
      let sqlWhere = '';
      let sqlParams = [];
      if (dateFilter) {
        sqlWhere = `AND created_at >= ? AND created_at <= ?`;
        sqlParams = [dateFilter.start, dateFilter.end];
      }

      const accRows = await query(
        `SELECT COALESCE(SUM(grand_total), 0) as total FROM accessory_bills WHERE bill_status = 'final' AND deleted_at IS NULL ${sqlWhere}`,
        sqlParams
      );

      const mobRows = await query(
        `SELECT COALESCE(SUM(grand_total), 0) as total FROM mobile_sales WHERE status = 'final' AND deleted_at IS NULL ${sqlWhere}`,
        sqlParams
      );

      const srvRows = await query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM service_bills WHERE bill_status = 'final' AND deleted_at IS NULL ${sqlWhere}`,
        sqlParams
      );

      let expSqlWhere = '';
      let expSqlParams = [];
      if (dateFilter) {
        expSqlWhere = `AND date >= ? AND date <= ?`;
        expSqlParams = [dateFilter.start, dateFilter.end];
      }

      const expRows = await query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE deleted_at IS NULL ${expSqlWhere}`,
        expSqlParams
      );

      return {
        cash_balance: balances.cash_balance,
        online_balance: balances.online_balance,
        open_balance: balances.open_balance,
        total_balance: balances.total_balance,
        accessory_sales_total: parseFloat(accRows[0]?.total || 0),
        mobile_sales_total: parseFloat(mobRows[0]?.total || 0),
        service_total: parseFloat(srvRows[0]?.total || 0),
        expense_total: parseFloat(expRows[0]?.total || 0)
      };
    });
  }

  async getCharts({ period, startDate, endDate }) {
    const dateFilter = this.getDateRangeClause(period, startDate, endDate, 'created_at');
    let sqlWhere = '';
    let sqlParams = [];
    if (dateFilter) {
      sqlWhere = 'AND ms.created_at >= ? AND ms.created_at <= ?';
      sqlParams = [dateFilter.start, dateFilter.end];
    }

    // 1. Revenue by Category (Accessory + Mobile)
    const accCatRev = await db.query(
      `SELECT c.category_name, COALESCE(SUM(abi.total), 0) as revenue
       FROM accessory_bill_items abi
       LEFT JOIN categories c ON abi.category_id = c.id AND c.deleted_at IS NULL
       LEFT JOIN accessory_bills ab ON abi.accessory_bill_id = ab.id AND ab.deleted_at IS NULL
       WHERE abi.deleted_at IS NULL AND ab.bill_status = 'final' ${sqlWhere.replace(/ms\./g, 'ab.')}
       GROUP BY c.category_name`,
      sqlParams
    );

    const mobCatRev = await db.query(
      `SELECT c.category_name, COALESCE(SUM(msi.total), 0) as revenue
       FROM mobile_sale_items msi
       LEFT JOIN categories c ON msi.category_id = c.id AND c.deleted_at IS NULL
       LEFT JOIN mobile_sales ms ON msi.mobile_sale_id = ms.id AND ms.deleted_at IS NULL
       WHERE msi.deleted_at IS NULL AND ms.status = 'final' ${sqlWhere}
       GROUP BY c.category_name`,
      sqlParams
    );

    const categoryRevMap = {};
    [...accCatRev, ...mobCatRev].forEach(item => {
      const name = item.category_name || 'Uncategorized';
      const rev = parseFloat(item.revenue || 0);
      categoryRevMap[name] = (categoryRevMap[name] || 0) + rev;
    });

    const revenueByCategory = Object.keys(categoryRevMap).map(key => ({
      category: key,
      revenue: categoryRevMap[key]
    }));

    // 2. Revenue by Brand
    const accBrandRev = await db.query(
      `SELECT b.brand_name, COALESCE(SUM(abi.total), 0) as revenue
       FROM accessory_bill_items abi
       LEFT JOIN brands b ON abi.brand_id = b.id AND b.deleted_at IS NULL
       LEFT JOIN accessory_bills ab ON abi.accessory_bill_id = ab.id AND ab.deleted_at IS NULL
       WHERE abi.deleted_at IS NULL AND ab.bill_status = 'final' ${sqlWhere.replace(/ms\./g, 'ab.')}
       GROUP BY b.brand_name`,
      sqlParams
    );

    const mobBrandRev = await db.query(
      `SELECT b.brand_name, COALESCE(SUM(msi.total), 0) as revenue
       FROM mobile_sale_items msi
       LEFT JOIN brands b ON msi.brand_id = b.id AND b.deleted_at IS NULL
       LEFT JOIN mobile_sales ms ON msi.mobile_sale_id = ms.id AND ms.deleted_at IS NULL
       WHERE msi.deleted_at IS NULL AND ms.status = 'final' ${sqlWhere}
       GROUP BY b.brand_name`,
      sqlParams
    );

    const brandRevMap = {};
    [...accBrandRev, ...mobBrandRev].forEach(item => {
      const name = item.brand_name || 'Unbranded';
      const rev = parseFloat(item.revenue || 0);
      brandRevMap[name] = (brandRevMap[name] || 0) + rev;
    });

    const revenueByBrand = Object.keys(brandRevMap).map(key => ({
      brand: key,
      revenue: brandRevMap[key]
    }));

    // 3. Daily Revenue
    let dailySqlAcc = `SELECT DATE(created_at) as date, COALESCE(SUM(grand_total), 0) as revenue
                       FROM accessory_bills WHERE bill_status = 'final' AND deleted_at IS NULL`;
    let dailySqlMob = `SELECT DATE(created_at) as date, COALESCE(SUM(grand_total), 0) as revenue
                       FROM mobile_sales WHERE status = 'final' AND deleted_at IS NULL`;
    let dailySqlSrv = `SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as revenue
                       FROM service_bills WHERE bill_status = 'final' AND deleted_at IS NULL`;
    let dailyParams = [];

    if (dateFilter) {
      const w = ' AND created_at >= ? AND created_at <= ?';
      dailySqlAcc += w;
      dailySqlMob += w;
      dailySqlSrv += w;
      dailyParams = [dateFilter.start, dateFilter.end];
    }

    dailySqlAcc += ' GROUP BY DATE(created_at)';
    dailySqlMob += ' GROUP BY DATE(created_at)';
    dailySqlSrv += ' GROUP BY DATE(created_at)';

    const dailyAcc = await db.query(dailySqlAcc, dailyParams);
    const dailyMob = await db.query(dailySqlMob, dailyParams);
    const dailySrv = await db.query(dailySqlSrv, dailyParams);

    const dailyRevMap = {};
    [...dailyAcc, ...dailyMob, ...dailySrv].forEach(item => {
      const date = item.date;
      const rev = parseFloat(item.revenue || 0);
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date).split('T')[0];
      dailyRevMap[dateStr] = (dailyRevMap[dateStr] || 0) + rev;
    });

    const dailyRevenue = Object.keys(dailyRevMap)
      .map(key => ({ date: key, revenue: dailyRevMap[key] }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return { revenueByCategory, revenueByBrand, dailyRevenue };
  }

  async getProfitSheet({ period, startDate, endDate }) {
    const dateFilter = this.getDateRangeClause(period, startDate, endDate, 'created_at');
    const expFilter = this.getDateRangeClause(period, startDate, endDate, 'date');

      let sf = '', sp = [], sf2 = '', sp2 = [], sf3 = '', sp3 = [], ef = '', ep = [];
    if (dateFilter) { sf = ' AND created_at >= ? AND created_at <= ?'; sp = [dateFilter.start, dateFilter.end]; }
    if (dateFilter) { sf2 = ' AND ms.created_at >= ? AND ms.created_at <= ?'; sp2 = [dateFilter.start, dateFilter.end]; }
    if (dateFilter) { sf3 = ' AND ab.created_at >= ? AND ab.created_at <= ?'; sp3 = [dateFilter.start, dateFilter.end]; }
    if (expFilter) { ef = ' AND date >= ? AND date <= ?'; ep = [expFilter.start, expFilter.end]; }

    // Mobile Sales Revenue
    const mobRows = await db.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total FROM mobile_sales WHERE status = 'final' AND deleted_at IS NULL${sf}`,
      sp
    );
    const mobRev = parseFloat(mobRows[0]?.total || 0);

    // Accessories Sales Revenue
    const accRows = await db.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total FROM accessory_bills WHERE bill_status = 'final' AND deleted_at IS NULL${sf}`,
      sp
    );
    const accRev = parseFloat(accRows[0]?.total || 0);

    // Service Revenue
    const srvRows = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM service_bills WHERE bill_status = 'final' AND deleted_at IS NULL${sf}`,
      sp
    );
    const srvRev = parseFloat(srvRows[0]?.total || 0);

    // Cost calculations
    const mobItems = await db.query(
      `SELECT msi.product_id, msi.qty FROM mobile_sale_items msi
       LEFT JOIN mobile_sales ms ON msi.mobile_sale_id = ms.id
       WHERE ms.status = 'final' AND msi.deleted_at IS NULL AND ms.deleted_at IS NULL${sf2}`,
      sp2
    );

    const accItems = await db.query(
      `SELECT abi.product_id, abi.qty FROM accessory_bill_items abi
       LEFT JOIN accessory_bills ab ON abi.accessory_bill_id = ab.id
       WHERE ab.bill_status = 'final' AND abi.deleted_at IS NULL AND ab.deleted_at IS NULL${sf3}`,
      sp3
    );

    let totalProductCost = 0;
    const computeCost = async (items) => {
      for (const item of items) {
        if (item.product_id) {
          const prod = await db.findById('products', item.product_id);
          if (prod) {
            totalProductCost += parseFloat(prod.cost_price) * parseInt(item.qty, 10);
          }
        }
      }
    };
    await computeCost(mobItems);
    await computeCost(accItems);

    // Outsourced service supplier charges
    const outsourceRows = await db.query(
      `SELECT COALESCE(SUM(supplier_amount), 0) as total FROM service_bills 
       WHERE bill_status = 'final' AND work_mode = 'outsourced' AND deleted_at IS NULL${sf}`,
      sp
    );
    const outsourcedCost = parseFloat(outsourceRows[0]?.total || 0);

    // General Expenses
    const expRows = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE deleted_at IS NULL${ef}`,
      ep
    );
    const generalExpenses = parseFloat(expRows[0]?.total || 0);

    const totalRevenue = mobRev + accRev + srvRev;
    const totalOutflow = totalProductCost + outsourcedCost + generalExpenses;
    const netProfit = totalRevenue - totalOutflow;

    return {
      revenue: {
        mobile_sales: mobRev,
        accessories_sales: accRev,
        services: srvRev,
        total_revenue: totalRevenue
      },
      expenses: {
        inventory_sold_cost: totalProductCost,
        outsourced_service_cost: outsourcedCost,
        operating_expenses: generalExpenses,
        total_expenses: totalOutflow
      },
      net_profit: netProfit
    };
  }

  async getDailyBalanceSheet({ period, startDate, endDate }) {
    const dateFilter = this.getDateRangeClause(period, startDate, endDate, 'created_at');
    let sql = 'SELECT * FROM balance_histories WHERE deleted_at IS NULL';
    let params = [];
    if (dateFilter) {
      sql += ' AND created_at >= ? AND created_at <= ?';
      params = [dateFilter.start, dateFilter.end];
    }
    sql += ' ORDER BY date DESC';
    return await db.query(sql, params);
  }

  async getDetailedBalanceSheet({ period, startDate, endDate }) {
    const dateFilter = this.getDateRangeClause(period, startDate, endDate, 'created_at');
      let sf = '', sp = [];
    if (dateFilter) { sf = ' AND ms.created_at >= ? AND ms.created_at <= ?'; sp = [dateFilter.start, dateFilter.end]; }

    // Mobile Sales
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

    // Accessory Sales
    let sf2 = '', sp2 = [];
    if (dateFilter) { sf2 = ' AND ab.created_at >= ? AND ab.created_at <= ?'; sp2 = [dateFilter.start, dateFilter.end]; }

    const accSales = await db.query(
      `SELECT ab.*, abi.*, c.category_name, b.brand_name
       FROM accessory_bills ab
       LEFT JOIN accessory_bill_items abi ON ab.id = abi.accessory_bill_id AND abi.deleted_at IS NULL
       LEFT JOIN categories c ON abi.category_id = c.id AND c.deleted_at IS NULL
       LEFT JOIN brands b ON abi.brand_id = b.id AND b.deleted_at IS NULL
       WHERE ab.bill_status = 'final' AND ab.deleted_at IS NULL${sf2}
       ORDER BY ab.created_at DESC`,
      sp2
    );

    const saleLines = [];
    const mobMap = {};
    mobSales.forEach(row => {
      if (!mobMap[row.id]) {
        mobMap[row.id] = { ...row, items: [] };
      }
      if (row.product_name) {
        let subtitle = row.category_name || 'Mobile';
        if (row.brand_name) subtitle += ` · ${row.brand_name}`;
        if (row.color) subtitle += ` · ${row.color}`;
        if (row.imei_1) subtitle += ` · IMEI ${row.imei_1}`;
        if (row.imei_2) subtitle += ` · IMEI 2 ${row.imei_2}`;

        saleLines.push({
          id: `${row.id}_ln_${row.category_id || '0'}`,
          at: row.created_at,
          productName: row.product_name,
          qty: parseInt(row.qty || 1, 10),
          amount: parseFloat(row.total || 0),
          customerName: row.customer_name || null,
          categoryId: row.category_id || null,
          detailSubtitle: subtitle
        });
      }
    });

    const accMap = {};
    accSales.forEach(row => {
      if (!accMap[row.id]) {
        accMap[row.id] = { ...row, items: [] };
      }
      if (row.product_name) {
        let subtitle = row.category_name || 'Accessory';
        if (row.brand_name) subtitle += ` · ${row.brand_name}`;
        if (row.color) subtitle += ` · ${row.color}`;

        saleLines.push({
          id: `${row.id}_ln_${row.category_id || '0'}`,
          at: row.created_at,
          productName: row.product_name,
          qty: parseInt(row.qty || 1, 10),
          amount: parseFloat(row.total || 0),
          customerName: row.customer_name || null,
          categoryId: row.category_id || null,
          detailSubtitle: subtitle
        });
      }
    });

    saleLines.sort((a, b) => new Date(b.at) - new Date(a.at));

    // Service repair income
    let sf3 = '', sp3 = [];
    if (dateFilter) { sf3 = ' AND sb.created_at >= ? AND sb.created_at <= ?'; sp3 = [dateFilter.start, dateFilter.end]; }

    const srvBills = await db.query(
      `SELECT sb.*, s.name as supplier_name
       FROM service_bills sb
       LEFT JOIN suppliers s ON sb.supplier_id = s.id AND s.deleted_at IS NULL
       WHERE sb.bill_status = 'final' AND sb.deleted_at IS NULL${sf3}
       ORDER BY sb.created_at DESC`,
      sp3
    );

    const serviceLines = srvBills.map(bill => ({
      id: bill.id,
      at: bill.created_at,
      amount: parseFloat(bill.total_amount),
      particularsTitle: bill.service_details || `Service Repair (${bill.work_mode === 'outsourced' ? 'Outsourced' : 'In-house'})`,
      particularsSub: [bill.customer_name, bill.supplier_name].filter(Boolean).join(' · ') || null
    }));

    // Expenses
    let expWhere = '', expParams = [];
    if (dateFilter) {
      expWhere = ' AND e.date >= ? AND e.date <= ?';
      expParams = [dateFilter.start, dateFilter.end];
    }

    const expenses = await db.query(
      `SELECT e.*, ec.name as category_name
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.expense_category_id = ec.id AND ec.deleted_at IS NULL
       WHERE e.deleted_at IS NULL${expWhere}
       ORDER BY e.date DESC`,
      expParams
    );

    const expenseLines = expenses.map(exp => {
      const catLabel = exp.category_name || '';
      const label = exp.notes || catLabel || 'Shop Expense';
      return {
        id: exp.id,
        at: exp.date,
        source: exp.expense_type === 'exchange' ? 'sale_line' : 'shop',
        label,
        amount: parseFloat(exp.amount)
      };
    });

    return { saleLines, serviceLines, expenseLines };
  }

  async adjustBalance({ cashBalance, onlineBalance, notes }) {
    const today = new Date().toISOString().split('T')[0];
    const record = await financialService.getOrCreateBalanceRecord(today);

    const oldCash = parseFloat(record.cash_balance);
    const oldOnline = parseFloat(record.online_balance);
    const newCash = parseFloat(cashBalance);
    const newOnline = parseFloat(onlineBalance);

    await db.update('balance_histories', record.id, {
      cash_balance: newCash,
      online_balance: newOnline,
      total_balance: newCash + newOnline
    });

    const cashDiff = newCash - oldCash;
    const onlineDiff = newOnline - oldOnline;
    if (cashDiff !== 0 || onlineDiff !== 0) {
      await db.create('financial_transactions', {
        transaction_type: 'adjustment',
        payment_method: 'both',
        amount: Math.abs(cashDiff) + Math.abs(onlineDiff),
        cash_amount: cashDiff,
        online_amount: onlineDiff,
        reference_type: 'balance_adjustment',
        reference_id: record.id,
        performed_by: null,
        notes: notes || 'Manual balance correction'
      });
    }

    return { cash_balance: newCash, online_balance: newOnline, total_balance: newCash + newOnline };
  }
}

module.exports = new DashboardService();