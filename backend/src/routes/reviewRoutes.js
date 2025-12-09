const express = require('express');
const { body, param } = require('express-validator');
const { getReviews, addReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get(
  '/',
  [
    param('id').isMongoId().withMessage('Valid medicine id required'),
  ],
  getReviews
);

router.post(
  '/',
  protect,
  [
    param('id').isMongoId().withMessage('Valid medicine id required'),
    body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating 1-5 required'),
    body('comment').optional().isString(),
  ],
  addReview
);

module.exports = router;
