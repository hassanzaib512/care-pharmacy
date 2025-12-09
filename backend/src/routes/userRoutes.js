const express = require('express');
const { body } = require('express-validator');
const {
  getCurrentUser,
  updateAddress,
  updatePaymentMethod,
  uploadAvatar,
  saveDeviceToken,
  removeDeviceToken,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile endpoints
 */

// GET /api/users/me
/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Current user with totals
 */
router.get('/me', protect, getCurrentUser);

// PUT /api/users/me/address
/**
 * @swagger
 * /api/users/me/address:
 *   put:
 *     summary: Update address
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *               line1: { type: string }
 *               line2: { type: string }
 *               city: { type: string }
 *               zip: { type: string }
 *     responses:
 *       200:
 *         description: Updated user
 */
router.put(
  '/me/address',
  protect,
  [
    body('fullName').notEmpty().withMessage('Full name required'),
    body('phone').notEmpty().withMessage('Phone required'),
    body('line1').notEmpty().withMessage('Address line 1 required'),
    body('city').notEmpty().withMessage('City required'),
    body('zip').notEmpty().withMessage('Zip required'),
  ],
  updateAddress
);

// PUT /api/users/me/payment-method
/**
 * @swagger
 * /api/users/me/payment-method:
 *   put:
 *     summary: Update payment method
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Updated user
 */
router.put(
  '/me/payment-method',
  protect,
  [
    body('cardHolderName').notEmpty().withMessage('Cardholder name required'),
    body('cardNumber')
      .isLength({ min: 12, max: 19 })
      .withMessage('Card number must be 12-19 digits'),
    body('expiry')
      .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
      .withMessage('Expiry must be MM/YY'),
    body('brand').notEmpty().withMessage('Brand required'),
  ],
  updatePaymentMethod
);

// POST /api/users/me/device-token
router.post(
  '/me/device-token',
  protect,
  [body('token').notEmpty().withMessage('token is required'), body('platform').optional().isString()],
  saveDeviceToken
);

// DELETE /api/users/me/device-token
router.delete(
  '/me/device-token',
  protect,
  [body('token').notEmpty().withMessage('token is required')],
  removeDeviceToken
);

// PUT /api/users/me/avatar
/**
 * @swagger
 * /api/users/me/avatar:
 *   put:
 *     summary: Upload avatar
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Updated user with avatar
 */
router.put('/me/avatar', protect, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    return uploadAvatar(req, res, next);
  });
});

module.exports = router;
