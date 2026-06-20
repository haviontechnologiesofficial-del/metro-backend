/**
 * Transaction helper - provides Sequelize-compatible transaction pattern
 * but backed by mysql2/promise connection pool
 */
const Transaction = {
  /**
   * Get pool lazily to ensure it's initialized
   */
  getPool() {
    return require('../config/database').pool;
  },

  /**
   * Start a transaction and return a connection object
   * Usage: 
   *   const conn = await Transaction.start();
   *   await model.create(data, { transaction: conn });
   *   await Transaction.commit(conn);
   */
  async start() {
    const conn = await this.getPool().getConnection();
    await conn.beginTransaction();
    
    // Create a transaction-compatible object
    const tx = conn;
    
    // Add query method for base.repository compatibility
    tx.query = async (sql, params = []) => {
      const [rows] = await conn.execute(sql, params);
      return rows;
    };
    
    return tx;
  },

  async commit(conn) {
    if (conn) {
      await conn.commit();
      conn.release();
    }
  },

  async rollback(conn) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
  },

  /**
   * Execute a function within a transaction
   * Usage: 
   *   await Transaction.execute(async (t) => {
   *     await model.create(data, { transaction: t });
   *   });
   */
  async execute(callback) {
    const conn = await this.getPool().getConnection();
    try {
      await conn.beginTransaction();
      
      // Create transaction object with query method
      const tx = conn;
      tx.query = async (sql, params = []) => {
        const [rows] = await conn.execute(sql, params);
        return rows;
      };
      
      const result = await callback(tx);
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

module.exports = Transaction;
