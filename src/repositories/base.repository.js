const db = require('../utils/db.util');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async create(data, transaction = null) {
    const preparedData = db.prepareCreatePayload(data);
    if (transaction) {
      const keys = Object.keys(preparedData);
      const placeholders = keys.map(() => '?').join(', ');
      const columns = keys.join(', ');
      const values = keys.map(k => preparedData[k]);
      await transaction.query(`INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`, values);
      return preparedData;
    }
    return await db.create(this.tableName, preparedData);
  }

  async update(id, data, transaction = null) {
    const preparedData = db.prepareUpdatePayload(data);
    const keys = Object.keys(preparedData);
    if (keys.length === 0) return null;
    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => preparedData[k]);

    if (transaction) {
      await transaction.query(`UPDATE ${this.tableName} SET ${setClauses} WHERE id = ?`, [...values, id]);
    } else {
      await db.query(`UPDATE ${this.tableName} SET ${setClauses} WHERE id = ?`, [...values, id]);
    }
    return await this.findById(id, { transaction });
  }

  async delete(id, transaction = null) {
    if (transaction) {
      // Hard delete in transaction
      await transaction.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    } else {
      await db.hardDelete(this.tableName, id);
    }
    return { id };
  }

  async findById(id, { includes = [], transaction = null } = {}) {
    let record;
    if (transaction) {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL LIMIT 1`;
      const rows = await transaction.query(sql, [id]);
      record = rows.length > 0 ? rows[0] : null;
    } else {
      record = await db.findById(this.tableName, id);
    }

    if (!record) return null;

    if (includes.length > 0) {
      for (const inc of includes) {
        if (!inc.as) continue;

        let childTable = '';
        let childKey = '';
        let parentKey = 'id';
        let isHasMany = false;

        if (inc.as === 'category') { childTable = 'categories'; childKey = 'id'; parentKey = 'category_id'; }
        else if (inc.as === 'brand') { childTable = 'brands'; childKey = 'id'; parentKey = 'brand_id'; }
        else if (inc.as === 'supplier') { childTable = 'suppliers'; childKey = 'id'; parentKey = 'supplier_id'; }
        else if (inc.as === 'user') { childTable = 'users'; childKey = 'id'; parentKey = 'performed_by'; }
        else if (inc.as === 'product') { childTable = 'products'; childKey = 'id'; parentKey = 'product_id'; }
        else if (inc.as === 'items') {
          isHasMany = true;
          parentKey = 'id';
          if (this.tableName === 'mobile_sales') {
            childTable = 'mobile_sale_items';
            childKey = 'mobile_sale_id';
          } else if (this.tableName === 'accessory_bills') {
            childTable = 'accessory_bill_items';
            childKey = 'accessory_bill_id';
          }
        }
        else if (inc.as === 'sale') { childTable = 'mobile_sales'; childKey = 'id'; parentKey = 'mobile_sale_id'; }
        else if (inc.as === 'bill') { childTable = 'accessory_bills'; childKey = 'id'; parentKey = 'accessory_bill_id'; }

        if (childTable) {
          const val = record[parentKey];
          if (val) {
            if (isHasMany) {
              let items;
              if (transaction) {
                items = await transaction.query(`SELECT * FROM ${childTable} WHERE ${childKey} = ? AND deleted_at IS NULL`, [val]);
              } else {
                items = await db.findAll(childTable, { where: { [childKey]: val } });
              }
              record[inc.as] = items;
            } else {
              let child;
              if (transaction) {
                const rows = await transaction.query(`SELECT * FROM ${childTable} WHERE ${childKey} = ? AND deleted_at IS NULL LIMIT 1`, [val]);
                child = rows.length > 0 ? rows[0] : null;
              } else {
                child = await db.findById(childTable, val);
              }
              record[inc.as] = child;
            }
          } else {
            record[inc.as] = isHasMany ? [] : null;
          }
        }
      }
    }

    return record;
  }

  async findOne(options = {}) {
    const { where = {}, transaction = null } = options;
    const keys = Object.keys(where);

    if (keys.length === 0) {
      return await db.findOne(this.tableName);
    }

    const { clause, values } = this._buildWhere(where);
    let sql = `SELECT * FROM ${this.tableName} WHERE ${clause} AND deleted_at IS NULL LIMIT 1`;

    if (transaction) {
      const rows = await transaction.query(sql, values);
      return rows.length > 0 ? rows[0] : null;
    }
    const rows = await db.query(sql, values);
    return rows.length > 0 ? rows[0] : null;
  }

  async list({
    page = 1,
    limit = 10,
    search = '',
    searchFields = [],
    filters = {},
    dateRange = null,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    includes = [],
    transaction = null
  } = {}) {
    const offset = (page - 1) * limit;
    const where = {};

    // Build filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        where[key] = filters[key];
      }
    });

    // Build search  
    if (search && searchFields.length > 0) {
      where[`${searchFields[0]}`] = { like: `%${search}%` };
    }

    // Build date range
    if (dateRange && dateRange.start && dateRange.end) {
      const dateField = dateRange.field || 'created_at';
      where[dateField] = {
        between: [
          new Date(dateRange.start + 'T00:00:00.000Z'),
          new Date(dateRange.end + 'T23:59:59.999Z')
        ]
      };
    }

    const result = await db.findAndCountAll(this.tableName, where, sortBy, sortOrder, limit, offset, includes, transaction);

    if (result.rows && result.rows.length > 0 && includes.length > 0) {
      for (const record of result.rows) {
        for (const inc of includes) {
          if (!inc.as) continue;

          let childTable = '';
          let childKey = '';
          let parentKey = 'id';
          let isHasMany = false;

          if (inc.as === 'category') { childTable = 'categories'; childKey = 'id'; parentKey = 'category_id'; }
          else if (inc.as === 'brand') { childTable = 'brands'; childKey = 'id'; parentKey = 'brand_id'; }
          else if (inc.as === 'supplier') { childTable = 'suppliers'; childKey = 'id'; parentKey = 'supplier_id'; }
          else if (inc.as === 'user') { childTable = 'users'; childKey = 'id'; parentKey = 'performed_by'; }
          else if (inc.as === 'product') { childTable = 'products'; childKey = 'id'; parentKey = 'product_id'; }
          else if (inc.as === 'items') {
            isHasMany = true;
            parentKey = 'id';
            if (this.tableName === 'mobile_sales') {
              childTable = 'mobile_sale_items';
              childKey = 'mobile_sale_id';
            } else if (this.tableName === 'accessory_bills') {
              childTable = 'accessory_bill_items';
              childKey = 'accessory_bill_id';
            }
          }
          else if (inc.as === 'sale') { childTable = 'mobile_sales'; childKey = 'id'; parentKey = 'mobile_sale_id'; }
          else if (inc.as === 'bill') { childTable = 'accessory_bills'; childKey = 'id'; parentKey = 'accessory_bill_id'; }

          if (childTable) {
            const val = record[parentKey];
            if (val) {
              if (isHasMany) {
                let items;
                if (transaction) {
                  items = await transaction.query(`SELECT * FROM ${childTable} WHERE ${childKey} = ? AND deleted_at IS NULL`, [val]);
                } else {
                  items = await db.findAll(childTable, { where: { [childKey]: val } });
                }
                record[inc.as] = items;
              } else {
                let child;
                if (transaction) {
                  const rows = await transaction.query(`SELECT * FROM ${childTable} WHERE ${childKey} = ? AND deleted_at IS NULL LIMIT 1`, [val]);
                  child = rows.length > 0 ? rows[0] : null;
                } else {
                  child = await db.findById(childTable, val);
                }
                record[inc.as] = child;
              }
            } else {
              record[inc.as] = isHasMany ? [] : null;
            }
          }
        }
      }
    }

    return result;
  }

  _buildWhere(where) {
    const clauses = [];
    const values = [];
    Object.keys(where).forEach(k => {
      const val = where[k];
      if (typeof val === 'object' && val !== null) {
        const op = Object.keys(val)[0];
        const opVal = val[op];
        if (op === 'like') { clauses.push(`${k} LIKE ?`); values.push(opVal); }
        else if (op === 'between') { clauses.push(`${k} BETWEEN ? AND ?`); values.push(opVal[0], opVal[1]); }
        else if (op === 'lt') { clauses.push(`${k} < ?`); values.push(opVal); }
        else if (op === 'lte') { clauses.push(`${k} <= ?`); values.push(opVal); }
        else if (op === 'gt') { clauses.push(`${k} > ?`); values.push(opVal); }
        else if (op === 'gte') { clauses.push(`${k} >= ?`); values.push(opVal); }
        else if (op === 'ne') { clauses.push(`${k} != ?`); values.push(opVal); }
        else { clauses.push(`${k} = ?`); values.push(val); }
      } else {
        clauses.push(`${k} = ?`);
        values.push(val);
      }
    });
    return { clause: clauses.join(' AND '), values };
  }

  _buildJoinSql(sql, includes) {
    includes.forEach(inc => {
      if (!inc.as) return;
      let childTable = '';
      let childKey = '';
      let parentKey = 'id';

      if (inc.as === 'category') { childTable = 'categories'; childKey = 'id'; parentKey = 'category_id'; }
      else if (inc.as === 'brand') { childTable = 'brands'; childKey = 'id'; parentKey = 'brand_id'; }
      else if (inc.as === 'supplier') { childTable = 'suppliers'; childKey = 'id'; parentKey = 'supplier_id'; }
      else if (inc.as === 'user') { childTable = 'users'; childKey = 'id'; parentKey = 'performed_by'; }
      else if (inc.as === 'product') { childTable = 'products'; childKey = 'id'; parentKey = 'product_id'; }
      else if (inc.as === 'items') { childTable = 'accessory_bill_items'; childKey = 'accessory_bill_id'; parentKey = 'id'; }
      else if (inc.as === 'sale') { childTable = 'mobile_sales'; childKey = 'id'; parentKey = 'mobile_sale_id'; }
      else if (inc.as === 'bill') { childTable = 'accessory_bills'; childKey = 'id'; parentKey = 'accessory_bill_id'; }
      else if (inc.model && inc.model.tableName) { childTable = inc.model.tableName; childKey = 'id'; }

      if (childTable) {
        sql += ` LEFT JOIN ${childTable} ON ${childTable}.${childKey} = ${this.tableName}.${parentKey}`;
      }
    });
    return sql;
  }
}

module.exports = BaseRepository;