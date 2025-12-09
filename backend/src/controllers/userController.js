const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const DeviceToken = require('../models/DeviceToken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const getPublicBase = (req) => {
  const envBase = process.env.PUBLIC_BASE_URL || process.env.ASSET_BASE_URL || process.env.APP_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
};

// @desc    Get current user profile (with address/payment)
// @route   GET /api/users/me
// @access  Private
const getCurrentUser = asyncHandler(async (req, res) => {
  const total = await Order.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
    { $group: { _id: '$user', totalSpend: { $sum: '$totalAmount' } } },
  ]);
  const totalSpend = total.length ? total[0].totalSpend : 0;
  res.json({ data: { ...req.user.toObject({ versionKey: false }), totalSpend } });
});

// @desc    Update address
// @route   PUT /api/users/me/address
// @access  Private
const updateAddress = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    fullName, phone, line1, line2, city, zip,
  } = req.body;

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    {
      address: {
        fullName,
        phone,
        line1,
        line2,
        city,
        zip,
      },
    },
    { new: true }
  ).select('-password');

  const total = await Order.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
    { $group: { _id: '$user', totalSpend: { $sum: '$totalAmount' } } },
  ]);
  const totalSpend = total.length ? total[0].totalSpend : 0;
  res.json({ data: { ...updated.toObject({ versionKey: false }), totalSpend } });
});

// @desc    Update payment method
// @route   PUT /api/users/me/payment-method
// @access  Private
const updatePaymentMethod = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    cardHolderName, cardNumber, expiry, brand,
  } = req.body;

  const last4 = cardNumber.slice(-4);
  const maskedCardNumber = `**** **** **** ${last4}`;

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    {
      paymentMethod: {
        cardHolderName,
        maskedCardNumber,
        brand,
        expiry,
      },
    },
    { new: true }
  ).select('-password');

  const total = await Order.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
    { $group: { _id: '$user', totalSpend: { $sum: '$totalAmount' } } },
  ]);
  const totalSpend = total.length ? total[0].totalSpend : 0;

  res.json({ data: { ...updated.toObject({ versionKey: false }), totalSpend } });
});

// @desc    Upload avatar
// @route   PUT /api/users/me/avatar
// @access  Private
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const base = getPublicBase(req);
  const fileUrl = `${base}/uploads/avatars/${req.file.filename}`;
  // sanity check file existence
  const absPath = path.join(__dirname, '..', '..', 'uploads', 'avatars', req.file.filename);
  if (!fs.existsSync(absPath)) {
    res.status(500);
    throw new Error('Upload failed, file missing on server');
  }
  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { avatarUrl: fileUrl },
    { new: true }
  ).select('-password');

  res.json({ data: updated });
});

// @desc    Register or update device token
// @route   POST /api/users/me/device-token
// @access  Private
const saveDeviceToken = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { token, platform } = req.body || {};
  const normalizedPlatform = ['android', 'ios', 'web'].includes((platform || '').toLowerCase())
    ? platform.toLowerCase()
    : 'unknown';

  const saved = await DeviceToken.findOneAndUpdate(
    { user: req.user._id, token },
    { user: req.user._id, token, platform: normalizedPlatform, isActive: true },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Mark the same token as inactive for other users (if any) to avoid cross-user delivery
  await DeviceToken.updateMany(
    { token, user: { $ne: req.user._id } },
    { $set: { isActive: false } }
  );

  res.json({ data: { token: saved.token, platform: saved.platform } });
});

// @desc    Remove a device token
// @route   DELETE /api/users/me/device-token
// @access  Private
const removeDeviceToken = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { token } = req.body || {};

  await DeviceToken.updateMany(
    { user: req.user._id, token },
    { $set: { isActive: false } }
  );

  res.json({ message: 'Device token removed' });
});

module.exports = {
  getCurrentUser,
  updateAddress,
  updatePaymentMethod,
  uploadAvatar,
  saveDeviceToken,
  removeDeviceToken,
};
