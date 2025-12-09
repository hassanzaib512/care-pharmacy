const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const User = require('../models/User');

const isCancelableStatus = (status) => {
  const normalized = (status || '').toLowerCase();
  return ['pending', 'paid', 'processing'].includes(normalized);
};

// @desc    Place order from local cart payload
// @route   POST /api/orders
// @access  Private
const placeOrder = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }

  if (!user.address || !user.address.line1) {
    res.status(400);
    throw new Error('Address is required before placing an order');
  }
  if (!user.paymentMethod || !user.paymentMethod.maskedCardNumber) {
    res.status(400);
    throw new Error('Payment method is required before placing an order');
  }

  const itemsPayload = req.body.items;
  const itemIds = itemsPayload.map((i) => i.medicine);
  const meds = await Medicine.find({ _id: { $in: itemIds } });
  if (!meds.length || meds.length !== itemIds.length) {
    res.status(400);
    throw new Error('One or more medicines were not found');
  }

  const deletedMed = meds.find((m) => m.is_deleted);
  if (deletedMed) {
    res.status(400);
    throw new Error(`Medicine ${deletedMed.name || ''} is no longer available`);
  }
  const priceMap = meds.reduce((acc, m) => {
    acc[m._id.toString()] = m.price;
    return acc;
  }, {});

  const items = itemsPayload.map((i) => ({
    medicine: i.medicine,
    quantity: i.quantity,
    unitPrice: priceMap[i.medicine] || 0,
  }));

  if (items.some((i) => !i.unitPrice || i.unitPrice <= 0)) {
    res.status(400);
    throw new Error('Invalid medicine price detected');
  }

  const totalAmount = items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  );

  const order = await Order.create({
    user: req.user._id,
    items,
    totalAmount,
    status: 'paid',
    deliveryStatus: 'In Progress',
    addressSnapshot: user.address,
    paymentSnapshot: user.paymentMethod,
  });

  res.status(201).json({ success: true, message: 'Order placed', data: order });
});

// @desc    Get my orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('items.medicine', 'name imageUrls price manufacturer');
  res.json({ success: true, data: orders });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate('items.medicine', 'name imageUrls price manufacturer');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json({ success: true, data: order });
});

// @desc    Cancel an in-progress order (owner only)
// @route   PATCH /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid order id');
  }

  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (!isCancelableStatus(order.status)) {
    res.status(400);
    throw new Error('Only pending/paid/processing orders can be cancelled');
  }

  order.status = 'cancelled';
  order.deliveryStatus = 'Cancelled';
  await order.save();

  res.json({ success: true, message: 'Order cancelled', data: order });
});

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
};
