require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/authRoutes');
const medicineRoutes = require('./src/routes/medicineRoutes');
const userRoutes = require('./src/routes/userRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const { reviewRouter, medicineReviewRouter } = require('./src/routes/reviewRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const { getSeason } = require('./src/controllers/seasonController');
const swaggerSpec = require('./src/swagger');

const app = express();

if (!process.env.JWT_SECRET) {
  // Fail fast if critical secret is missing
  console.error('JWT_SECRET is not set. Refusing to start for security.');
  process.exit(1);
}

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];
app.use(
  cors(
    allowedOrigins.length
      ? {
          origin(origin, cb) {
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            return cb(new Error('Not allowed by CORS'));
          },
          credentials: true,
        }
      : {}
  )
);
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow images/files to be consumed by mobile/other origins
  })
);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 400),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);
app.use(morgan('dev'));
app.use(
  express.json({
    limit: '1mb',
    strict: false, // allow primitives/null bodies to avoid parse errors on body-less requests
  })
);
app.use(express.urlencoded({ extended: true, limit: '3mb' }));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ok', data: { status: 'ok' } });
});

// Season helper backed by config (falls back to defaults)
app.get('/api/season', getSeason);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRouter);
app.use('/api/medicines/:medicineId/reviews', medicineReviewRouter);
app.use('/api/medicines/:id/reviews', medicineReviewRouter);
app.use('/api/admin', adminRoutes);
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  cors(),
  express.static(path.join(__dirname, 'uploads'))
);

// 404 & error handler
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Connect DB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
