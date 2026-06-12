/* ══════════════════════════════════════
   routes/authRoutes.js  —  Auth API
   POST /api/auth/register
   POST /api/auth/login
   GET  /api/auth/me
   GET  /api/auth/users       (protected)
   GET  /api/auth/allusers    (open)
   POST /api/auth/forgot
   POST /api/auth/resetpassword
══════════════════════════════════════ */

const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/* ── Helper: sign and return JWT ──────── */
const sendToken = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  res.status(statusCode).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
};

/* ── POST /api/auth/register ──────────── */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }
    const user = await User.create({ name, email, password });
    sendToken(user, 201, res);
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

/* ── POST /api/auth/login ─────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    user.lastLogin = new Date();
    await user.save();
    sendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

/* ── GET /api/auth/me (protected) ─────── */
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: { id: req.user._id, name: req.user.name, email: req.user.email, lastLogin: req.user.lastLogin },
  });
});

/* ── GET /api/auth/users (protected) ─── */
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      totalUsers: users.length,
      users: users.map(u => ({ id: u._id, name: u.name, email: u.email, lastLogin: u.lastLogin || 'Never', createdAt: u.createdAt })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch users' });
  }
});

/* ── GET /api/auth/allusers (open) ────── 
   Visit: http://localhost:5001/api/auth/allusers
────────────────────────────────────────── */
router.get('/allusers', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      totalUsers: users.length,
      users: users.map(u => ({ id: u._id, name: u.name, email: u.email, lastLogin: u.lastLogin || 'Never logged in', createdAt: u.createdAt })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch users' });
  }
});

/* ── POST /api/auth/forgot ─────────────── */
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your email' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }
    res.json({ success: true, message: 'Email verified! You can now reset your password.', email });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

/* ── POST /api/auth/resetpassword ──────── */
router.post('/resetpassword', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }
    user.password = password; // pre-save hook will hash it
    await user.save();
    res.json({ success: true, message: 'Password reset successfully! You can now sign in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not reset password' });
  }
});

// ⚠️ module.exports MUST be at the very end
module.exports = router;