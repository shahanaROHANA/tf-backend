import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Delivery from './src/models/deliveryModel.js';

dotenv.config();

const createDeliveryAgent = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trainfood');
    console.log('Connected to MongoDB');

    // Check if delivery agent already exists
    const existingAgent = await Delivery.findOne({ email: 'delivery@trainfood.com' });
    if (existingAgent) {
      console.log('Delivery agent already exists');
      process.exit(0);
    }

    // Create delivery agent
    const deliveryAgent = await Delivery.create({
      name: 'Test Delivery Agent',
      email: 'delivery@trainfood.com',
      phone: '+94771234567',
      password: 'delivery123',
      isAvailable: true,
      vehicleInfo: {
        type: 'bike',
        registrationNumber: 'TEST-1234',
        model: 'Honda Activa'
      }
    });

    console.log('Delivery agent created successfully:');
    console.log('Email: delivery@trainfood.com');
    console.log('Password: delivery123');
    console.log('Name:', deliveryAgent.name);
    console.log('ID:', deliveryAgent._id);

    process.exit(0);
  } catch (error) {
    console.error('Error creating delivery agent:', error);
    process.exit(1);
  }
};

createDeliveryAgent();
