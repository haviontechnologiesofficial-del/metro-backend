const db = require('../utils/db.util');
const stockService = require('../services/stock.service');
const ApiResponse = require('../helpers/apiResponse.helper');

class StockController {
  async listStockAdditions(req, res, next) {
    try {
      const additions = await db.query(
        `SELECT sh.*, p.id as product_id, p.name as product_name, p.sku_code, p.supplier_id,
                c.category_name, b.brand_name, s.name as supplier_name
         FROM stock_histories sh
         LEFT JOIN products p ON sh.product_id = p.id AND p.deleted_at IS NULL
         LEFT JOIN categories c ON p.category_id = c.id AND c.deleted_at IS NULL
         LEFT JOIN brands b ON p.brand_id = b.id AND b.deleted_at IS NULL
         LEFT JOIN suppliers s ON p.supplier_id = s.id AND s.deleted_at IS NULL
         WHERE sh.deleted_at IS NULL
         ORDER BY sh.created_at DESC`
      );

      const formatted = additions.map(h => {
        let supplierId = h.supplier_id;
        let notes = h.notes || '';
        if (notes.startsWith('{')) {
          try {
            const obj = JSON.parse(notes);
            if (obj.supplierId) {
              supplierId = obj.supplierId;
              notes = obj.notes || '';
            }
          } catch (e) {}
        }
        return {
          id: h.id,
          productId: h.product_id,
          supplierId,
          quantity: h.qty,
          changeType: h.change_type,
          at: h.created_at,
          notes
        };
      });

      return ApiResponse.success(res, 'Stock additions retrieved successfully', formatted);
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }

  async createStockAddition(req, res, next) {
    const conn = await db.getConnection();
    try {
      const { productId, supplierId, quantity, notes, imei_1, imei_2 } = req.body;

      if (!productId || !supplierId || !quantity) {
        throw new Error('Product, supplier and quantity are required');
      }

      await conn.beginTransaction();
      const tx = conn;
      tx.query = async (sql, params) => {
        const [rows] = await conn.execute(sql, params);
        return rows;
      };

      const product = await db.findById('products', productId);
      if (!product) throw new Error('Product not found');

      await tx.query('UPDATE products SET supplier_id = ? WHERE id = ?', [supplierId, productId]);

      const notesStr = JSON.stringify({ supplierId, notes: notes || 'Stock added manually' });
      await stockService.addStock({
        productId,
        qty: parseInt(quantity, 10),
        imei_1: imei_1 || product.imei_1,
        imei_2: imei_2 || product.imei_2,
        sourceRef: 'manual',
        performedBy: req.user ? req.user.id : null,
        notes: notesStr
      }, tx);

      if (product.cost_price > 0) {
        const supplierService = require('../services/supplier.service');
        const costAmount = parseFloat(product.cost_price) * parseInt(quantity, 10);
        await supplierService.increasePending({
          supplierId,
          amount: costAmount,
          referenceType: 'manual_stock_add',
          referenceId: productId,
          notes: `Stock addition of ${quantity} units for ${product.name} (SKU: ${product.sku_code || 'N/A'})`
        }, tx);
      }

      await conn.commit();
      return ApiResponse.success(res, 'Stock added successfully', { productId, quantity });
    } catch (error) {
      await conn.rollback();
      return ApiResponse.error(res, error.message, error, 400);
    } finally {
      conn.release();
    }
  }

  async getProductMovements(req, res, next) {
    try {
      const { productId } = req.params;

      const product = await db.query(
        `SELECT p.*, c.category_name, b.brand_name, s.name as supplier_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id AND c.deleted_at IS NULL
         LEFT JOIN brands b ON p.brand_id = b.id AND b.deleted_at IS NULL
         LEFT JOIN suppliers s ON p.supplier_id = s.id AND s.deleted_at IS NULL
         WHERE p.id = ? AND p.deleted_at IS NULL
         LIMIT 1`,
        [productId]
      );

      if (!product || product.length === 0) throw new Error('Product not found');
      const prod = product[0];

      const updates = await db.findAll('stock_histories', {
        where: { product_id: productId },
        orderBy: 'created_at',
        orderDir: 'DESC'
      });

      const formattedUpdates = updates.map(h => {
        let supplierId = null;
        let notes = h.notes || '';
        if (notes.startsWith('{')) {
          try {
            const obj = JSON.parse(notes);
            if (obj.supplierId) {
              supplierId = obj.supplierId;
              notes = obj.notes || '';
            }
          } catch (e) {}
        }
        return {
          id: h.id,
          productId: h.product_id,
          supplierId,
          quantity: h.qty,
          at: h.created_at,
          notes
        };
      });

      const mobileSales = await db.query(
        `SELECT msi.*, ms.customer_name, ms.created_at as sale_date
         FROM mobile_sale_items msi
         LEFT JOIN mobile_sales ms ON msi.mobile_sale_id = ms.id AND ms.deleted_at IS NULL
         WHERE msi.product_id = ? AND msi.deleted_at IS NULL AND ms.status = 'final'
         ORDER BY msi.created_at DESC`,
        [productId]
      );

      const accessorySales = await db.query(
        `SELECT abi.*, ab.customer_name, ab.created_at as sale_date
         FROM accessory_bill_items abi
         LEFT JOIN accessory_bills ab ON abi.accessory_bill_id = ab.id AND ab.deleted_at IS NULL
         WHERE abi.product_id = ? AND abi.deleted_at IS NULL AND ab.bill_status = 'final'
         ORDER BY abi.created_at DESC`,
        [productId]
      );

      const formattedSales = [];
      mobileSales.forEach(item => {
        formattedSales.push({
          id: item.id,
          productId: item.product_id,
          customerName: item.customer_name || 'Walk-in',
          soldQtyForThisProduct: item.qty,
          at: item.sale_date || item.created_at
        });
      });
      accessorySales.forEach(item => {
        formattedSales.push({
          id: item.id,
          productId: item.product_id,
          customerName: item.customer_name || 'Walk-in',
          soldQtyForThisProduct: item.qty,
          at: item.sale_date || item.created_at
        });
      });

      formattedSales.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      const normalizedProduct = {
        id: prod.id,
        name: prod.name,
        sku: prod.sku_code || '',
        stockQty: prod.current_stock_qty,
        categoryId: prod.category_id,
        brandId: prod.brand_id,
        supplierId: prod.supplier_id
      };

      return ApiResponse.success(res, 'Product movements retrieved successfully', {
        product: normalizedProduct,
        updates: formattedUpdates,
        sales: formattedSales
      });
    } catch (error) {
      return ApiResponse.error(res, error.message, error, 400);
    }
  }
}

module.exports = new StockController();