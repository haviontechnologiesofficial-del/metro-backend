const db = require('../utils/db.util');

class InvoiceHelper {
  static async generate(type, transaction = null) {
    let prefix = '';
    let tableName = '';

    if (type === 'accessory') {
      prefix = 'ACC';
      tableName = 'accessory_bills';
    } else if (type === 'mobile') {
      prefix = 'MOB';
      tableName = 'mobile_sales';
    } else if (type === 'service') {
      prefix = 'SER';
      tableName = 'service_bills';
    } else {
      throw new Error(`Invalid invoice type: ${type}`);
    }

    const searchPrefix = `${prefix}-`;

    const query = transaction ? transaction.query : db.query;
    const rows = await query(
      `SELECT invoice_no FROM ${tableName} WHERE invoice_no LIKE ? ORDER BY created_at DESC LIMIT 1`,
      [`${searchPrefix}%`]
    );

    let nextNumber = 1;
    if (rows.length > 0 && rows[0].invoice_no) {
      const parts = rows[0].invoice_no.split('-');
      const lastPart = parts[parts.length - 1];
      const lastSeq = parseInt(lastPart, 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `${searchPrefix}${paddedNumber}`;
  }
}

module.exports = InvoiceHelper;