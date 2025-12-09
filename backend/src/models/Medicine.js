const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    manufacturer: { type: String, trim: true },
    description: { type: String, trim: true },
    usage: { type: String, trim: true },
    composition: [{ type: String, trim: true }],
    category: { type: String, trim: true },
    price: { type: Number, required: true, default: 0 },
    imageUrls: [{ type: String }],
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    tags: [{ type: String, trim: true }],
    primaryConditions: [{ type: String, trim: true }],
    precautions: [{ type: String, trim: true }],
    is_deleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Useful indexes for search/filter performance
medicineSchema.index({ name: 'text', manufacturer: 'text' });
medicineSchema.index({ category: 1 });
medicineSchema.index({ tags: 1 });
medicineSchema.index({ composition: 1 });
medicineSchema.index({ createdAt: -1 });
// Enforce unique name only for non-deleted records
medicineSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { is_deleted: { $ne: true } } }
);

module.exports = mongoose.model('Medicine', medicineSchema);
