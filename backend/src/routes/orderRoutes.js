const express = require('express');
const { body, param } = require('express-validator');
const { placeOrder, getMyOrders, getOrderById, cancelOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Customer orders
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place an order
 *     tags: [Orders]
 *     responses:
 *       201:
 *         description: Order created
 */
router.post(
  '/',
  protect,
  [
    body('items').isArray({ min: 1 }).withMessage('Items required'),
    body('items.*.medicine').isMongoId().withMessage('Valid medicine id required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be >=1'),
  ],
  placeOrder
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Orders list
 */
router.get('/', protect, getMyOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by id
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order detail
 */
router.get(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Valid order id required')],
  getOrderById
);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an in-progress order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order cancelled
 */
router.patch(
  '/:id/cancel',
  protect,
  [param('id').isMongoId().withMessage('Valid order id required')],
  cancelOrder
);

module.exports = router;
