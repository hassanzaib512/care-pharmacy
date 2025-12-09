const express = require('express');
const { body, param, query } = require('express-validator');
const { createReview, updateReview, listReviews, getMedicineReviews } = require('../controllers/reviewController');
const { protect, requireRole } = require('../middleware/auth');

const reviewRouter = express.Router();
const medicineReviewRouter = express.Router({ mergeParams: true });

reviewRouter.post(
  '/',
  protect,
  [
    body('orderId').isMongoId().withMessage('Valid order id required'),
    body('medicineId').isMongoId().withMessage('Valid medicine id required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating 1-5 required'),
    body('comment').optional().isString(),
  ],
  createReview
);

reviewRouter.put(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Valid review id required'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating 1-5 required'),
    body('comment').optional().isString(),
  ],
  updateReview
);

reviewRouter.get(
  '/',
  protect,
  requireRole('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isString(),
    query('rating').optional().isInt({ min: 1, max: 5 }),
    query('sortField').optional().isIn(['rating', 'createdAt']),
    query('sortDirection').optional().isIn(['asc', 'desc']),
  ],
  listReviews
);

medicineReviewRouter.get(
  '/',
  [
    param('medicineId').optional().isMongoId().withMessage('Valid medicine id required'),
    param('id').optional().isMongoId().withMessage('Valid medicine id required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getMedicineReviews
);

module.exports = { reviewRouter, medicineReviewRouter };
