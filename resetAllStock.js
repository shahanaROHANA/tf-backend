import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/productModel.js';

dotenv.config();

const resetAllStock = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Reset all products to have high stock (100) to avoid stock issues
    const result = await Product.updateMany(
      {},
      { stock: 100 }
    );
    
    console.log(`Reset stock for ${result.modifiedCount} products to 100`);

    // Show updated stock status for low-stock items
    const lowStockProducts = await Product.find({ stock: { $lt: 50 } }).select('name stock available');
    if (lowStockProducts.length > 0) {
      console.log('\nLow Stock Products:');
      lowStockProducts.forEach(product => {
        console.log(`${product.name}: ${product.stock}`);
      });
    } else {
      console.log('\n✅ All products now have sufficient stock (100)');
    }

    console.log('\nStock reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting stock:', error);
    process.exit(1);
  }
};

resetAllStock();