const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
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

// GET /api/medicines
// Supports search, category, composition, tag, pagination
const getMedicines = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    search = '',
    category,
    composition,
    tag,
    page = 1,
    limit = 10,
  } = req.query;

  const queryObj = { is_deleted: { $ne: true } };

  if (search) {
    queryObj.$or = [
      { name: { $regex: search, $options: 'i' } },
      { manufacturer: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) {
    queryObj.category = category;
  }

  if (composition) {
    queryObj.composition = { $in: [composition] };
  }

  if (tag) {
    queryObj.tags = { $in: [tag] };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [items, totalItems] = await Promise.all([
    Medicine.find(queryObj).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    Medicine.countDocuments(queryObj),
  ]);

  res.json({
    data: items.map((m) => ({
      ...m.toObject(),
      imageUrls: (m.imageUrls || []).map((u) => ensureAbsoluteUrl(u, req)),
      imageUrl: ensureAbsoluteUrl(m.imageUrl, req),
    })),
    page: Number(page),
    totalPages: Math.ceil(totalItems / Number(limit)),
    totalItems,
  });
});

// GET /api/medicines/:id
const getMedicineById = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const med = await Medicine.findOne({ _id: req.params.id, is_deleted: { $ne: true } });
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

// GET /api/medicines/recommended
// Simple heuristic: look at user's past order categories and return matches
const getRecommended = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { limit = 10 } = req.query;
  const orders = await Order.find({ user: req.user._id }).populate(
    'items.medicine',
    'category'
  );

  const categoryCounts = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const cat = item.medicine?.category;
      if (!cat) return;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  });

  const topCategories = Object.keys(categoryCounts).sort(
    (a, b) => categoryCounts[b] - categoryCounts[a]
  );

  const baseQuery = { is_deleted: { $ne: true } };
  const queryObj = topCategories.length
    ? { ...baseQuery, category: { $in: topCategories } }
    : baseQuery;

  const recommended = await Medicine.find(queryObj)
    .limit(Number(limit))
    .sort({ rating: -1 });

  res.json({ data: recommended });
});

module.exports = {
  getMedicines,
  getMedicineById,
  getRecommended,
};
