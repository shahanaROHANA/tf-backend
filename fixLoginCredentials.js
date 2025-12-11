import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/userModel.js';

dotenv.config();

// Fix login credentials for testing
const fixLoginCredentials = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('=== FIXING LOGIN CREDENTIALS ===');

    // List all users with their current password status
    const allUsers = await User.find();
    console.log(`\nFound ${allUsers.length} users:`);
    
    for (const user of allUsers) {
      console.log(`\n--- User: ${user.name} (${user.email}) ---`);
      console.log(`Role: ${user.role}`);
      console.log(`Has passwordHash: ${user.passwordHash ? 'YES' : 'NO'}`);
      
      // Set a default password for users without one
      if (!user.passwordHash) {
        const defaultPassword = 'password123';
        const hash = await bcrypt.hash(defaultPassword, 10);
        user.passwordHash = hash;
        await user.save();
        console.log(`✅ Set password for ${user.email} (password: ${defaultPassword})`);
      } else {
        // Reset password for users that might have corrupted hashes
        const testPassword = 'password123';
        const isValid = await bcrypt.compare(testPassword, user.passwordHash);
        console.log(`Password "password123" valid: ${isValid ? 'YES' : 'NO'}`);
        
        if (!isValid) {
          const newHash = await bcrypt.hash(testPassword, 10);
          user.passwordHash = newHash;
          await user.save();
          console.log(`✅ Reset password for ${user.email} (password: ${testPassword})`);
        }
      }
    }

    console.log('\n=== TESTING LOGIN CREDENTIALS ===');

    // Test login credentials that might be used
    const testCredentials = [
      { email: 'hary@gmail.com', password: 'password123', role: 'seller' },
      { email: 'seller@test.com', password: 'password123', role: 'seller' },
      { email: 'lovely@test.com', password: 'password123', role: 'seller' },
      { email: 'admin@trainfood.com', password: 'admin123', role: 'admin' },
      { email: 'admin@trainfood.com', password: 'password123', role: 'admin' },
    ];

    for (const cred of testCredentials) {
      const user = await User.findOne({ email: cred.email });
      if (user) {
        const isValid = await bcrypt.compare(cred.password, user.passwordHash);
        console.log(`${cred.email} (${cred.role}): ${isValid ? '✅ WORKING' : '❌ FAILED'} - password: "${cred.password}"`);
      } else {
        console.log(`${cred.email}: ❌ User not found`);
      }
    }

    console.log('\n=== CREDENTIAL SUMMARY ===');
    console.log('Use these credentials for testing:');
    console.log('📧 Seller: hary@gmail.com / password123');
    console.log('📧 Seller: seller@test.com / password123');
    console.log('📧 Admin: admin@trainfood.com / password123');
    console.log('\nIf any fail, check the database or reset passwords.');

  } catch (error) {
    console.error('Error fixing login credentials:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

fixLoginCredentials();