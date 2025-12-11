import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Seller from './src/models/Seller.js';
import Restaurant from './src/models/restaurantModel.js';

dotenv.config();

const checkSellers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('=== CHECKING SELLERS ===');
    const sellers = await Seller.find().select('-password').populate('restaurant');
    
    console.log(`Total sellers found: ${sellers.length}`);
    console.log('\nSeller details:');
    
    sellers.forEach((seller, index) => {
      console.log(`\n--- Seller ${index + 1} ---`);
      console.log(`Name: ${seller.name}`);
      console.log(`Email: ${seller.email}`);
      console.log(`Station: ${seller.station}`);
      console.log(`Restaurant Name: ${seller.restaurantName}`);
      console.log(`Restaurant Object: ${seller.restaurant ? seller.restaurant : 'NULL'}`);
      console.log(`Restaurant ID: ${seller.restaurant ? seller.restaurant._id : 'NULL'}`);
      console.log(`Has Restaurant: ${seller.restaurant ? 'YES' : 'NO'}`);
    });

    console.log('\n=== CHECKING RESTAURANTS ===');
    const restaurants = await Restaurant.find();
    console.log(`Total restaurants found: ${restaurants.length}`);
    restaurants.forEach((restaurant, index) => {
      console.log(`\n--- Restaurant ${index + 1} ---`);
      console.log(`Name: ${restaurant.name}`);
      console.log(`Station: ${restaurant.station}`);
      console.log(`ID: ${restaurant._id}`);
    });

    // Check for sellers without restaurants
    const sellersWithoutRestaurants = await Seller.find({ restaurant: null });
    console.log(`\n=== SELLERS WITHOUT RESTAURANTS ===`);
    console.log(`Count: ${sellersWithoutRestaurants.length}`);
    sellersWithoutRestaurants.forEach(seller => {
      console.log(`- ${seller.name} (${seller.email}) at ${seller.station}`);
    });

  } catch (error) {
    console.error('Error checking sellers:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkSellers();