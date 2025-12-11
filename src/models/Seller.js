// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// const sellerSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }, // reference to restaurant
//   restaurantName: { type: String, required: true },
//   station: { type: String, required: true }, // train station name
//   phone: { type: String },
//   logoUrl: { type: String }, // restaurant logo/branding image
//   isActive: { type: Boolean, default: true }, // seller can toggle availability
//   isApproved: { type: Boolean, default: false }, // for admin control
//   address: { type: String },
//   description: { type: String }, // restaurant description
//   rating: { type: Number, default: 0, min: 0, max: 5 },
//   totalRatings: { type: Number, default: 0 },
//   deliveryTimeEstimate: { type: String, default: '30 mins' }, // default delivery time
//   // Train assignment info
//   assignedTrains: [{ 
//     trainNumber: String, 
//     trainName: String, 
//     arrivalTime: String 
//   }],
//   deliverySlots: [{
//     startTime: String,
//     endTime: String,
//     maxOrders: Number,
//     isActive: { type: Boolean, default: true }
//   }]
// }, { timestamps: true });

// sellerSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// sellerSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// export default mongoose.model("Seller", sellerSchema);
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const sellerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Restaurant reference is useful, but do NOT require at registration time
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },

  restaurantName: { type: String, required: true },
  station: { type: String, required: true }, // train station name
  phone: { type: String },
  logoUrl: { type: String },
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  address: { type: String },
  description: { type: String },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  deliveryTimeEstimate: { type: String, default: '30 mins' },

  assignedTrains: [{ 
    trainNumber: String, 
    trainName: String, 
    arrivalTime: String 
  }],
  deliverySlots: [{
    startTime: String,
    endTime: String,
    maxOrders: Number,
    isActive: { type: Boolean, default: true }
  }]
}, { timestamps: true });

sellerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

sellerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Seller", sellerSchema);