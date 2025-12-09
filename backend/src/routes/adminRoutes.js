const express = require('express');
const { body, param, query } = require('express-validator');
const {
  adminLogin,
  getStats,
  getEarningsByYear,
  getTopManufacturers,
  getTopMedicines,
  getOrderDetail,
  listOrders,
  updateOrderStatus,
  markOrderDelivered,
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
  getMedicineDetailAdmin,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');
const { updateSeasons } = require('../controllers/seasonController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

// Admin auth
/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Admin token issued
 */
router.post(
  '/auth/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  adminLogin
);

// All routes below are admin-protected
router.use(protect, requireRole('admin'));

// Dashboard stats
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get high level admin stats
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Stats payload
 */
router.get('/stats', getStats);
router.get(
  '/earnings',
  [query('year').optional().isInt({ min: 1970, max: 3000 }).withMessage('year must be valid')],
  getEarningsByYear
);
router.get(
  '/top-manufacturers',
  [
    query('year').optional().isInt({ min: 1970, max: 3000 }).withMessage('year must be valid'),
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
  ],
  getTopManufacturers
);
router.get(
  '/top-medicines',
  [
    query('year').optional().isInt({ min: 1970, max: 3000 }).withMessage('year must be valid'),
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
  ],
  getTopMedicines
);

// Admin medicine detail
router.get(
  '/medicines/:id',
  [param('id').isMongoId().withMessage('Valid medicine id required')],
  getMedicineDetailAdmin
);

// Orders
/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: List orders (admin)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Paginated orders
 */
router.get(
  '/orders',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('status').optional().isString(),
    query('search').optional().isString(),
    query('sortBy').optional().isIn(['date', 'amount']),
    query('sortDir').optional().isIn(['asc', 'desc']),
  ],
  listOrders
);
router.get(
  '/orders/:id',
  [param('id').isMongoId().withMessage('Valid order id required')],
  getOrderDetail
);
/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   patch:
 *     summary: Update order status (admin)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated order
 */
router.patch(
  '/orders/:id/status',
  [
    param('id').isMongoId().withMessage('Valid order id required'),
    body('status').optional().isString(),
    body('deliveryStatus').optional().isString(),
  ],
  updateOrderStatus
);
router.patch(
  '/orders/:id/deliver',
  [param('id').isMongoId().withMessage('Valid order id required')],
  markOrderDelivered
);

// Users
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List users (admin)
 *     tags: [Admin]
 */
router.get('/users', listUsers);
router.get(
  '/users/:id',
  [param('id').isMongoId().withMessage('Valid user id required')],
  getUserDetail
);

// Medicines CRUD
/**
 * @swagger
 * /api/admin/medicines:
 *   get:
 *     summary: List medicines (admin)
 *     tags: [Admin]
 *   post:
 *     summary: Create medicine
 *     tags: [Admin]
 */
router.get('/medicines', listMedicines);
router.post(
  '/medicines',
  [
    body('name').notEmpty().withMessage('Name required'),
    body('price').isNumeric().withMessage('Price required'),
    body('manufacturer').notEmpty().withMessage('Manufacturer required'),
    body('category').notEmpty().withMessage('Category required'),
    body('usage').notEmpty().withMessage('Usage required'),
    body('composition').isArray({ min: 1 }).withMessage('At least one composition required'),
  ],
  createMedicine
);
router.put(
  '/medicines/:id',
  [
    param('id').isMongoId().withMessage('Valid medicine id required'),
    body('name').notEmpty().withMessage('Name required'),
    body('price').isNumeric().withMessage('Price required'),
    body('manufacturer').notEmpty().withMessage('Manufacturer required'),
    body('category').notEmpty().withMessage('Category required'),
    body('usage').notEmpty().withMessage('Usage required'),
    body('composition').isArray({ min: 1 }).withMessage('At least one composition required'),
  ],
  updateMedicine
);
router.delete(
  '/medicines/:id',
  [param('id').isMongoId().withMessage('Valid medicine id required')],
  deleteMedicine
);
router.post('/medicines/images', uploadMedicineImages);
router.delete('/medicines/image', deleteMedicineImage);

// Config & seasons
router.get('/config', getConfig);
router.post('/config', upsertConfig);
router.delete('/config/:id', deleteConfig);
router.post(
  '/config/seasons',
  [
    body('seasons').isArray({ min: 1 }).withMessage('seasons array required'),
    body('current').optional().isString(),
  ],
  updateSeasons
);

module.exports = router;
