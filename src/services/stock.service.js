const { productRepository, stockHistoryRepository, stockTransactionRepository } = require('../repositories');

class StockService {
  static async addStock({ productId, qty, imei_1, imei_2, sourceRef, performedBy, notes }, transaction = null) {
    const product = await productRepository.findById(productId, { transaction });
    if (!product) {
      throw new Error(`Product not found with ID ${productId}`);
    }

    const previousStock = parseInt(product.current_stock_qty || 0, 10);
    const newStock = previousStock + parseInt(qty, 10);

    await productRepository.update(productId, { current_stock_qty: newStock }, transaction);

    await stockHistoryRepository.create({
      product_id: productId,
      change_type: previousStock === 0 && parseInt(product.initial_stock_qty || 0, 10) === 0 ? 'initial' : 'stock_in',
      qty,
      remaining_stock: newStock,
      imei_1: imei_1 || null,
      imei_2: imei_2 || null,
      notes: notes || 'Stock added manually'
    }, transaction);

    await stockTransactionRepository.create({
      product_id: productId,
      transaction_type: 'in',
      qty,
      source_ref: sourceRef || 'manual',
      performed_by: performedBy,
      notes: notes || 'Stock increase'
    }, transaction);

    return { ...product, current_stock_qty: newStock };
  }

  static async reduceStock({ productId, qty, imei_1, imei_2, sourceRef, performedBy, notes }, transaction = null) {
    const product = await productRepository.findById(productId, { transaction });
    if (!product) {
      throw new Error(`Product not found with ID ${productId}`);
    }

    const currentQty = parseInt(product.current_stock_qty || 0, 10);
    const reduceQty = parseInt(qty, 10);

    if (currentQty < reduceQty) {
      throw new Error(`Insufficient stock for product: "${product.name}". Available: ${currentQty}, Requested: ${reduceQty}`);
    }

    if (imei_1 && product.imei_1 && product.imei_1 !== imei_1) {
      throw new Error(`IMEI ${imei_1} does not match the product record for "${product.name}"`);
    }

    const newStock = currentQty - reduceQty;
    const status = product.imei_1 && newStock === 0 ? 'sold' : product.status;

    await productRepository.update(productId, { current_stock_qty: newStock, status }, transaction);

    await stockHistoryRepository.create({
      product_id: productId,
      change_type: 'stock_out',
      qty,
      remaining_stock: newStock,
      imei_1: imei_1 || null,
      imei_2: imei_2 || null,
      notes: notes || 'Stock deducted'
    }, transaction);

    await stockTransactionRepository.create({
      product_id: productId,
      transaction_type: 'out',
      qty,
      source_ref: sourceRef || 'sale',
      performed_by: performedBy,
      notes: notes || 'Stock decrease'
    }, transaction);

    return { ...product, current_stock_qty: newStock };
  }

  static async validateStock(productId, qty, transaction = null) {
    const product = await productRepository.findById(productId, { transaction });
    if (!product) return false;
    return parseInt(product.current_stock_qty || 0, 10) >= parseInt(qty, 10);
  }
}

module.exports = StockService;