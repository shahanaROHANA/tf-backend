import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/productModel.js';

dotenv.config();

const sampleProducts = [
  {
    name: "Veg Biryani",
    description: "Fragrant basmati rice cooked with mixed vegetables and aromatic spices",
    priceCents: 18000, // ₹180.00
    available: true,
    station: "Kilinochchi",
    stock: 50
  },
  {
    name: "Chicken Fried Rice",
    description: "Stir-fried rice with chicken, vegetables, and savory sauces",
    priceCents: 20000, // ₹200.00
    available: true,
    station: "Chavakachcheri",
    stock: 30
  },
  {
    name: "Masala Dosa",
    description: "Crispy rice crepe filled with spiced potato mixture",
    priceCents: 12000, // ₹120.00
    available: true,
    station: "Kilinochchi",
    stock: 40
  },
  {
    name: "Paneer Butter Masala",
    description: "Soft cottage cheese cubes in rich, creamy tomato gravy",
    priceCents: 22000, // ₹220.00
    available: true,
    station: "Kilinochchi",
    stock: 25
  },
  {
    name: "Hyderabadi Biryani",
    description: "Authentic dum-cooked biryani with aromatic basmati rice",
    priceCents: 25000, // ₹250.00
    available: true,
    station: "Meesalai",
    stock: 35
  },
  {
    name: "Vada Pav",
    description: "Spicy potato fritter sandwiched in a bun with chutneys",
    priceCents: 8000, // ₹80.00
    available: true,
    station: "Kodikamam",
    stock: 60
  },
  {
    name: "Chole Bhature",
    description: "Spicy chickpea curry served with fluffy fried bread",
    priceCents: 15000, // ₹150.00
    available: true,
    station: "Kilinochchi",
    stock: 45
  },
  {
    name: "Fresh Fruit Juice",
    description: "Refreshing mixed fruit juice with no added sugar",
    priceCents: 6000, // ₹60.00
    available: true,
    station: "Kilinochchi",
    stock: 100
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert sample products
    await Product.insertMany(sampleProducts);
    console.log('Sample products added successfully');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
