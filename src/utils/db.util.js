const crypto = require('crypto');

/**
 * Lazily get the database pool (avoid ES module destructuring at load time)
 */
function getPool() {
  return require('../config/database').pool;
}

/**
 * Core Database Utility - wraps mysql2/promise pool
 * Provides helpers for common SQL patterns used across the app
 */
const db = {
  /**
   * Get current timestamp in MySQL format (YYYY-MM-DD HH:mm:ss)
   */
  getTimestamp() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  },

  /**
   * Common utility to prepare create payload
   * ALWAYS sets id, created_at, and updated_at
   */
  prepareCreatePayload(data) {
    const payload = { ...data };
    // Always generate UUID if no id provided
    if (!payload.id) {
      payload.id = crypto.randomUUID();
    }
    const now = this.getTimestamp();
    // ALWAYS set created_at and updated_at - never rely on DB defaults
    payload.created_at = now;
    payload.updated_at = now;
    return payload;
  },

  /**
   * Common utility to prepare update payload
   * ALWAYS updates updated_at timestamp
   */
  prepareUpdatePayload(data) {
    const payload = { ...data };
    // ALWAYS set updated_at - never rely on DB defaults
    payload.updated_at = this.getTimestamp();
    return payload;
  },

  /**
   * Common utility to prepare delete payload (soft delete)
   */
  prepareDeletePayload() {
    return this.getTimestamp();
  },

  /**
   * Execute a raw query with params
   */
  async query(sql, params = []) {
    const [rows] = await getPool().execute(sql, params);
    return rows;
  },

  /**
   * Execute a raw query and get the raw result with field info
   */
  async rawQuery(sql, params = []) {
    const [rows, fields] = await getPool().execute(sql, params);
    return { rows, fields };
  },

  /**
   * Get a single row by ID
   */
  async findById(tableName, id) {
    const [rows] = await getPool().execute(`SELECT * FROM ${tableName} WHERE id = ? AND deleted_at IS NULL`, [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Find one row matching conditions
   */
  async findOne(tableName, conditions = {}) {
    const pool = getPool();
    const keys = Object.keys(conditions);
    if (keys.length === 0) {
      const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE deleted_at IS NULL LIMIT 1`);
      return rows.length > 0 ? rows[0] : null;
    }
    const whereClauses = keys.map(k => `${k} = ?`).join(' AND ');
    const values = keys.map(k => conditions[k]);
    const [rows] = await pool.execute(
      `SELECT * FROM ${tableName} WHERE ${whereClauses} AND deleted_at IS NULL LIMIT 1`,
      values
    );
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Find all rows with optional where, order, limit, offset
   */
  async findAll(tableName, { where = {}, orderBy = 'created_at', orderDir = 'DESC', limit = null, offset = null } = {}) {
    const pool = getPool();
    const keys = Object.keys(where);
    let sql = `SELECT * FROM ${tableName} WHERE deleted_at IS NULL`;
    const values = [];

    if (keys.length > 0) {
      const whereClauses = keys.map(k => {
        if (typeof where[k] === 'object' && where[k] !== null) {
          // Handle operators like { like: '%val%' }, { between: [a,b] }
          const op = Object.keys(where[k])[0];
          const val = where[k][op];
          if (op === 'like') {
            values.push(val);
            return `${k} LIKE ?`;
          }
          if (op === 'between') {
            values.push(val[0], val[1]);
            return `${k} BETWEEN ? AND ?`;
          }
          if (op === 'lt') {
            values.push(val);
            return `${k} < ?`;
          }
          if (op === 'lte') {
            values.push(val);
            return `${k} <= ?`;
          }
          if (op === 'gt') {
            values.push(val);
            return `${k} > ?`;
          }
          if (op === 'gte') {
            values.push(val);
            return `${k} >= ?`;
          }
          if (op === 'ne') {
            values.push(val);
            return `${k} != ?`;
          }
          values.push(val);
          return `${k} = ?`;
        }
        values.push(where[k]);
        return `${k} = ?`;
      });
      sql += ` AND ${whereClauses.join(' AND ')}`;
    }

    sql += ` ORDER BY ${orderBy} ${orderDir}`;

    if (limit) {
      sql += ` LIMIT ${parseInt(limit, 10)}`;
    }
    if (offset) {
      sql += ` OFFSET ${parseInt(offset, 10)}`;
    }

    const [rows] = await pool.execute(sql, values);
    return rows;
  },

  /**
   * Create a new row and return it
   * Auto-generates UUID and timestamps.
   * Returns the created data object with generated id and timestamps.
   */
  async create(tableName, data) {
    const pool = getPool();
    const preparedData = this.prepareCreatePayload(data);

    const keys = Object.keys(preparedData);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');
    const values = keys.map(k => preparedData[k]);

    await pool.execute(
      `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
      values
    );

    return preparedData;
  },

  /**
   * Update a row by ID
   */
  async update(tableName, id, data) {
    const pool = getPool();
    const preparedData = this.prepareUpdatePayload(data);
    const keys = Object.keys(preparedData);
    if (keys.length === 0) return null;

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = [...keys.map(k => preparedData[k]), id];

    await pool.execute(
      `UPDATE ${tableName} SET ${setClauses} WHERE id = ?`,
      values
    );

    return this.findById(tableName, id);
  },

  /**
   * Soft delete a row (set deleted_at)
   */
  async delete(tableName, id) {
    const pool = getPool();
    const now = this.prepareDeletePayload();
    await pool.execute(
      `UPDATE ${tableName} SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [now, id]
    );
    return { id, deleted_at: now };
  },

  /**
   * Hard delete a row
   */
  async hardDelete(tableName, id) {
    const pool = getPool();
    await pool.execute(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    return { id };
  },

  /**
   * Count rows with optional where
   */
  async count(tableName, where = {}) {
    const pool = getPool();
    const keys = Object.keys(where);
    let sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE deleted_at IS NULL`;
    const values = [];

    if (keys.length > 0) {
      const whereClauses = keys.map(k => {
        if (typeof where[k] === 'object' && where[k] !== null) {
          const op = Object.keys(where[k])[0];
          const val = where[k][op];
          if (op === 'like') { values.push(val); return `${k} LIKE ?`; }
          if (op === 'between') { values.push(val[0], val[1]); return `${k} BETWEEN ? AND ?`; }
          values.push(val);
          return `${k} = ?`;
        }
        values.push(where[k]);
        return `${k} = ?`;
      });
      sql += ` AND ${whereClauses.join(' AND ')}`;
    }

    const [rows] = await pool.execute(sql, values);
    return rows[0].count;
  },

  /**
   * Sum a column with optional where
   */
  async sum(tableName, column, where = {}) {
    const pool = getPool();
    const keys = Object.keys(where);
    let sql = `SELECT COALESCE(SUM(${column}), 0) as total FROM ${tableName} WHERE deleted_at IS NULL`;
    const values = [];

    if (keys.length > 0) {
      const whereClauses = keys.map(k => {
        if (typeof where[k] === 'object' && where[k] !== null) {
          const op = Object.keys(where[k])[0];
          const val = where[k][op];
          if (op === 'like') { values.push(val); return `${k} LIKE ?`; }
          if (op === 'between') { values.push(val[0], val[1]); return `${k} BETWEEN ? AND ?`; }
          values.push(val);
          return `${k} = ?`;
        }
        values.push(where[k]);
        return `${k} = ?`;
      });
      sql += ` AND ${whereClauses.join(' AND ')}`;
    }

    const [rows] = await pool.execute(sql, values);
    return parseFloat(rows[0].total) || 0;
  },

  /**
   * Find and count all with pagination support
   */
  async findAndCountAll(tableName, where = {}, orderBy = 'created_at', orderDir = 'DESC', limit = null, offset = null, includes = [], transaction = null) {
    const pool = getPool();
    const keys = Object.keys(where);
    
    let countSql = `SELECT COUNT(*) as count FROM ${tableName} WHERE deleted_at IS NULL`;
    let dataSql = `SELECT ${tableName}.* FROM ${tableName} WHERE deleted_at IS NULL`;
    const values = [];

    if (keys.length > 0) {
      const whereClauses = keys.map(k => {
        if (typeof where[k] === 'object' && where[k] !== null) {
          const op = Object.keys(where[k])[0];
          const val = where[k][op];
          if (op === 'like') { values.push(val); return `${tableName}.${k} LIKE ?`; }
          if (op === 'between') { values.push(val[0], val[1]); return `${tableName}.${k} BETWEEN ? AND ?`; }
          if (op === 'lt') { values.push(val); return `${tableName}.${k} < ?`; }
          if (op === 'lte') { values.push(val); return `${tableName}.${k} <= ?`; }
          if (op === 'gt') { values.push(val); return `${tableName}.${k} > ?`; }
          if (op === 'gte') { values.push(val); return `${tableName}.${k} >= ?`; }
          if (op === 'ne') { values.push(val); return `${tableName}.${k} != ?`; }
          values.push(val);
          return `${tableName}.${k} = ?`;
        }
        values.push(where[k]);
        return `${tableName}.${k} = ?`;
      });
      const clause = whereClauses.join(' AND ');
      countSql += ` AND ${clause}`;
      dataSql += ` AND ${clause}`;
    }

    dataSql += ` ORDER BY ${orderBy} ${orderDir}`;
    if (limit) dataSql += ` LIMIT ${parseInt(limit, 10)}`;
    if (offset) dataSql += ` OFFSET ${parseInt(offset, 10)}`;

    if (transaction) {
      const countRows = await transaction.query(countSql, [...values]);
      const dataRows = await transaction.query(dataSql, [...values]);
      return {
        count: parseInt(countRows[0]?.count || 0, 10),
        rows: dataRows
      };
    }

    const countRows = await pool.execute(countSql, [...values]);
    const dataRows = await pool.execute(dataSql, [...values]);
    
    return {
      count: parseInt(countRows[0][0]?.count || 0, 10),
      rows: dataRows[0]
    };
  },

  /**
   * Get the current connection for transactions
   */
  async getConnection() {
    return await getPool().getConnection();
  },

  /**
   * Execute queries within a transaction
   */
  async transaction(callback) {
    const conn = await getPool().getConnection();
    try {
      await conn.beginTransaction();
      const result = await callback({
        query: async (sql, params = []) => {
          const [rows] = await conn.execute(sql, params);
          return rows;
        },
        connection: conn
      });
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
};

module.exports = db;
