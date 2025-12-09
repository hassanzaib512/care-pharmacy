const express = require('express');
const { query, param } = require('express-validator');
const { getMedicines, getMedicineById, getRecommended } = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Medicines
 *   description: Public medicines endpoints
 */

// GET /api/medicines
/**
 * @swagger
 * /api/medicines:
 *   get:
 *     summary: List medicines with search/filter/pagination
 *     tags: [Medicines]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Medicines list
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be int >=1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit 1-100'),
    query('search').optional().isString(),
    query('category').optional().isString(),
    query('composition').optional().isString(),
    query('tag').optional().isString(),
  ],
  getMedicines
);

// GET /api/medicines/recommended
/**
 * @swagger
 * /api/medicines/recommended:
 *   get:
 *     summary: Get recommended medicines for authenticated user
 *     tags: [Medicines]
 *     responses:
 *       200:
 *         description: Recommended medicines
 */
router.get(
  '/recommended',
  protect,
  [query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit 1-50')],
  getRecommended
);

// GET /api/medicines/:id
/**
 * @swagger
 * /api/medicines/{id}:
 *   get:
 *     summary: Get medicine by id
 *     tags: [Medicines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Medicine detail
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid medicine id required')],
  getMedicineById
);

module.exports = router;
