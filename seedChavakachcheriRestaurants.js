// // Comprehensive seed script for Chavakachcheri Station restaurants and menus
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';

// // Import models
// import Restaurant from './src/models/restaurantModel.js';
// import Product from './src/models/productModel.js';

// // Load environment variables
// dotenv.config();

// const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trainfood';

// async function seedChavakachcheriRestaurants() {
//   try {
//     await mongoose.connect(mongodbUri);
//     console.log('Connected to MongoDB');

//     // Clear existing restaurants for Chavakachcheri to avoid duplicates
//     await Restaurant.deleteMany({ station: 'Chavakachcheri Station' });
//     await Product.deleteMany({ station: 'Chavakachcheri Station' });
//     console.log('Cleared existing Chavakachcheri restaurants and products');

//     // Define restaurants for Chavakachcheri Station
//     const restaurants = [
//       {
//         name: 'Lovely Cream House',
//         station: 'Chavakachcheri Station',
//         description: 'Popular fast-food restaurant specializing in kottu, fried rice, noodles, pizza and desserts',
//         imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=250&fit=crop&crop=center',
//         isActive: true,
//         cuisineType: 'Mixed',
//         deliveryTimeEstimate: '25 mins',
//         rating: 4.2
//       },
//       {
//         name: 'KBC Restaurant',
//         station: 'Chavakachcheri Station',
//         description: 'Specialized BBQ restaurant with grilled meats and traditional flavors',
//         imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
//         isActive: true,
//         cuisineType: 'Non-Veg',
//         deliveryTimeEstimate: '30 mins',
//         rating: 4.5
//       },
//       {
//         name: 'Jaffna Kitchen',
//         station: 'Chavakachcheri Station',
//         description: 'Traditional Jaffna cuisine with authentic kottu and biriyani specialties',
//         imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop&crop=center',
//         isActive: true,
//         cuisineType: 'Mixed',
//         deliveryTimeEstimate: '20 mins',
//         rating: 4.1
//       },
//       {
//         name: 'Arul Restaurant',
//         station: 'Chavakachcheri Station',
//         description: 'Family restaurant known for authentic kottu varieties and traditional dishes',
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         isActive: true,
//         cuisineType: 'Mixed',
//         deliveryTimeEstimate: '25 mins',
//         rating: 4.3
//       },
//       {
//         name: 'Chavakachcheri KFC',
//         station: 'Chavakachcheri Station',
//         description: 'International fried chicken chain with signature spices and crispy goodness',
//         imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
//         isActive: true,
//         cuisineType: 'Non-Veg',
//         deliveryTimeEstimate: '20 mins',
//         rating: 4.4
//       }
//     ];

//     // Create restaurants
//     const createdRestaurants = await Restaurant.insertMany(restaurants);
//     console.log(`✅ Created ${createdRestaurants.length} restaurants`);

//     // Find restaurant IDs for menu items
//     const lovelyCream = createdRestaurants.find(r => r.name === 'Lovely Cream House');
//     const kbcRestaurant = createdRestaurants.find(r => r.name === 'KBC Restaurant');
//     const jaffnaKitchen = createdRestaurants.find(r => r.name === 'Jaffna Kitchen');
//     const arulRestaurant = createdRestaurants.find(r => r.name === 'Arul Restaurant');
//     const kfcRestaurant = createdRestaurants.find(r => r.name === 'Chavakachcheri KFC');

//     // Define menu items for each restaurant
//     const menuItems = [
//       // Lovely Cream House Menu
//       {
//         name: 'Chicken Kottu',
//         description: 'Traditional Sri Lankan chicken kottu with vegetables and curry sauce',
//         priceCents: 38000, // Rs. 380
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '15 mins'
//       },
//       {
//         name: 'Mutton Kottu',
//         description: 'Spicy mutton kottu with herbs and traditional spices',
//         priceCents: 42000, // Rs. 420
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '18 mins'
//       },
//       {
//         name: 'Beef Kottu',
//         description: 'Tender beef kottu with mixed vegetables',
//         priceCents: 40000, // Rs. 400
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '18 mins'
//       },
//       {
//         name: 'Vegetable Kottu',
//         description: 'Mixed vegetable kottu with tofu and spices',
//         priceCents: 32000, // Rs. 320
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '12 mins'
//       },
//       {
//         name: 'Chicken Fried Rice',
//         description: 'Wok-fried rice with chicken pieces and vegetables',
//         priceCents: 35000, // Rs. 350
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '15 mins'
//       },
//       {
//         name: 'Seafood Fried Rice',
//         description: 'Fresh seafood fried rice with prawns and fish',
//         priceCents: 45000, // Rs. 450
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '20 mins'
//       },
//       {
//         name: 'Mutton Fried Rice',
//         description: 'Fragrant fried rice with tender mutton pieces',
//         priceCents: 42000, // Rs. 420
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '18 mins'
//       },
//       {
//         name: 'Chicken Noodles',
//         description: 'Stir-fried noodles with chicken and vegetables',
//         priceCents: 34000, // Rs. 340
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '12 mins'
//       },
//       {
//         name: 'Vegetable Noodles',
//         description: 'Mixed vegetable noodles with soy sauce',
//         priceCents: 30000, // Rs. 300
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '10 mins'
//       },
//       {
//         name: 'Egg Noodles',
//         description: 'Classic egg noodles with vegetables',
//         priceCents: 28000, // Rs. 280
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '10 mins'
//       },
//       {
//         name: 'Chicken Pizza',
//         description: 'Wood-fired pizza with chicken and cheese',
//         priceCents: 48000, // Rs. 480
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '25 mins'
//       },
//       {
//         name: 'Cheese Pizza',
//         description: 'Classic cheese pizza with tomato sauce',
//         priceCents: 42000, // Rs. 420
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '25 mins'
//       },
//       {
//         name: 'Chocolate Cake',
//         description: 'Rich chocolate cake with frosting',
//         priceCents: 25000, // Rs. 250
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '5 mins'
//       },
//       {
//         name: 'Chicken Biriyani',
//         description: 'Traditional chicken biriyani with spices and herbs',
//         priceCents: 45000, // Rs. 450
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d7d7?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '20 mins'
//       },
//       {
//         name: 'Mutton Biriyani',
//         description: 'Aromatic mutton biriyani with basmati rice',
//         priceCents: 50000, // Rs. 500
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d7d7?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '25 mins'
//       },
//       {
//         name: 'Egg Roll',
//         description: 'Crispy egg roll with vegetables',
//         priceCents: 15000, // Rs. 150
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '8 mins'
//       },
//       {
//         name: 'Chicken Roll',
//         description: 'Spicy chicken roll with sauce',
//         priceCents: 18000, // Rs. 180
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: lovelyCream._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '10 mins'
//       },

//       // KBC Restaurant BBQ Menu
//       {
//         name: 'BBQ Chicken Grill',
//         description: 'Grilled chicken with BBQ sauce and spices',
//         priceCents: 52000, // Rs. 520
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kbcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '25 mins'
//       },
//       {
//         name: 'BBQ Mutton',
//         description: 'Tender mutton pieces grilled with BBQ sauce',
//         priceCents: 58000, // Rs. 580
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kbcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '30 mins'
//       },
//       {
//         name: 'BBQ Prawns',
//         description: 'Fresh prawns grilled with garlic and herbs',
//         priceCents: 62000, // Rs. 620
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kbcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '20 mins'
//       },
//       {
//         name: 'BBQ Fish',
//         description: 'Fresh fish fillet grilled with lemon and spices',
//         priceCents: 55000, // Rs. 550
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kbcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '25 mins'
//       },
//       {
//         name: 'BBQ Wings',
//         description: 'Spicy chicken wings with BBQ glaze',
//         priceCents: 48000, // Rs. 480
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kbcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '20 mins'
//       },

//       // Jaffna Kitchen Menu
//       {
//         name: 'Jaffna Chicken Kottu',
//         description: 'Authentic Jaffna-style chicken kottu with special spices',
//         priceCents: 40000, // Rs. 400
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: jaffnaKitchen._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '18 mins'
//       },
//       {
//         name: 'Dolphin Kottu',
//         description: 'Traditional dolphin fish kottu with Jaffna spices',
//         priceCents: 45000, // Rs. 450
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: jaffnaKitchen._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '20 mins'
//       },
//       {
//         name: 'Jaffna Fried Rice',
//         description: 'Special fried rice with Jaffna spices and vegetables',
//         priceCents: 38000, // Rs. 380
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: jaffnaKitchen._id,
//         imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '15 mins'
//       },
//       {
//         name: 'Chicken Biriyani',
//         description: 'Jaffna-style chicken biriyani with aromatic rice',
//         priceCents: 48000, // Rs. 480
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: jaffnaKitchen._id,
//         imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d7d7?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '22 mins'
//       },

