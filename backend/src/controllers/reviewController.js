const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// @desc    Get reviews for a medicine (paginated)
// @route   GET /api/medicines/:id/reviews
// @access  Public
const getReviews = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ medicine: req.params.id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ medicine: req.params.id }),
  ]);

  res.json({
    data: reviews,
    page,
    totalPages: Math.ceil(total / limit),
    totalItems: total,
  });
});

// @desc    Add review for a medicine (must have delivered/completed order)
// @route   POST /api/medicines/:id/reviews
// @access  Private
const addReview = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const medicineId = req.params.id;
  const { rating, comment } = req.body;

  // Check eligible order
  const hasOrder = await Order.exists({
    user: req.user._id,
    status: { $in: ['completed', 'delivered'] },
    'items.medicine': medicineId,
  });
  if (!hasOrder) {
    res.status(403);
    throw new Error('You can review only after a completed/delivered order with this medicine');
  }

  const review = await Review.create({
    medicine: medicineId,
    user: req.user._id,
    rating,
    comment,
  });

  // Update medicine rating/reviewsCount
  const agg = await Review.aggregate([
    { $match: { medicine: review.medicine } },
    {
      $group: {
        _id: '$medicine',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);
  const metrics = agg[0] || { avgRating: rating, count: 1 };
  await Medicine.findByIdAndUpdate(medicineId, {
    rating: metrics.avgRating,
    reviewsCount: metrics.count,
  });

  res.status(201).json({ data: review });
});

module.exports = { getReviews, addReview };
