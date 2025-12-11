// config/db.js
import mongoose from 'mongoose';

const connectDB = async (retries = 5) => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set in .env');

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (retries > 0) {
      console.log(`Retrying connection... ${retries} attempts left`);
      setTimeout(() => connectDB(retries - 1), 2000); // Retry after 2 seconds
    } else {
      console.error('Failed to connect to MongoDB after multiple attempts');
      process.exit(1);
    }
  }
};

export default connectDB;
