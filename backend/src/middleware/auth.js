const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const secrets = [process.env.JWT_SECRET, process.env.ADMIN_JWT_SECRET].filter(Boolean);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      let decoded;
      for (const secret of secrets) {
        try {
          decoded = jwt.verify(token, secret);
          break;
        } catch (err) {
          decoded = null;
        }
      }
      if (!decoded) {
        res.status(401);
        throw new Error('Not authorized, token failed');
      }
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }
      return next();
    } catch (err) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  res.status(401);
  throw new Error('Not authorized, no token');
});

const requireRole = (role) =>
  asyncHandler(async (req, res, next) => {
    if (req.user && req.user.role === role) {
      return next();
    }
    res.status(403);
    throw new Error('Forbidden');
  });

module.exports = { protect, requireRole };