//       // Arul Restaurant Menu
//       {
//         name: 'Mutton Kottu',
//         description: 'Traditional mutton kottu with Jaffna spices',
//         priceCents: 43000, // Rs. 430
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: arulRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '20 mins'
//       },
//       {
//         name: 'Beef Kottu',
//         description: 'Tender beef kottu with mixed vegetables',
//         priceCents: 41000, // Rs. 410
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: arulRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '18 mins'
//       },
//       {
//         name: 'Chicken Kottu',
//         description: 'Classic chicken kottu with vegetables',
//         priceCents: 37000, // Rs. 370
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: arulRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '15 mins'
//       },
//       {
//         name: 'Egg Kottu',
//         description: 'Simple egg kottu with onions and tomatoes',
//         priceCents: 30000, // Rs. 300
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: arulRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '12 mins'
//       },
//       {
//         name: 'Arul Fried Rice',
//         description: 'House special fried rice with vegetables',
//         priceCents: 36000, // Rs. 360
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: arulRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '15 mins'
//       },
//       {
//         name: 'Arul Biriyani',
//         description: 'Traditional biriyani with aromatic rice and spices',
//         priceCents: 46000, // Rs. 460
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: arulRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d7d7?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '22 mins'
//       },

//       // KFC Menu Items
//       {
//         name: 'Original Recipe Chicken',
//         description: 'Crispy golden chicken with secret blend of 11 herbs and spices',
//         priceCents: 32000, // Rs. 320
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '15 mins'
//       },
//       {
//         name: 'Extra Crispy Chicken',
//         description: 'Double-crisped chicken with extra crunch and flavor',
//         priceCents: 34000, // Rs. 340
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '15 mins'
//       },
//       {
//         name: 'Chicken Tenders',
//         description: 'Juicy chicken tenders with your choice of sauce',
//         priceCents: 28000, // Rs. 280
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '12 mins'
//       },
//       {
//         name: 'Chicken Wings',
//         description: 'Spicy chicken wings with Buffalo or BBQ sauce',
//         priceCents: 38000, // Rs. 380
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '18 mins'
//       },
//       {
//         name: 'Chicken Bucket - 8 Pieces',
//         description: 'Family bucket with 8 pieces of Original Recipe chicken',
//         priceCents: 220000, // Rs. 2200
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '25 mins'
//       },
//       {
//         name: 'Chicken Bucket - 12 Pieces',
//         description: 'Large family bucket with 12 pieces of chicken',
//         priceCents: 320000, // Rs. 3200
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '30 mins'
//       },
//       {
//         name: 'Zinger Burger',
//         description: 'Crispy chicken burger with lettuce and mayo',
//         priceCents: 42000, // Rs. 420
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '10 mins'
//       },
//       {
//         name: 'Chicken Wrap',
//         description: 'Grilled chicken wrap with vegetables and sauce',
//         priceCents: 38000, // Rs. 380
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '12 mins'
//       },
//       {
//         name: 'Chicken Rice Bowl',
//         description: 'Rice bowl with crispy chicken and vegetables',
//         priceCents: 36000, // Rs. 360
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Non-Veg',
//         deliveryTimeEstimate: '15 mins'
//       },
//       {
//         name: 'Coleslaw',
//         description: 'Fresh coleslaw salad with creamy dressing',
//         priceCents: 15000, // Rs. 150
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '5 mins'
//       },
//       {
//         name: 'French Fries',
//         description: 'Crispy golden french fries with salt',
//         priceCents: 18000, // Rs. 180
//         available: true,
//         isActive: true,
//         station: 'Chavakachcheri Station',
//         restaurant: kfcRestaurant._id,
//         imageUrl: 'https://images.unsplash.com/photo-1630384082454-19ba40f64c48?w=400&h=250&fit=crop&crop=center',
//         stock: null,
//         category: 'Veg',
//         deliveryTimeEstimate: '8 mins'
//       }
//     ];

//     // Create menu items
//     const createdProducts = await Product.insertMany(menuItems);
//     console.log(`✅ Created ${createdProducts.length} menu items`);

