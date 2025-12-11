import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Seller from './src/models/Seller.js';
import Restaurant from './src/models/restaurantModel.js';
import User from './src/models/userModel.js';

dotenv.config();

const fixSellerRestaurant = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('=== FIXING SELLER RESTAURANT ASSOCIATIONS ===');

    // Find sellers in User model without restaurants
    const userSellers = await User.find({ role: 'seller' });
    console.log(`Found ${userSellers.length} seller users in User model`);

    for (const userSeller of userSellers) {
      console.log(`\n--- Processing seller user: ${userSeller.name} (${userSeller.email}) ---`);
      
      // Check if seller already exists in Seller model
      const existingSeller = await Seller.findOne({ email: userSeller.email });
      if (existingSeller) {
        console.log(`Seller already exists in Seller model: ${existingSeller._id}`);
        continue;
      }

      // Find an appropriate restaurant for the user
      // For now, let's use the first available restaurant
      const availableRestaurant = await Restaurant.findOne();
      if (!availableRestaurant) {
        console.log('No restaurants available in the database');
        return;
      }

      console.log(`Assigning to restaurant: ${availableRestaurant.name}`);

      // Create seller in Seller model
      const newSeller = await Seller.create({
        name: userSeller.name,
        email: userSeller.email,
        password: 'temp_password', // This won't be used since they login via User model
        restaurant: availableRestaurant._id,
        restaurantName: availableRestaurant.name,
        station: availableRestaurant.station,
        isActive: true,
        isApproved: true
      });

      console.log(`Created seller in Seller model: ${newSeller._id}`);
      console.log(`Restaurant: ${availableRestaurant.name}`);
    }

    console.log('\n=== MIGRATION COMPLETE ===');

    // Show summary
    console.log('\n=== FINAL STATE ===');
    
    const allUserSellers = await User.find({ role: 'seller' });
    const allModelSellers = await Seller.find();
    
    console.log(`User model sellers: ${allUserSellers.length}`);
    console.log(`Seller model sellers: ${allModelSellers.length}`);

    // Verify all User model sellers have corresponding Seller model entries
    for (const userSeller of allUserSellers) {
      const sellerModelEntry = await Seller.findOne({ email: userSeller.email });
      if (sellerModelEntry) {
        console.log(`✅ ${userSeller.name} - has Seller model entry with restaurant: ${sellerModelEntry.restaurant ? 'YES' : 'NO'}`);
      } else {
        console.log(`❌ ${userSeller.name} - missing Seller model entry`);
      }
    }

  } catch (error) {
    console.error('Error fixing seller restaurant:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

fixSellerRestaurant();