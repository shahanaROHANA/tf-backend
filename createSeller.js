import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Seller from './src/models/Seller.js';
import Restaurant from './src/models/restaurantModel.js';

dotenv.config();

const createSeller = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the restaurant
    const restaurant = await Restaurant.findOne({ name: 'Lovely Cream House', station: 'Chavakachcheri Station' });
    if (!restaurant) {
      console.error('Lovely Cream House restaurant not found');
      return;
    }

    const seller = await Seller.create({
      name: 'Lovely Cream Seller',
      email: 'lovely@test.com',
      password: 'password123',
      restaurant: restaurant._id,
      restaurantName: 'Lovely Cream House',
      station: 'Chavakachcheri Station',
      phone: '1234567890',
      isActive: true,
      isApproved: true
    });

    console.log('Seller created:', seller);
    console.log('Login credentials:');
    console.log('Email: seller@test.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('Error creating seller:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createSeller();