//     // Summary
//     console.log('\n🎉 SUCCESS! Chavakachcheri Station restaurants and menus seeded:');
//     console.log('\n🏪 RESTAURANTS:');
//     createdRestaurants.forEach(restaurant => {
//       const itemCount = createdProducts.filter(p => p.restaurant.toString() === restaurant._id.toString()).length;
//       console.log(`  ✅ ${restaurant.name} (${itemCount} menu items)`);
//     });

//     console.log('\n🍽️ MENU SUMMARY:');
//     console.log(`  🥘 Lovely Cream House: ${menuItems.filter(m => m.restaurant && m.restaurant.toString() === lovelyCream._id.toString()).length} items`);
//     console.log(`  🔥 KBC Restaurant: ${menuItems.filter(m => m.restaurant && m.restaurant.toString() === kbcRestaurant._id.toString()).length} items`);
//     console.log(`  🍛 Jaffna Kitchen: ${menuItems.filter(m => m.restaurant && m.restaurant.toString() === jaffnaKitchen._id.toString()).length} items`);
//     console.log(`  🍜 Arul Restaurant: ${menuItems.filter(m => m.restaurant && m.restaurant.toString() === arulRestaurant._id.toString()).length} items`);
//     console.log(`  🍗 KFC: ${menuItems.filter(m => m.restaurant && m.restaurant.toString() === kfcRestaurant._id.toString()).length} items`);

//     console.log('\n🎯 Total items created:', createdProducts.length);

//   } catch (error) {
//     console.error('Error seeding Chavakachcheri restaurants:', error);
//   } finally {
//     await mongoose.connection.close();
//     console.log('\nDatabase connection closed');
//   }
// }

// // Run the seeding script
// seedChavakachcheriRestaurants();


// seedChavakachcheri.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/restaurantModel.js';
import Product from './src/models/productModel.js';

dotenv.config();
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trainfood';

