import mongoose from 'mongoose';
import TrainSchedule from './src/models/trainScheduleModel.js';
import connectDB from './src/config/db.js';

const trainSchedules = [
  {
    trainNo: '12345',
    date: '2025-11-21',
    stops: [
      { station: 'Colombo', arrival: '2025-11-21T10:00:00Z', departure: '2025-11-21T10:05:00Z' },
      { station: 'Gampaha', arrival: '2025-11-21T10:30:00Z', departure: '2025-11-21T10:32:00Z' },
      { station: 'Veyangoda', arrival: '2025-11-21T10:50:00Z', departure: '2025-11-21T10:52:00Z' },
      { station: 'Mirigama', arrival: '2025-11-21T11:10:00Z', departure: '2025-11-21T11:12:00Z' },
      { station: 'Polgahawela', arrival: '2025-11-21T11:40:00Z', departure: '2025-11-21T11:42:00Z' },
      { station: 'Kurunegala', arrival: '2025-11-21T12:10:00Z', departure: '2025-11-21T12:15:00Z' },
      { station: 'Maho', arrival: '2025-11-21T12:35:00Z', departure: '2025-11-21T12:37:00Z' },
      { station: 'Anuradhapura', arrival: '2025-11-21T13:10:00Z', departure: '2025-11-21T13:15:00Z' },
      { station: 'Medawachchiya', arrival: '2025-11-21T13:45:00Z', departure: '2025-11-21T13:47:00Z' },
      { station: 'Vavuniya', arrival: '2025-11-21T14:10:00Z', departure: '2025-11-21T14:12:00Z' },
      { station: 'Kilinochchi', arrival: '2025-11-21T14:30:00Z', departure: '2025-11-21T14:32:00Z' },
      { station: 'Jaffna', arrival: '2025-11-21T15:00:00Z', departure: '2025-11-21T15:05:00Z' }
    ]
  },
  {
    trainNo: '67890',
    date: '2025-11-21',
    stops: [
      { station: 'Colombo', arrival: '2025-11-21T09:00:00Z', departure: '2025-11-21T09:05:00Z' },
      { station: 'Ragama', arrival: '2025-11-21T09:20:00Z', departure: '2025-11-21T09:22:00Z' },
      { station: 'Gampaha', arrival: '2025-11-21T09:35:00Z', departure: '2025-11-21T09:37:00Z' },
      { station: 'Veyangoda', arrival: '2025-11-21T09:55:00Z', departure: '2025-11-21T09:57:00Z' },
      { station: 'Mirigama', arrival: '2025-11-21T10:15:00Z', departure: '2025-11-21T10:17:00Z' },
      { station: 'Polgahawela', arrival: '2025-11-21T10:45:00Z', departure: '2025-11-21T10:47:00Z' },
      { station: 'Kurunegala', arrival: '2025-11-21T11:15:00Z', departure: '2025-11-21T11:20:00Z' },
      { station: 'Maho', arrival: '2025-11-21T11:40:00Z', departure: '2025-11-21T11:42:00Z' },
      { station: 'Anuradhapura', arrival: '2025-11-21T12:15:00Z', departure: '2025-11-21T12:20:00Z' },
      { station: 'Medawachchiya', arrival: '2025-11-21T12:50:00Z', departure: '2025-11-21T12:52:00Z' },
      { station: 'Vavuniya', arrival: '2025-11-21T13:15:00Z', departure: '2025-11-21T13:17:00Z' },
      { station: 'Kilinochchi', arrival: '2025-11-21T13:35:00Z', departure: '2025-11-21T13:37:00Z' },
      { station: 'Jaffna', arrival: '2025-11-21T14:05:00Z', departure: '2025-11-21T14:10:00Z' }
    ]
  }
];

const seedTrainSchedules = async () => {
  try {
    await connectDB();

    // Clear existing data
    await TrainSchedule.deleteMany({});
    console.log('Cleared existing train schedules');

    // Insert new data
    await TrainSchedule.insertMany(trainSchedules);
    console.log('Train schedules seeded successfully');

    process.exit();
  } catch (error) {
    console.error('Error seeding train schedules:', error);
    process.exit(1);
  }
};

seedTrainSchedules();