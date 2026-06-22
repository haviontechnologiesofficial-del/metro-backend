const db = require('./db.util');

/**
 * Model Factory - Creates model-like objects that wrap the db utility
 * Maintains compatibility with existing service code that uses Model.findAll(), etc.
 */

// Track table configs for join resolution
const tableConfigs = {};

function registerTable(tableName, config = {}) {
  tableConfigs[tableName] = { tableName, ...config };
}

/**
 * Build a SQL JOIN clause from include definitions
 */
function buildJoins(includeList) {
  if (!includeList || includeList.length === 0) return { joinClause: '', groupBy: [] };

  const joins = [];
  const groupByCols = [];

  includeList.forEach(inc => {
    if (!inc.as) return;
    
    // Determine foreign key based on common patterns
    let childTable = '';
    let childKey = '';
    let parentKey = 'id';
    let childAttrs = '';

    if (inc.as === 'category') {
      childTable = 'categories';
      childKey = 'id';
      parentKey = 'category_id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'subcategory') {
      childTable = 'subcategories';
      childKey = 'id';
      parentKey = 'subcategory_id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'brand') {
      childTable = 'brands';
      childKey = 'id';
      parentKey = 'brand_id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'supplier') {
      childTable = 'suppliers';
      childKey = 'id';
      parentKey = 'supplier_id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'user') {
      childTable = 'users';
      childKey = 'id';
      parentKey = 'performed_by';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'product') {
      childTable = 'products';
      childKey = 'id';
      parentKey = 'product_id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'items') {
      // items is a hasMany relationship - handled differently
      return;
    } else if (inc.as === 'sale') {
      childTable = 'mobile_sales';
      childKey = 'id';
      parentKey = 'mobile_sale_id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'bill') {
      childTable = 'accessory_bills';
      childKey = 'id';
      parentKey = 'accessory_bill_id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'expenses') {
      childTable = 'expenses';
      childKey = 'expense_category_id';
      parentKey = 'id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'products') {
      childTable = 'products';
      childKey = 'category_id';
      parentKey = 'id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'service_bills') {
      childTable = 'service_bills';
      childKey = 'supplier_id';
      parentKey = 'id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'stock_histories') {
      childTable = 'stock_histories';
      childKey = 'product_id';
      parentKey = 'id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'stock_transactions') {
      childTable = 'stock_transactions';
      childKey = 'product_id';
      parentKey = 'id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    } else if (inc.as === 'supplier_transactions') {
      childTable = 'supplier_transactions';
      childKey = 'supplier_id';
      parentKey = 'id';
      childAttrs = inc.attributes ? inc.attributes.join(', ') : '*';
    }

    if (childTable) {
      const joinType = inc.required ? 'INNER JOIN' : 'LEFT JOIN';
      let extraCondition = '';
      if (inc.where) {
        const wKeys = Object.keys(inc.where);
        wKeys.forEach(k => {
          const val = inc.where[k];
          if (typeof val === 'object' && val !== null) {
            const op = Object.keys(val)[0];
            const opVal = val[op];
            if (op === 'between') {
              // Handled in where clause instead
            }
          } else {
            extraCondition += ` AND ${childTable}.${k} = '${val}'`;
          }
        });
      }

      if (inc.model && inc.model.tableName) {
        childTable = inc.model.tableName;
      }

      joins.push(`${joinType} ${childTable} ON ${childTable}.${childKey} = ${parentKey}${extraCondition}`);
    }
  });

  return { joinClause: joins.join(' '), groupBy: groupByCols };
}

/**
 * Build WHERE clause from a where object (used in service code)
 */
