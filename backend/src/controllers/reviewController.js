const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const recalcMedicineRating = async (medicineId) => {
  try {
    const [stats] = await Review.aggregate([
      { $match: { medicine: toObjectId(medicineId), isActive: { $ne: false } } },
      {
        $group: {
          _id: '$medicine',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          averageRating: { $round: ['$averageRating', 2] },
          reviewCount: 1,
        },
      },
    ]);

    await Medicine.findByIdAndUpdate(
      medicineId,
      {
        rating: stats?.averageRating || 0,
        reviewsCount: stats?.reviewCount || 0,
      },
      { new: true }
    );
  } catch (err) {
    console.error('Failed to recalc medicine rating', err);
  }
};

// PUT /api/reviews/:id
// Update user's own review
const updateReview = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }
  if (review.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only edit your own review');
  }

  review.rating = req.body.rating ?? review.rating;
  review.comment = req.body.comment ?? review.comment;
  await review.save();

  await recalcMedicineRating(review.medicine);

  const populated = await review.populate([
    { path: 'user', select: 'name email' },
    { path: 'medicine', select: 'name' },
    { path: 'order', select: '_id status' },
  ]);

  res.json({ data: populated });
});

// POST /api/reviews
// Create a review for a delivered order item
const createReview = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { orderId, medicineId, rating, comment } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const normalizedStatus = (order.status || '').toLowerCase();
  const normalizedDelivery = (order.deliveryStatus || '').toLowerCase();
  const isDelivered =
    normalizedStatus === 'delivered' ||
    normalizedStatus === 'completed' ||
    normalizedDelivery === 'delivered' ||
    normalizedDelivery === 'completed';
  if (!isDelivered) {
    res.status(400);
    throw new Error('You can only review delivered orders');
  }

  const hasMedicine = (order.items || []).some((item) => {
    const medId = item.medicine?._id || item.medicine;
    return medId?.toString() === medicineId;
  });
  if (!hasMedicine) {
    res.status(400);
    throw new Error('This medicine is not part of the order');
  }

  const existing = await Review.findOne({
    user: req.user._id,
    order: orderId,
    medicine: medicineId,
    isActive: { $ne: false },
  });
  if (existing) {
    res.status(400);
    throw new Error('You already reviewed this medicine for this order');
  }

  let review;
  try {
    review = await Review.create({
      medicine: medicineId,
      user: req.user._id,
      order: orderId,
      rating,
      comment,
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      throw new Error('You already reviewed this medicine for this order');
    }
    throw err;
  }

  await recalcMedicineRating(medicineId);

  const populated = await review.populate([
    { path: 'user', select: 'name email' },
    { path: 'medicine', select: 'name' },
    { path: 'order', select: '_id status' },
  ]);

  res.status(201).json({ data: populated });
});

// GET /api/admin/reviews
// Admin list of reviews with search/filter/sort/pagination
const listReviews = asyncHandler(async (req, res) => {
  const { search, rating, sortField, sortDirection } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 10, 200);

  const match = { isActive: { $ne: false } };
  if (rating) {
    const ratingNum = Number(rating);
    if (Number.isFinite(ratingNum)) {
      match.rating = ratingNum;
    }
  }

  const sortKey = sortField === 'rating' ? 'rating' : 'createdAt';
  const sortDir = sortDirection === 'asc' ? 1 : -1;
  const hasSearch = search && typeof search === 'string' && search.trim().length >= 2;
  const regex = hasSearch ? new RegExp(search.trim(), 'i') : null;

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDoc',
      },
    },
    { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'medicines',
        localField: 'medicine',
        foreignField: '_id',
        as: 'medDoc',
      },
    },
    { $unwind: { path: '$medDoc', preserveNullAndEmptyArrays: true } },
  ];

  if (regex) {
    pipeline.push({
      $match: {
        $or: [
          { comment: { $regex: regex } },
          { 'userDoc.name': { $regex: regex } },
          { 'userDoc.email': { $regex: regex } },
          { 'medDoc.name': { $regex: regex } },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { [sortKey]: sortDir } },
    {
      $facet: {
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              rating: 1,
              comment: 1,
              createdAt: 1,
              medicine: {
                _id: '$medDoc._id',
                name: '$medDoc.name',
              },
              user: {
                _id: '$userDoc._id',
                name: '$userDoc.name',
                email: '$userDoc.email',
              },
              order: '$order',
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

  const [result] = await Review.aggregate(pipeline);
  const items = result?.data || [];
  const totalItems = result?.totalItems || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  res.json({ data: items, page, totalPages, totalItems });
});

// GET /api/medicines/:medicineId/reviews
// Public/authenticated list of reviews for a medicine with stats
const getMedicineReviews = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const medicineId = req.params.medicineId || req.params.id;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const medObjId = toObjectId(medicineId);

  const listPromise = Review.aggregate([
    { $match: { medicine: medObjId, isActive: { $ne: false } } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDoc',
      },
    },
    { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
    {
      $facet: {
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              rating: 1,
              comment: 1,
              createdAt: 1,
              order: 1,
              user: {
                _id: '$userDoc._id',
                name: '$userDoc.name',
                email: '$userDoc.email',
              },
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
    },
  ]);

  const statsPromise = Review.aggregate([
    { $match: { medicine: medObjId, isActive: { $ne: false } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              reviewCount: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              averageRating: { $round: ['$averageRating', 2] },
              reviewCount: 1,
            },
          },
        ],
        distribution: [{ $group: { _id: '$rating', count: { $sum: 1 } } }],
      },
    },
    {
      $project: {
        averageRating: { $ifNull: [{ $arrayElemAt: ['$summary.averageRating', 0] }, 0] },
        reviewCount: { $ifNull: [{ $arrayElemAt: ['$summary.reviewCount', 0] }, 0] },
        distribution: 1,
      },
    },
  ]);

  const [listAgg = [], statsAgg = []] = await Promise.all([
    listPromise,
    statsPromise,
  ]);

  const listResult = listAgg[0] || {};
  const statsResult = statsAgg[0] || {};

  const items = listResult.data || [];
  const totalItems = listResult.totalItems || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const distBase = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (statsResult?.distribution || []).forEach((row) => {
    if (row?._id && distBase[row._id] !== undefined) {
      distBase[row._id] = row.count || 0;
    }
  });

  res.json({
    data: items,
    page,
    totalPages,
    totalItems,
    meta: {
      averageRating: Number((statsResult?.averageRating || 0).toFixed(2)),
      reviewCount: statsResult?.reviewCount || 0,
      distribution: distBase,
    },
  });
});

module.exports = {
  createReview,
  updateReview,
  listReviews,
  getMedicineReviews,
};
