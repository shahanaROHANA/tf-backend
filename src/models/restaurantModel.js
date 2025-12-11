import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  station: { type: String, required: true, index: true },
  description: { type: String },
  imageUrl: { type: String },
  isActive: { type: Boolean, default: true },
  cuisineType: { type: String, enum: ['Veg', 'Non-Veg', 'Mixed', 'Beverages', 'Pizza'] },
  deliveryTimeEstimate: { type: String, default: '30 mins' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' }
}, { timestamps: true });

export default mongoose.model('Restaurant', restaurantSchema);