function buildWhereClause(where = {}, prefix = '') {
  const clauses = [];
  const values = [];

  Object.keys(where).forEach(k => {
    const val = where[k];
    const col = prefix ? `${prefix}.${k}` : k;

    if (typeof val === 'object' && val !== null) {
      const opKeys = Object.keys(val);
      opKeys.forEach(op => {
        const opVal = val[op];
        if (op === 'between') {
          clauses.push(`${col} BETWEEN ? AND ?`);
          values.push(opVal[0], opVal[1]);
        } else if (op === 'like') {
          clauses.push(`${col} LIKE ?`);
          values.push(opVal);
        } else if (op === 'lt') {
          clauses.push(`${col} < ?`);
          values.push(opVal);
        } else if (op === 'lte') {
          clauses.push(`${col} <= ?`);
          values.push(opVal);
        } else if (op === 'gt') {
          clauses.push(`${col} > ?`);
          values.push(opVal);
        } else if (op === 'gte') {
          clauses.push(`${col} >= ?`);
          values.push(opVal);
        } else if (op === 'ne') {
          clauses.push(`${col} != ?`);
          values.push(opVal);
        } else if (op === 'in') {
          const placeholders = opVal.map(() => '?').join(',');
          clauses.push(`${col} IN (${placeholders})`);
          values.push(...opVal);
        } else if (op === 'or') {
          const orClauses = [];
          opVal.forEach(orCond => {
            Object.keys(orCond).forEach(orK => {
              const orV = orCond[orK];
              if (typeof orV === 'object' && orV !== null) {
                const orOp = Object.keys(orV)[0];
                const orOpVal = orV[orOp];
                if (orOp === 'like') {
                  orClauses.push(`${orK} LIKE ?`);
                  values.push(orOpVal);
                }
              } else {
                orClauses.push(`${orK} = ?`);
                values.push(orV);
              }
            });
          });
          if (orClauses.length > 0) {
            clauses.push(`(${orClauses.join(' OR ')})`);
          }
        }
      });
    } else {
      clauses.push(`${col} = ?`);
      values.push(val);
    }
  });

  return { clause: clauses.join(' AND '), values };
}

/**
 * Create a model wrapper
 */
