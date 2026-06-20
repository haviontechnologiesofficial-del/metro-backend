const path = require('path');
require('dotenv').config();
const { Product, StockHistory } = require('./src/models');

async function run() {
  try {
    const products = await Product.findAll();
    console.log("=== PRODUCTS ===");
    products.forEach(p => {
      console.log(`ID: ${p.id} | Name: ${p.name} | SKU: ${p.sku_code} | Initial: ${p.initial_stock_qty} | Current: ${p.current_stock_qty}`);
    });

    const history = await StockHistory.findAll();
    console.log("\n=== STOCK HISTORY ===");
    history.forEach(h => {
      console.log(`ID: ${h.id} | ProductID: ${h.product_id} | Qty: ${h.qty} | Remaining: ${h.remaining_stock} | Type: ${h.change_type} | Notes: ${h.notes}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
