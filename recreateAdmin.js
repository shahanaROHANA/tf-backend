import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/userModel.js';

dotenv.config();

const recreateAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trainfood');
    console.log('Connected to MongoDB');

    // Delete existing admin
    console.log('Deleting existing admin user...');
    await User.deleteOne({ email: 'admin@trainfood.com' });

    // Create new admin user with bcryptjs
    console.log('Creating new admin user with bcryptjs...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    const admin = new User({
      name: 'Admin User',
      email: 'admin@trainfood.com',
      passwordHash,
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Admin user recreated successfully!');
    console.log('Email: admin@trainfood.com');
    console.log('Password: admin123');
    
    // Test the password
    const testUser = await User.findOne({ email: 'admin@trainfood.com' });
    const isMatch = await bcrypt.compare('admin123', testUser.passwordHash);
    console.log('✅ Password verification test:', isMatch);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

recreateAdmin();
