import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema({
  station: { type: String, required: true },
  arrival: { type: Date, required: true },
  departure: { type: Date, required: true }
});

const trainScheduleSchema = new mongoose.Schema({
  trainNo: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  stops: [stopSchema]
}, {
  timestamps: true
});

// Compound index for efficient queries
trainScheduleSchema.index({ trainNo: 1, date: 1 }, { unique: true });

export default mongoose.model('TrainSchedule', trainScheduleSchema);