const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Config = require('../models/Config');
const generateToken = require('../utils/generateToken');
const uploadMedicine = require('../utils/uploadMedicine');
const fs = require('fs');
const path = require('path');

const getPublicBase = (req) => {
  const envBase = process.env.PUBLIC_BASE_URL || process.env.ASSET_BASE_URL || process.env.APP_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
};

const ensureAbsoluteUrl = (url, req) => {
  if (!url) return url;
  const base = getPublicBase(req);
  const localHosts = ['http://localhost', 'https://localhost', 'http://127.0.0.1', 'http://0.0.0.0'];
  if (url.startsWith('http')) {
    if (base && localHosts.some((h) => url.startsWith(h))) {
      const withoutHost = url.replace(/^https?:\/\/[^/]+/, '');
      return `${base}${withoutHost}`;
    }
    return url;
  }
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url}`;
};

// Admin login reuses users with role 'admin'
const adminLogin = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail, role: 'admin' });
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid credentials');
  }
  res.json({
    token: generateToken(
      user._id,
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
      process.env.ADMIN_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '7d'
    ),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// Dashboard stats
const getStats = asyncHandler(async (req, res) => {
  const [userCount, orders, orderAmounts] = await Promise.all([
    User.countDocuments(),
    Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          count: 1,
          meanOrderAmount: {
            $cond: [{ $eq: ['$count', 0] }, 0, { $divide: ['$totalAmount', '$count'] }],
          },
        },
      },
    ]),
  ]);
  const totalOrders = orders.reduce((sum, o) => sum + o.count, 0);
  const byStatus = orders.reduce((acc, o) => {
    acc[o._id] = o.count;
    return acc;
  }, {});
  const meanOrderAmount = orderAmounts?.[0]?.meanOrderAmount || 0;
  const totalOrderAmount = orderAmounts?.[0]?.totalAmount || 0;
  res.json({
    success: true,
    data: {
      users: userCount,
      orders: {
        total: totalOrders,
        totalAmount: totalOrderAmount,
        meanOrderAmount,
        byStatus,
      },
    },
  });
});

// Orders list with search, status filter, sort, pagination
const listOrders = asyncHandler(async (req, res) => {
  const { status, search, sortBy, sortDir } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 10, 200);
  const hasSearch = search && typeof search === 'string' && search.trim().length >= 3;

  const match = {};
  if (status) {
    match.status = status;
  }

  const sortField = sortBy === 'amount' ? 'totalAmount' : 'createdAt';
  const sortOrder = sortDir === 'asc' ? 1 : -1;

  const pipeline = [
    { $sort: { [sortField]: sortOrder } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDoc',
      },
    },
    { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
    { $match: match },
  ];

  if (hasSearch) {
    const trimmed = search.trim();
    const regex = new RegExp(trimmed, 'i');
    pipeline.push({
      $match: {
        $or: [
          { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: trimmed, options: 'i' } } },
          { 'userDoc.name': { $regex: regex } },
          { 'userDoc.email': { $regex: regex } },
        ],
      },
    });
  }

  pipeline.push(
    {
      $facet: {
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              status: 1,
              deliveryStatus: 1,
              totalAmount: 1,
              createdAt: 1,
              updatedAt: 1,
              user: {
                _id: '$userDoc._id',
                name: '$userDoc.name',
                email: '$userDoc.email',
              },
              items: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
    { $unwind: { path: '$total', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        data: 1,
        totalItems: { $ifNull: ['$total.count', 0] },
      },
    }
  );

  const [result] = await Order.aggregate(pipeline);
  const items = result?.data || [];
  const totalItems = result?.totalItems || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  res.json({ data: items, page, totalPages, totalItems });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { status, deliveryStatus } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (status) order.status = status;
  if (deliveryStatus) order.deliveryStatus = deliveryStatus;
  await order.save();
  res.json({ data: order });
});

// Mark order as delivered (admin)
const markOrderDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  const current = order.status?.toLowerCase();
  if (current === 'delivered' || order.deliveryStatus?.toLowerCase().includes('deliver')) {
    res.status(400);
    throw new Error('Order is already delivered');
  }
  order.status = 'delivered';
  order.deliveryStatus = 'Delivered';
  order.deliveredAt = new Date();
  await order.save();
  res.json({ data: order });
});

// Admin get order detail
const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.medicine', 'name price manufacturer imageUrls imageUrl');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  res.json({ data: order });
});

// Users list
const listUsers = asyncHandler(async (req, res) => {
  const { search, sortBy, sortDir } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 200);
  const hasSearch = search && typeof search === 'string' && search.trim().length >= 3;

  const sortField = sortBy === 'total' ? 'totalSpend' : 'name';
  const sortOrder = sortDir === 'asc' ? 1 : -1;

  const regex = hasSearch ? new RegExp(search.trim(), 'i') : null;

  const pipeline = [
    {
      $lookup: {
        from: 'orders',
        let: { uid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$user', '$$uid'] } } },
          { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
        ],
        as: 'orderStats',
      },
    },
    {
      $addFields: {
        ordersCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.count', 0] }, 0] },
        totalSpend: {
          $round: [{ $ifNull: [{ $arrayElemAt: ['$orderStats.total', 0] }, 0] }, 2],
        },
      },
    },
    { $project: { password: 0, orderStats: 0 } },
  ];

  if (regex) {
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: regex } },
          { email: { $regex: regex } },
          { 'address.line1': { $regex: regex } },
          { 'address.city': { $regex: regex } },
          { 'address.zip': { $regex: regex } },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { [sortField]: sortOrder } },
    {
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
    { $unwind: { path: '$total', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        data: 1,
        totalItems: { $ifNull: ['$total.count', 0] },
      },
    }
  );

  const [result] = await User.aggregate(pipeline);
  const items = result?.data || [];
  const totalItems = result?.totalItems || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  res.json({ data: items, page, totalPages, totalItems });
});

const getUserDetail = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
  res.json({ data: { user, orders } });
});

// Earnings by month for a given year
const getEarningsByYear = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const monthly = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        total: { $sum: '$totalAmount' },
      },
    },
  ]);

  const monthlyTotals = Array(12).fill(0);
  monthly.forEach((m) => {
    if (m?._id && m._id >= 1 && m._id <= 12) {
      monthlyTotals[m._id - 1] = m.total || 0;
    }
  });

  const monthlyRounded = monthlyTotals.map((v) =>
    Number((v || 0).toFixed(2))
  );
  const totalYear = Number(
    monthlyRounded.reduce((sum, v) => sum + v, 0).toFixed(2)
  );

  res.json({
    data: {
      year,
      monthlyTotals: monthlyRounded,
      total: totalYear,
    },
  });
});

// Top manufacturers by earnings for a given month/year
const getTopManufacturers = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || new Date().getMonth() + 1; // 1-12
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const results = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'medicines',
        localField: 'items.medicine',
        foreignField: '_id',
        as: 'med',
      },
    },
    { $unwind: { path: '$med', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$med.manufacturer', 'Unknown'] },
        total: {
          $sum: {
            $multiply: [
              { $ifNull: ['$items.unitPrice', 0] },
              { $ifNull: ['$items.quantity', 0] },
            ],
          },
        },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);

  res.json({
    data: results.map((r) => ({
      name: r._id,
      total: Number((r.total || 0).toFixed(2)),
    })),
  });
});

// Top medicines by earnings for a given month/year
const getTopMedicines = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || new Date().getMonth() + 1; // 1-12
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const results = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'medicines',
        localField: 'items.medicine',
        foreignField: '_id',
        as: 'med',
      },
    },
    { $unwind: { path: '$med', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$med.name', 'Unknown'] },
        total: {
          $sum: {
            $multiply: [
              { $ifNull: ['$items.unitPrice', 0] },
              { $ifNull: ['$items.quantity', 0] },
            ],
          },
        },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);

  res.json({
    data: results.map((r) => ({
      name: r._id,
      total: Number((r.total || 0).toFixed(2)),
    })),
  });
});

// Medicines CRUD
const listMedicines = asyncHandler(async (req, res) => {
  const {
    search,
    composition,
    manufacturer,
    category,
    sortBy,
    sortDir,
  } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 200);

  const query = {};
  const hasSearch = search && typeof search === 'string' && search.trim().length >= 3;
  if (composition && composition.toString().trim().length >= 3) {
    const regex = new RegExp(composition.toString().trim(), 'i');
    query.composition = { $elemMatch: { $regex: regex } };
  }
  if (manufacturer && manufacturer.toString().trim().length >= 3) {
    const regex = new RegExp(manufacturer.toString().trim(), 'i');
    query.manufacturer = { $regex: regex };
  }
  if (category && category.toString().trim().length >= 3) {
    const regex = new RegExp(category.toString().trim(), 'i');
    query.category = { $regex: regex };
  }
  if (hasSearch) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { manufacturer: regex }];
  }

  const sortField = sortBy === 'price' ? 'price' : 'name';
  const sortOrder = sortDir === 'desc' ? -1 : 1;

  const [items, totalItems] = await Promise.all([
    Medicine.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit),
    Medicine.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const mapped = items.map((m) => ({
    ...m.toObject(),
    imageUrls: (m.imageUrls || []).map((u) => ensureAbsoluteUrl(u, req)),
    imageUrl: ensureAbsoluteUrl(m.imageUrl, req),
  }));

  res.json({ data: mapped, page, totalPages, totalItems });
});

const createMedicine = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const existing = await Medicine.findOne({ name: req.body.name, is_deleted: { $ne: true } });
  if (existing) {
    res.status(400);
    throw new Error('Medicine with this name already exists');
  }
  try {
    const med = await Medicine.create(req.body);
    return res.status(201).json({ data: med });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      throw new Error('Medicine already exists (name + manufacturer + category must be unique)');
    }
    throw err;
  }
});

const updateMedicine = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const existing = await Medicine.findOne({
    _id: { $ne: req.params.id },
    name: req.body.name,
    is_deleted: { $ne: true },
  });
  if (existing) {
    res.status(400);
    throw new Error('Medicine with this name already exists');
  }
  try {
    const med = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!med) {
      res.status(404);
      throw new Error('Medicine not found');
    }
    res.json({ data: med });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      throw new Error('Medicine already exists (name + manufacturer + category must be unique)');
    }
    throw err;
  }
});

const deleteMedicine = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const med = await Medicine.findById(req.params.id);
  if (!med) {
    res.status(404);
    throw new Error('Medicine not found');
  }
  // cleanup images from disk (keep DB record for audit)
  if (med.imageUrls?.length) {
    med.imageUrls.forEach((url) => {
      try {
        const filename = url.split('/').pop();
        if (filename) {
          const filePath = path.join(__dirname, '..', '..', 'uploads', 'medicines', filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      } catch (_) {}
    });
  }
  med.imageUrls = [];
  med.imageUrl = undefined;
  med.is_deleted = true;
  await med.save({ validateModifiedOnly: true });
  res.json({ message: 'Deleted (soft)' });
});

// Upload medicine images
const uploadMedicineImages = [
  (req, res, next) => {
    uploadMedicine.array('images', 5)(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      return next();
    });
  },
  (req, res) => {
    const base = getPublicBase(req);
    const urls = (req.files || []).map((file) => {
      return `${base}/uploads/medicines/${file.filename}`;
    });
    res.json({ data: urls });
  },
];

// Delete a medicine image (remove from disk and pull from docs)
const deleteMedicineImage = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400);
    throw new Error('image url required');
  }
  try {
    const filename = url.split('/').pop();
    if (filename) {
      const filePath = path.join(__dirname, '..', '..', 'uploads', 'medicines', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    // ignore unlink errors
  }
  await Medicine.updateMany({ imageUrls: url }, { $pull: { imageUrls: url } });
  res.json({ message: 'Image removed' });
});

// Config (seasons + general config)
const getConfig = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 200);
  const search = req.query.search;
  const query = {};
  if (search && typeof search === 'string' && search.trim().length >= 3) {
    query.key = { $regex: new RegExp(search.trim(), 'i') };
  }
  const [items, totalItems] = await Promise.all([
    Config.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Config.countDocuments(query),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  res.json({ data: items, page, totalPages, totalItems });
});

const upsertConfig = asyncHandler(async (req, res) => {
  const { id, key, payload } = req.body;
  if (!key) {
    res.status(400);
    throw new Error('key is required');
  }

  // Enforce unique key, excluding the document we are editing (if any)
  const duplicate = await Config.findOne(
    id ? { key, _id: { $ne: id } } : { key }
  );
  if (duplicate) {
    res.status(400);
    throw new Error('Config with this key already exists');
  }

  const filter = id ? { _id: id } : { key };
  const updated = await Config.findOneAndUpdate(
    filter,
    { key, payload: payload || {} },
    { upsert: !id, new: true, setDefaultsOnInsert: true }
  );

  res.json({ data: updated });
});

const deleteConfig = asyncHandler(async (req, res) => {
  const conf = await Config.findByIdAndDelete(req.params.id);
  if (!conf) {
    res.status(404);
    throw new Error('Config not found');
  }
  res.json({ message: 'Deleted' });
});

// Admin medicine detail (including soft-deleted)
const getMedicineDetailAdmin = asyncHandler(async (req, res) => {
  const med = await Medicine.findById(req.params.id);
  if (!med) {
    res.status(404);
    throw new Error('Medicine not found');
  }
  const mapped = {
    ...med.toObject(),
    imageUrls: (med.imageUrls || []).map((u) => ensureAbsoluteUrl(u, req)),
    imageUrl: ensureAbsoluteUrl(med.imageUrl, req),
  };
  res.json({ data: mapped });
});

module.exports = {
  adminLogin,
  getStats,
  getEarningsByYear,
  getTopManufacturers,
  getTopMedicines,
  getOrderDetail,
  listOrders,
  updateOrderStatus,
  listUsers,
  getUserDetail,
  listMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  deleteMedicineImage,
  uploadMedicineImages,
  getConfig,
  upsertConfig,
  deleteConfig,
  markOrderDelivered,
  getMedicineDetailAdmin,
};
