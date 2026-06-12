// ⚠️ dotenv MUST be loaded first before any other require
const dotenv = require('dotenv');
const path   = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors    = require('cors');

const connectDB     = require('./config/db');
const authRoutes    = require('./routes/authRoutes');
const meetingRoutes = require('./routes/meetingRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// Allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Calendar API is running 🚀' });
});

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/meetings', meetingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅  Server running on http://localhost:${PORT}`);
  console.log(`📅  AI Calendar API ready`);
});