import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Seller from './src/models/Seller.js';
import Restaurant from './src/models/restaurantModel.js';
import User from './src/models/userModel.js';

dotenv.config();

const checkDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('=== ALL USERS ===');
    const allUsers = await User.find();
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach((user, index) => {
      console.log(`\n--- User ${index + 1} ---`);
      console.log(`ID: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Restaurant: ${user.restaurant || 'NULL'}`);
    });

    console.log('\n=== SELLERS IN USER MODEL ===');
    const userSellers = await User.find({ role: 'seller' });
    console.log(`Found ${userSellers.length} users with seller role:`);
    userSellers.forEach((user, index) => {
      console.log(`\n--- User Seller ${index + 1} ---`);
      console.log(`ID: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Restaurant: ${user.restaurant || 'NULL'}`);
    });

    console.log('\n=== ALL SELLERS (SELLER MODEL) ===');
    const allSellers = await Seller.find();
    console.log(`Found ${allSellers.length} sellers:`);
    allSellers.forEach((seller, index) => {
      console.log(`\n--- Seller ${index + 1} ---`);
      console.log(`ID: ${seller._id}`);
      console.log(`Name: ${seller.name}`);
      console.log(`Email: ${seller.email}`);
      console.log(`Restaurant: ${seller.restaurant ? seller.restaurant.toString() : 'NULL'}`);
    });

  } catch (error) {
    console.error('Error checking database:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

checkDatabase();