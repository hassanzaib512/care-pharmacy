const mongoose = require('mongoose');

const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

configSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Config', configSchema);
