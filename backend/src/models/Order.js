const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    zip: String,
  },
  { _id: false }
);

const paymentSnapshotSchema = new mongoose.Schema(
  {
    cardHolderName: String,
    maskedCardNumber: String,
    brand: String,
    expiry: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'completed', 'delivered', 'cancelled'],
      default: 'paid',
    },
    deliveryStatus: {
      type: String,
      default: 'In Progress',
      trim: true,
    },
    addressSnapshot: addressSnapshotSchema,
    paymentSnapshot: paymentSnapshotSchema,
  },
  { timestamps: true }
);

// Common query helpers
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'items.medicine': 1 });

module.exports = mongoose.model('Order', orderSchema);
