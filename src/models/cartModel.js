// models/cartModel.js
import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: { type: Number, required: true, min: 1 },
  priceCents: { type: Number, required: true } // store product price at time of adding
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // one cart per user
    },
    items: [cartItemSchema],
    totalCents: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Calculate total before saving
cartSchema.pre('save', function (next) {
  this.totalCents = this.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  next();
});

export default mongoose.model('Cart', cartSchema);
