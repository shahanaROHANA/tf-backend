import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch'; // Add this if not available
import User from './src/models/userModel.js';
import Seller from './src/models/Seller.js';
import Restaurant from './src/models/restaurantModel.js';

dotenv.config();

// Test the complete product creation flow
const testProductCreation = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('=== TESTING COMPLETE PRODUCT CREATION FLOW ===');

    // Step 1: Login as seller
    const sellerEmail = 'hary@gmail.com';
    const sellerPassword = 'password123';

    console.log('\n--- Step 1: Seller Login ---');
    
    const loginResponse = await fetch('http://localhost:4004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: sellerEmail,
        password: sellerPassword,
      }),
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log(`❌ Login failed: ${JSON.stringify(loginData)}`);
      return;
    }

    console.log(`✅ Login successful for ${loginData.user.name}`);
    console.log(`Token: ${loginData.token.substring(0, 20)}...`);
    
    const token = loginData.token;

    // Step 2: Try to create a product
    console.log('\n--- Step 2: Create Product ---');

    const productData = {
      name: 'Test Product',
      description: 'This is a test product to verify the fix',
      priceCents: 2500, // ₹25.00
      category: 'Veg',
      stock: 10,
      deliveryTimeEstimate: '15 mins',
      imageUrl: 'https://example.com/test-image.jpg'
    };

    console.log('Product data:', productData);

    const createProductResponse = await fetch('http://localhost:4004/api/seller/dashboard/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    const createProductData = await createProductResponse.json();

    console.log(`Response status: ${createProductResponse.status}`);
    console.log('Response data:', createProductData);

    if (createProductResponse.ok) {
      console.log('✅ Product created successfully!');
      console.log(`Product ID: ${createProductData._id}`);
      console.log(`Restaurant: ${createProductData.restaurantName || 'Unknown'}`);
    } else {
      console.log(`❌ Product creation failed: ${createProductData.message}`);
      
      // If we get the restaurant not found error, the fix didn't work
      if (createProductData.message === 'Seller restaurant not found') {
        console.log('❌ The restaurant association fix is still not working!');
        console.log('This suggests the seller is being authenticated via User model instead of Seller model');
      }
    }

    // Step 3: Test product listing
    console.log('\n--- Step 3: List Products ---');

    const listProductsResponse = await fetch('http://localhost:4004/api/seller/dashboard/products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const listProductsData = await listProductsResponse.json();

    console.log(`List products response status: ${listProductsResponse.status}`);
    
    if (listProductsResponse.ok) {
      console.log(`✅ Found ${listProductsData.products.length} products`);
      listProductsData.products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} - ₹${(product.priceCents / 100).toFixed(2)}`);
      });
    } else {
      console.log(`❌ Failed to list products: ${JSON.stringify(listProductsData)}`);
    }

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Error testing product creation:', error.message);
    
    // If it's a network error, give helpful message
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on http://localhost:4004');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

testProductCreation();