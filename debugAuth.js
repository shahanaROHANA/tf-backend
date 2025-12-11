import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Seller from './src/models/Seller.js';
import User from './src/models/userModel.js';

dotenv.config();

// Test token for debugging - replace with a real token from the frontend
const testToken = 'REPLACE_WITH_REAL_TOKEN';

const debugAuth = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('=== DEBUGGING AUTHENTICATION ===');
    
    if (!testToken || testToken === 'REPLACE_WITH_REAL_TOKEN') {
      console.log('Please set a real token in the testToken variable');
      console.log('You can get a token by logging in from the frontend and copying it from localStorage');
      return;
    }

    const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // First try to find as Seller (for approved sellers)
    let seller = await Seller.findById(decoded.id).select('-password');
    console.log('Found in Seller model:', seller ? 'YES' : 'NO');
    
    if (seller) {
      console.log('Seller details:');
      console.log('- ID:', seller._id);
      console.log('- Name:', seller.name);
      console.log('- Email:', seller.email);
      console.log('- Restaurant:', seller.restaurant);
      console.log('- Restaurant populated:', seller.restaurant ? 'YES' : 'NO');
    }

    // If not found in Seller model, try User model (for newly registered sellers)
    if (!seller) {
      console.log('Not found in Seller model, checking User model...');
      const user = await User.findById(decoded.id).select('-passwordHash');
      console.log('Found in User model:', user ? 'YES' : 'NO');
      
      if (user) {
        console.log('User details:');
        console.log('- ID:', user._id);
        console.log('- Name:', user.name);
        console.log('- Email:', user.email);
        console.log('- Role:', user.role);
        console.log('- Restaurant:', user.restaurant);
      }
    }

    // Check all users with seller role
    console.log('\n=== ALL USERS WITH SELLER ROLE ===');
    const sellerUsers = await User.find({ role: 'seller' });
    console.log(`Found ${sellerUsers.length} users with seller role:`);
    sellerUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`- ID: ${user._id}`);
      console.log(`- Name: ${user.name}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Restaurant: ${user.restaurant || 'NULL'}`);
    });

    // Check all sellers
    console.log('\n=== ALL SELLERS ===');
    const allSellers = await Seller.find();
    console.log(`Found ${allSellers.length} sellers:`);
    allSellers.forEach((seller, index) => {
      console.log(`Seller ${index + 1}:`);
      console.log(`- ID: ${seller._id}`);
      console.log(`- Name: ${seller.name}`);
      console.log(`- Email: ${seller.email}`);
      console.log(`- Restaurant: ${seller.restaurant || 'NULL'}`);
    });

  } catch (error) {
    console.error('Error debugging auth:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

debugAuth();