function createModel(tableName, options = {}) {
  const model = {
    tableName,

    /**
     * Find all rows
     */
    async findAll(opts = {}) {
      const { where = {}, order = [], limit = null, offset = null, include = [], attributes = [] } = opts;
      
      let selectCols = attributes.length > 0 ? attributes.join(', ') : `${tableName}.*`;
      let sql = `SELECT ${selectCols} FROM ${tableName}`;
      const allValues = [];

      // Build joins
      const { joinClause } = buildJoins(include);
      if (joinClause) {
        sql += ` ${joinClause}`;
      }

      // Build where
      sql += ` WHERE ${tableName}.deleted_at IS NULL`;
      const { clause, values } = buildWhereClause(where, tableName);
      if (clause) {
        sql += ` AND ${clause}`;
        allValues.push(...values);
      }

      // Handle include-level where conditions
      if (include.length > 0) {
        include.forEach(inc => {
          if (inc.where && inc.as) {
            // Already handled in join
          }
        });
      }

      // Order
      if (order.length > 0) {
        const orderClauses = order.map(o => {
          if (Array.isArray(o)) {
            return `${o[0]} ${o[1]}`;
          }
          return o;
        });
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      } else {
        sql += ` ORDER BY ${tableName}.created_at DESC`;
      }

      if (limit) {
        sql += ` LIMIT ${parseInt(limit, 10)}`;
      }
      if (offset) {
        sql += ` OFFSET ${parseInt(offset, 10)}`;
      }

      return await db.query(sql, allValues);
    },

    /**
     * Find by primary key
     */
    async findByPk(id, opts = {}) {
      const { include = [] } = opts;
      
      let sql = `SELECT ${tableName}.* FROM ${tableName}`;
      const { joinClause } = buildJoins(include);
      if (joinClause) {
        sql += ` ${joinClause}`;
      }
      sql += ` WHERE ${tableName}.id = ? AND ${tableName}.deleted_at IS NULL LIMIT 1`;

      const rows = await db.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Find one row
     */
    async findOne(opts = {}) {
      const { where = {}, order = [], include = [] } = opts;
      
      let sql = `SELECT ${tableName}.* FROM ${tableName}`;
      const allValues = [];

      const { joinClause } = buildJoins(include);
      if (joinClause) {
        sql += ` ${joinClause}`;
      }

      sql += ` WHERE ${tableName}.deleted_at IS NULL`;
      const { clause, values } = buildWhereClause(where, tableName);
      if (clause) {
        sql += ` AND ${clause}`;
        allValues.push(...values);
      }

      if (order.length > 0) {
        const orderClauses = order.map(o => {
          if (Array.isArray(o)) {
            return `${o[0]} ${o[1]}`;
          }
          return o;
        });
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }

      sql += ' LIMIT 1';

      const rows = await db.query(sql, allValues);
      return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Create a new record
     * ALWAYS sets timestamps
     */
    async create(data, opts = {}) {
      // ALWAYS use prepareCreatePayload to ensure timestamps are set
      const preparedData = db.prepareCreatePayload(data);
      const tx = opts.transaction;
      
      if (tx) {
        // Use the transaction query function
        const keys = Object.keys(preparedData);
        const placeholders = keys.map(() => '?').join(', ');
        const columns = keys.join(', ');
        const values = keys.map(k => preparedData[k]);
        const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        await tx.query(sql, values);
        return preparedData;
      }
      return await db.create(tableName, preparedData);
    },

    /**
     * Bulk create records
     * ALWAYS sets timestamps for each record
     */
    async bulkCreate(dataArray, opts = {}) {
      if (!dataArray || dataArray.length === 0) return [];
      
      // Prepare each record with timestamps
      const preparedDataArray = dataArray.map(data => db.prepareCreatePayload(data));
      const tx = opts.transaction;
      
      const keys = Object.keys(preparedDataArray[0]);
      const placeholders = keys.map(() => '?').join(', ');
      const columns = keys.join(', ');
      
      const values = [];
      for (const data of preparedDataArray) {
        for (const key of keys) {
          values.push(data[key]);
        }
      }
      
      const valuePlaceholders = preparedDataArray.map(() => `(${placeholders})`).join(', ');
      const sql = `INSERT INTO ${tableName} (${columns}) VALUES ${valuePlaceholders}`;
      
      if (tx) {
        await tx.query(sql, values);
      } else {
        await db.query(sql, values);
      }
      
      return preparedDataArray;
    },

    /**
     * Update records
     * ALWAYS updates updated_at timestamp
     */
    async update(data, opts = {}) {
      const { where = {}, transaction: tx } = opts;
      // ALWAYS use prepareUpdatePayload to ensure updated_at is set
      const preparedData = db.prepareUpdatePayload(data);
      const keys = Object.keys(preparedData);
      if (keys.length === 0) return [0];

      const setClauses = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => preparedData[k]);

      const { clause, values: whereValues } = buildWhereClause(where);
      let sql = `UPDATE ${tableName} SET ${setClauses}`;
      if (clause) {
        sql += ` WHERE ${clause}`;
        values.push(...whereValues);
      }

      if (tx) {
        await tx.query(sql, values);
      } else {
        await db.query(sql, values);
      }
      return [1]; // Sequelize returns [affectedCount]
    },

    /**
     * Update by primary key
     * ALWAYS updates updated_at timestamp
     */
    async updateByPk(id, data, opts = {}) {
      const { transaction: tx } = opts;
      const preparedData = db.prepareUpdatePayload(data);
      const keys = Object.keys(preparedData);
      if (keys.length === 0) return null;
      
      const setClauses = keys.map(k => `${k} = ?`).join(', ');
      const values = [...keys.map(k => preparedData[k]), id];
      const sql = `UPDATE ${tableName} SET ${setClauses} WHERE id = ?`;
      
      if (tx) {
        await tx.query(sql, values);
      } else {
        await db.query(sql, values);
      }
      
      return await this.findByPk(id, opts);
    },

    /**
     * Destroy (soft delete) records
     */
    async destroy(opts = {}) {
      const { where = {}, transaction: tx, force = false } = opts;
      const now = db.prepareDeletePayload();

      if (force) {
        const { clause, values } = buildWhereClause(where);
        let sql = `DELETE FROM ${tableName}`;
        if (clause) {
          sql += ` WHERE ${clause}`;
        }
        if (tx) {
          await tx.query(sql, values);
        } else {
          await db.query(sql, values);
        }
      } else {
        const { clause, values } = buildWhereClause(where);
        let sql = `UPDATE ${tableName} SET deleted_at = ?`;
        if (clause) {
          sql += ` WHERE ${clause}`;
          values.unshift(now);
        } else {
          values.unshift(now);
        }
        if (tx) {
          await tx.query(sql, values);
        } else {
          await db.query(sql, values);
        }
      }
      return [1];
    },

    /**
     * Find and count all (for pagination)
     */
    async findAndCountAll(opts = {}) {
      const { where = {}, limit = null, offset = null, order = [], include = [] } = opts;

      let countSql = `SELECT COUNT(*) as count FROM ${tableName}`;
      let dataSql = `SELECT ${tableName}.* FROM ${tableName}`;
      const allValues = [];

      const { joinClause } = buildJoins(include);
      if (joinClause) {
        countSql += ` ${joinClause}`;
        dataSql += ` ${joinClause}`;
      }

      countSql += ` WHERE ${tableName}.deleted_at IS NULL`;
      dataSql += ` WHERE ${tableName}.deleted_at IS NULL`;

      const { clause, values } = buildWhereClause(where, tableName);
      if (clause) {
        countSql += ` AND ${clause}`;
        dataSql += ` AND ${clause}`;
        allValues.push(...values);
      }

      if (order.length > 0) {
        const orderClauses = order.map(o => {
          if (Array.isArray(o)) return `${o[0]} ${o[1]}`;
          return o;
        });
        dataSql += ` ORDER BY ${orderClauses.join(', ')}`;
      } else {
        dataSql += ` ORDER BY ${tableName}.created_at DESC`;
      }

      if (limit) {
        dataSql += ` LIMIT ${parseInt(limit, 10)}`;
      }
      if (offset) {
        dataSql += ` OFFSET ${parseInt(offset, 10)}`;
      }

      const countResult = await db.query(countSql, [...allValues]);
      const rows = await db.query(dataSql, [...allValues]);

      return {
        count: parseInt(countResult[0]?.count || 0, 10),
        rows
      };
    },

    /**
     * Sum a column
     */
    async sum(column, opts = {}) {
      const { where = {} } = opts;
      
      let sql = `SELECT COALESCE(SUM(${tableName}.${column}), 0) as total FROM ${tableName}`;
      sql += ` WHERE ${tableName}.deleted_at IS NULL`;
      
      const { clause, values } = buildWhereClause(where, tableName);
      if (clause) {
        sql += ` AND ${clause}`;
      }

      const rows = await db.query(sql, values);
      return parseFloat(rows[0]?.total || 0);
    },

    /**
     * Count rows
     */
    async count(opts = {}) {
      const { where = {} } = opts;
      
      let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
      sql += ` WHERE ${tableName}.deleted_at IS NULL`;

      const { clause, values } = buildWhereClause(where, tableName);
      if (clause) {
        sql += ` AND ${clause}`;
      }

      const rows = await db.query(sql, values);
      return parseInt(rows[0]?.count || 0, 10);
    },

    /**
     * Increment a column
     */
    async increment(column, opts = {}) {
      const { by = 1, where = {} } = opts;
      const { clause, values } = buildWhereClause(where);
      let sql = `UPDATE ${tableName} SET ${column} = ${column} + ?`;
      if (clause) {
        sql += ` WHERE ${clause}`;
        values.unshift(by);
      }
      await db.query(sql, values);
    },

    /**
     * Decrement a column
     */
    async decrement(column, opts = {}) {
      const { by = 1, where = {} } = opts;
      const { clause, values } = buildWhereClause(where);
      let sql = `UPDATE ${tableName} SET ${column} = ${column} - ?`;
      if (clause) {
        sql += ` WHERE ${clause}`;
        values.unshift(by);
      }
      await db.query(sql, values);
    }
  };

  return model;
}

module.exports = {
  createModel,
  registerTable
};