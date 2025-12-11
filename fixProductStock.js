import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/productModel.js';

dotenv.config();

const fixStockValues = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find products with null or undefined stock
    const productsWithNoStock = await Product.find({ 
      $or: [
        { stock: null },
        { stock: { $exists: false } }
      ]
    });

    console.log(`Found ${productsWithNoStock.length} products with no stock`);

    if (productsWithNoStock.length > 0) {
      // Set default stock of 50 for products without stock
      const result = await Product.updateMany(
        { 
          $or: [
            { stock: null },
            { stock: { $exists: false } }
          ]
        },
        { stock: 50 }
      );
      
      console.log(`Updated ${result.modifiedCount} products with default stock of 50`);
    }

    // Show current stock status
    const allProducts = await Product.find({}).select('name stock available');
    console.log('\nCurrent Product Stock Status:');
    console.log('=' .repeat(50));
    
    allProducts.forEach(product => {
      const stockStatus = product.stock === null ? 'Unlimited' : 
                         product.stock === undefined ? 'No Stock' : 
                         product.stock.toString();
      const availability = product.available ? 'Available' : 'Not Available';
      console.log(`${product.name.padEnd(25)} | Stock: ${stockStatus.padEnd(10)} | ${availability}`);
    });

    console.log('\nStock values fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing stock values:', error);
    process.exit(1);
  }
};

fixStockValues();