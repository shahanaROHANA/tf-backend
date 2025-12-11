// // models/userModel.js
// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true, lowercase: true, trim: true },
//   passwordHash: { type: String, required: true },
//   // role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
//     role: { type: String, enum: ['customer','seller','admin'], default: 'customer' },
//   resetOtp: { type: String },
// otpExpire: { type: Date },
// }, { timestamps: true });

// export default mongoose.model('User', userSchema);
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  passwordHash: { type: String, required: true },
  
  // Roles: customer, seller, admin, deliveryAgent
  role: { 
    type: String, 
    enum: ['customer', 'seller', 'admin', 'deliveryAgent'], 
    default: 'customer' 
  },

  // OTP for password reset
  resetOtp: { type: String },
  otpExpire: { type: Date },

  // OAuth fields
  googleId: { type: String, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },

  // Admin control fields
  isBlocked: { type: Boolean, default: false },

}, { timestamps: true });

export default mongoose.model('User', userSchema);
