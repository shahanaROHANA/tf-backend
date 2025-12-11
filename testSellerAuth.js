import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './src/models/userModel.js';
import Seller from './src/models/Seller.js';
import Restaurant from './src/models/restaurantModel.js';

dotenv.config();

// Test seller login and product creation
const testSellerAuth = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('=== TESTING SELLER AUTHENTICATION ===');

    // Test the seller "hary@gmail.com"
    const sellerEmail = 'hary@gmail.com';
    const sellerPassword = 'password123'; // Default password for new users

    console.log(`\n--- Testing login for ${sellerEmail} ---`);

    // Check if user exists and get their details
    const user = await User.findOne({ email: sellerEmail });
    if (!user) {
      console.log(`User ${sellerEmail} not found`);
      return;
    }

    console.log(`Found user: ${user.name} (${user.role})`);
    console.log(`Password hash exists: ${user.passwordHash ? 'YES' : 'NO'}`);

    // If password hash doesn't exist, we need to set one
    if (!user.passwordHash) {
      console.log('Setting password hash for user...');
      const hash = await bcrypt.hash(sellerPassword, 10);
      user.passwordHash = hash;
      await user.save();
      console.log('Password hash set successfully');
    }

    // Test password verification
    const passwordValid = await bcrypt.compare(sellerPassword, user.passwordHash);
    console.log(`Password valid: ${passwordValid ? 'YES' : 'NO'}`);

    if (!passwordValid) {
      console.log(`Trying to reset password for ${sellerEmail}...`);
      const hash = await bcrypt.hash(sellerPassword, 10);
      user.passwordHash = hash;
      await user.save();
      console.log('Password reset successfully');
    }

    // Generate token like the login system
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log(`Generated token: ${token.substring(0, 20)}...`);

    // Now test the middleware logic
    console.log('\n--- Testing middleware logic ---');

    // Try to find in Seller model first
    let seller = await Seller.findOne({ email: sellerEmail }).select('-password');
    if (seller) {
      console.log(`✅ Found in Seller model: ${seller.name}`);
      console.log(`Restaurant: ${seller.restaurant ? seller.restaurant.toString() : 'NULL'}`);
    } else {
      console.log(`❌ Not found in Seller model`);
    }

    // If not found in Seller model, try User model
    if (!seller) {
      const userFromDb = await User.findById(user._id);
      if (userFromDb && userFromDb.role === 'seller') {
        console.log(`Found in User model with seller role`);
        seller = {
          _id: userFromDb._id,
          name: userFromDb.name,
          email: userFromDb.email,
          role: 'seller',
          isApproved: true,
          station: 'Default Station'
        };
        console.log(`⚠️  Seller object from User model (no restaurant)`);
      }
    }

    // Test product creation
    console.log('\n--- Testing product creation logic ---');
    if (!seller) {
      console.log('❌ No seller object found');
      return;
    }

    // This simulates what happens in createSellerProduct
    console.log(`Seller object restaurant field: ${seller.restaurant ? seller.restaurant.toString() : 'NULL'}`);
    
    if (!seller.restaurant) {
      console.log('❌ ERROR: Seller restaurant not found (this is the original error!)');
      console.log('This is why the product creation fails.');
    } else {
      console.log('✅ Seller has restaurant - product creation should work');
    }

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Error testing seller auth:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

testSellerAuth();