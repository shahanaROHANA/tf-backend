import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/userModel.js';

dotenv.config();

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trainfood');
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@trainfood.com' });
    
    if (!admin) {
      console.log('❌ Admin user not found');
    } else {
      console.log('✅ Admin user found:');
      console.log('Email:', admin.email);
      console.log('Name:', admin.name);
      console.log('Role:', admin.role);
      console.log('Password Hash exists:', !!admin.passwordHash);
      console.log('Created at:', admin.createdAt);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmin();