async function seedChavakachcheriRestaurants() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB');

    // Remove only Chavakachcheri records (restaurants + products)
    await Restaurant.deleteMany({ station: 'Chavakachcheri Station' });
    await Product.deleteMany({ station: 'Chavakachcheri Station' });
    console.log('Cleared existing Chavakachcheri restaurants and products');

    // Restaurants to create
    const restaurantsData = [
      {
        name: 'Lovely Cream House',
        station: 'Chavakachcheri Station',
        description: 'Popular fast-food restaurant specializing in kottu, fried rice, noodles, pizza and desserts',
        imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=250&fit=crop&crop=center',
        isActive: true,
        cuisineType: 'Mixed',
        deliveryTimeEstimate: '25 mins',
        rating: 4.2
      },
      {
        name: 'KBC Restaurant',
        station: 'Chavakachcheri Station',
        description: 'Specialized BBQ restaurant with grilled meats and traditional flavors',
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
        isActive: true,
        cuisineType: 'Non-Veg',
        deliveryTimeEstimate: '30 mins',
        rating: 4.5
      },
      {
        name: 'Jaffna Kitchen',
        station: 'Chavakachcheri Station',
        description: 'Traditional Jaffna cuisine with authentic kottu and biriyani specialties',
        imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop&crop=center',
        isActive: true,
        cuisineType: 'Mixed',
        deliveryTimeEstimate: '20 mins',
        rating: 4.1
      },
      {
        name: 'Arul Restaurant',
        station: 'Chavakachcheri Station',
        description: 'Family restaurant known for authentic kottu varieties and traditional dishes',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
        isActive: true,
        cuisineType: 'Mixed',
        deliveryTimeEstimate: '25 mins',
        rating: 4.3
      },
      {
        name: 'Chavakachcheri KFC',
        station: 'Chavakachcheri Station',
        description: 'International fried chicken chain with signature spices and crispy goodness',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
        isActive: true,
        cuisineType: 'Non-Veg',
        deliveryTimeEstimate: '20 mins',
        rating: 4.4
      }
    ];

    const createdRestaurants = await Restaurant.insertMany(restaurantsData);
    console.log(`✅ Created ${createdRestaurants.length} restaurants`);

    // find by name (safe because we just inserted)
    const get = name => createdRestaurants.find(r => r.name === name);

    // Build menu arrays per restaurant (each item references only its restaurant)
    const lovelyMenu = [
      {
        name: 'Chicken Kottu',
        description: 'Traditional Sri Lankan chicken kottu with vegetables and curry sauce',
        priceCents: 38000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Lovely Cream House')._id,
        restaurantName: get('Lovely Cream House').name,
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Non-Veg',
        deliveryTimeEstimate: '15 mins'
      },
      // ... (other Lovely items)
      {
        name: 'Vegetable Kottu',
        description: 'Mixed vegetable kottu with tofu and spices',
        priceCents: 32000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Lovely Cream House')._id,
        restaurantName: get('Lovely Cream House').name,
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Veg',
        deliveryTimeEstimate: '12 mins'
      },
      {
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake with frosting',
        priceCents: 25000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Lovely Cream House')._id,
        restaurantName: get('Lovely Cream House').name,
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Veg',
        deliveryTimeEstimate: '5 mins'
      }
    ];

    const kbcMenu = [
      {
        name: 'BBQ Chicken Grill',
        description: 'Grilled chicken with BBQ sauce and spices',
        priceCents: 52000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('KBC Restaurant')._id,
        restaurantName: get('KBC Restaurant').name,
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Non-Veg',
        deliveryTimeEstimate: '25 mins'
      },
      {
        name: 'BBQ Prawns',
        description: 'Fresh prawns grilled with garlic and herbs',
        priceCents: 62000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('KBC Restaurant')._id,
        restaurantName: get('KBC Restaurant').name,
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675424462?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Non-Veg',
        deliveryTimeEstimate: '20 mins'
      }
    ];

    const jaffnaMenu = [
      {
        name: 'Jaffna Chicken Kottu',
        description: 'Authentic Jaffna-style chicken kottu with special spices',
        priceCents: 40000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Jaffna Kitchen')._id,
        restaurantName: get('Jaffna Kitchen').name,
        imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Non-Veg',
        deliveryTimeEstimate: '18 mins'
      },
      {
        name: 'Dolphin Kottu',
        description: 'Traditional dolphin fish kottu with Jaffna spices',
        priceCents: 45000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Jaffna Kitchen')._id,
        restaurantName: get('Jaffna Kitchen').name,
        imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Non-Veg',
        deliveryTimeEstimate: '20 mins'
      }
    ];

    const arulMenu = [
      {
        name: 'Arul Biriyani',
        description: 'Traditional biriyani with aromatic rice and spices',
        priceCents: 46000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Arul Restaurant')._id,
        restaurantName: get('Arul Restaurant').name,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d7d7?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Non-Veg',
        deliveryTimeEstimate: '22 mins'
      },
      {
        name: 'Egg Kottu',
        description: 'Simple egg kottu with onions and tomatoes',
        priceCents: 30000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Arul Restaurant')._id,
        restaurantName: get('Arul Restaurant').name,
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Veg',
        deliveryTimeEstimate: '12 mins'
      }
    ];

    const kfcMenu = [
      {
        name: 'Original Recipe Chicken',
        description: 'Crispy golden chicken with secret blend of 11 herbs and spices',
        priceCents: 32000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Chavakachcheri KFC')._id,
        restaurantName: get('Chavakachcheri KFC').name,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Non-Veg',
        deliveryTimeEstimate: '15 mins'
      },
      {
        name: 'French Fries',
        description: 'Crispy golden french fries with salt',
        priceCents: 18000,
        available: true,
        isActive: true,
        station: 'Chavakachcheri Station',
        restaurant: get('Chavakachcheri KFC')._id,
        restaurantName: get('Chavakachcheri KFC').name,
        imageUrl: 'https://images.unsplash.com/photo-1630384082454-19ba40f64c48?w=400&h=250&fit=crop&crop=center',
        stock: null,
        category: 'Veg',
        deliveryTimeEstimate: '8 mins'
      }
    ];

    // Combine only the grouped arrays - each product has correct restaurant id
    const allMenuItems = [
      ...lovelyMenu,
      ...kbcMenu,
      ...jaffnaMenu,
      ...arulMenu,
      ...kfcMenu
    ];

    // Insert products
    const createdProducts = await Product.insertMany(allMenuItems);
    console.log(`✅ Created ${createdProducts.length} menu items`);

    // Summary logging (counts by restaurant)
    console.log('\n🎉 SUCCESS! Chavakachcheri Station seeded with grouped menus:');
    createdRestaurants.forEach(restaurant => {
      const count = createdProducts.filter(p => p.restaurant.toString() === restaurant._id.toString()).length;
      console.log(`  • ${restaurant.name}: ${count} items`);
    });

  } catch (error) {
    console.error('Error seeding Chavakachcheri restaurants:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedChavakachcheriRestaurants();
