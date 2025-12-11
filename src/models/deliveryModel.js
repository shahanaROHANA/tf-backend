import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const deliverySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number] // [longitude, latitude]
    },
    vehicleInfo: {
      type: { type: String, enum: ['bike', 'cycle', 'walk'], default: 'bike' },
      registrationNumber: String,
      model: String
    },
    earnings: {
      today: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      cashCollected: { type: Number, default: 0 }
    },
    workHours: {
      start: String, // "09:00"
      end: String,   // "18:00"
      timezone: { type: String, default: 'Asia/Colombo' }
    },
    documents: {
      license: String,
      vehicleRegistration: String,
      insurance: String
    },
    bankInfo: {
      accountNumber: String,
      bankName: String,
      branch: String,
      accountHolder: String
    },
    stats: {
      totalDeliveries: { type: Number, default: 0 },
      successfulDeliveries: { type: Number, default: 0 },
      cancelledDeliveries: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 }
    },
    assignedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    activeOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }
  },
  { timestamps: true }
);

// Password hash
deliverySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

deliverySchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Delivery", deliverySchema);
