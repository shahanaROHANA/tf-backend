import mongoose from 'mongoose';
import Seller from './src/models/Seller.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

const approveSellerByEmail = async (email) => {
  try {
    console.log(`🔍 Looking for seller with email: ${email}`);
    
    const seller = await Seller.findOne({ email });
    if (!seller) {
      console.log('❌ Seller not found');
      return;
    }
    
    console.log(`📋 Found seller: ${seller.name} (${seller.email})`);
    console.log(`📊 Current approval status: ${seller.isApproved ? 'Approved' : 'Not Approved'}`);
    
    seller.isApproved = true;
    await seller.save();
    
    console.log('✅ Seller approved successfully!');
    console.log(`📋 Updated seller: ${seller.name} (${seller.email})`);
    console.log(`📊 New approval status: ${seller.isApproved ? 'Approved' : 'Not Approved'}`);
    
  } catch (err) {
    console.error('❌ Error approving seller:', err);
  }
};

const main = async () => {
  await connectDB();
  
  // Approve the specific seller
  await approveSellerByEmail('roopanshakana@gmail.com');
  
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed');
};

main();