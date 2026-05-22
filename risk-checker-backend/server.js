require('dns').setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS for Atlas SRV
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const scanRoutes = require('./routes/scan');
const commitRoutes = require('./routes/commits');
const githubRoutes = require('./routes/github');
const authRoutes = require('./routes/auth');
const webhooksRoutes = require('./routes/webhooks');
const signupRoutes = require('./routes/signup');
const adminRoutes = require('./routes/admin');

const app = express();

// Trust proxy for Render/Heroku deployments so express-rate-limit gets correct IP
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

app.use(cors({
  origin: frontendOrigin,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/scan', scanRoutes);
app.use('/api/commits', commitRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', signupRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Pre-Commit Risk Checker API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/risk-checker';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  family: 4, // Force IPv4
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`🚀 Risk Checker API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Starting server without database (demo mode)...');
    app.listen(PORT, () => {
      console.log(`🚀 Risk Checker API running on http://localhost:${PORT} (no DB)`);
    });
  });

module.exports = app;
