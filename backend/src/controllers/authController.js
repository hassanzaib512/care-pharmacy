const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendForgotPasswordEmail, sendWelcomeEmail } = require('../services/emailService');

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    return res
      .status(409)
      .json({ errorCode: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists.' });
  }

  let user;
  try {
    user = await User.create({
      name,
      email: normalizedEmail,
      password,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ errorCode: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists.' });
    }
    throw err;
  }

  sendWelcomeEmail(user).catch((err) => console.error('Failed to send welcome email', err));

  res.status(201).json({
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      address: user.address,
      paymentMethod: user.paymentMethod,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (user && (await user.matchPassword(password))) {
    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      address: user.address,
      paymentMethod: user.paymentMethod,
    },
  });
  } else {
    res.status(401);
    throw new Error('Invalid credentials');
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({
    user: req.user,
  });
});

// @desc    Google login/register
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  if (!googleClient) {
    res.status(500);
    throw new Error('Google client not configured');
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { idToken } = req.body;
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = payload.email?.toLowerCase();
  const name = payload.name || payload.given_name || 'Google User';
  const picture = payload.picture;
  if (!email) {
    res.status(400);
    throw new Error('Google account email missing');
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      password: Date.now().toString(), // unused
      googleId: payload.sub,
      avatarUrl: picture,
    });
  } else if (!user.avatarUrl && picture) {
    user.avatarUrl = picture;
    await user.save();
  }

  res.json({
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      address: user.address,
      paymentMethod: user.paymentMethod,
    },
  });
});

// @desc Request password reset
// @route POST /api/auth/request-password-reset
// @access Public
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  const token = crypto.randomBytes(20).toString('hex');
  const expires = Date.now() + 30 * 60 * 1000; // 30 minutes

  if (user) {
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(expires);
    await user.save({ validateModifiedOnly: true });
    sendForgotPasswordEmail(user, token).catch((err) =>
      console.error('Failed to send forgot password email', err)
    );
  }

  res.json({ message: 'If an account exists, a reset link has been sent' });
});

// @desc Reset password
// @route POST /api/auth/reset-password
// @access Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword } = req.body || {};
  if (!email || !token || !newPassword) {
    res.status(400);
    throw new Error('Missing required fields');
  }
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({
    email: normalizedEmail,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired token');
  }
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ message: 'Password has been reset successfully' });
});

// @desc Change password (authenticated)
// @route POST /api/auth/change-password
// @access Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body || {};
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    res.status(400);
    throw new Error('All fields are required');
  }
  if (newPassword !== confirmNewPassword) {
    res.status(400);
    throw new Error('New passwords do not match');
  }
  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }
  const user = await User.findById(req.user._id);
  if (!user || !(await user.matchPassword(currentPassword))) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated successfully' });
});

module.exports = { registerUser, loginUser, getMe, googleAuth, requestPasswordReset, resetPassword, changePassword };
