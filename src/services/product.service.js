const BaseService = require('./base.service');
const { productRepository } = require('../repositories');
const stockService = require('./stock.service');

class ProductService extends BaseService {
  constructor() {
    super(productRepository, 'PRODUCT');
  }

  async create(data, req, transaction = null) {
    const initialStock = parseInt(data.initial_stock_qty || 0, 10);
    data.current_stock_qty = 0;

    const product = await super.create(data, req, transaction);

    if (initialStock > 0) {
      await stockService.addStock({
        productId: product.id,
        qty: initialStock,
        imei_1: product.imei_1,
        imei_2: product.imei_2,
        sourceRef: 'initial_stock',
        performedBy: req.user ? req.user.id : null,
        notes: 'Initial stock register'
      }, transaction);

      if (product.supplier_id && product.cost_price > 0) {
        const supplierService = require('./supplier.service');
        const costAmount = parseFloat(product.cost_price) * initialStock;
        await supplierService.increasePending({
          supplierId: product.supplier_id,
          amount: costAmount,
          referenceType: 'purchase_stock',
          referenceId: product.id,
          notes: `Initial stock purchase of ${initialStock} x ${product.name} (SKU: ${product.sku_code || 'N/A'})`
        }, transaction);
      }
    }

    return product;
  }

  async findById(id, options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'categories' }, as: 'category' },
      { model: { tableName: 'brands' }, as: 'brand' },
      { model: { tableName: 'suppliers' }, as: 'supplier' }
    ];
    return await super.findById(id, { ...options, includes });
  }

  async list(options = {}) {
    const includes = options.includes || [
      { model: { tableName: 'categories' }, as: 'category' },
      { model: { tableName: 'brands' }, as: 'brand' },
      { model: { tableName: 'suppliers' }, as: 'supplier' }
    ];
    return await super.list({ ...options, includes });
  }
}

module.exports = new ProductService();