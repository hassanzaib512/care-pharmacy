const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
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

module.exports = {
  getCurrentUser,
  updateAddress,
  updatePaymentMethod,
  uploadAvatar,
};
