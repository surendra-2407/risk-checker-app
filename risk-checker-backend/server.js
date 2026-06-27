require('dns').setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS for Atlas SRV
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');

const scanRoutes         = require('./routes/scan');
const commitRoutes       = require('./routes/commits');
const githubRoutes       = require('./routes/github');
const authRoutes         = require('./routes/auth');
const webhooksRoutes     = require('./routes/webhooks');
const signupRoutes       = require('./routes/signup');
const adminRoutes        = require('./routes/admin');
const passwordResetRoutes = require('./routes/password-reset');
const { sendWeeklyDigestEmail } = require('./services/emailService');

// ── STARTUP ENV VALIDATION ───────────────────────────────────────────────────
function validateEnv() {
  const REQUIRED = [
    ['MONGODB_URI',        'MongoDB connection string'],
    ['JWT_SECRET',         'JWT signing secret for admin auth'],
    ['BREVO_API_KEY',      'Brevo transactional email API key'],
    ['GEMINI_API_KEY',     'Google Gemini AI key'],
    ['GITGUARDIAN_API_KEY','GitGuardian secret-scanning key'],
  ];
  const IMPORTANT = [
    ['GITHUB_CLIENT_ID',     'GitHub OAuth client ID'],
    ['GITHUB_CLIENT_SECRET', 'GitHub OAuth client secret'],
    ['GOOGLE_CLIENT_ID',     'Google OAuth client ID'],
    ['GOOGLE_CLIENT_SECRET', 'Google OAuth client secret'],
    ['ADMIN_EMAIL',          'Admin seed email'],
    ['ADMIN_PASSWORD',       'Admin seed password'],
    ['FRONTEND_URL',         'Production frontend URL (CORS)'],
  ];

  let missingRequired = false;
  for (const [key, desc] of REQUIRED) {
    if (!process.env[key]) {
      console.error(`❌ [ENV] MISSING REQUIRED: ${key} — ${desc}`);
      missingRequired = true;
    }
  }
  for (const [key, desc] of IMPORTANT) {
    if (!process.env[key]) {
      console.warn(`⚠️  [ENV] Missing (important): ${key} — ${desc}`);
    }
  }
  if (process.env.JWT_SECRET === 'fallback_admin_secret_key_123') {
    console.error('❌ [ENV] JWT_SECRET is using the insecure fallback! Set a real secret before going to production.');
  }
  if (process.env.NODE_ENV === 'production' && missingRequired) {
    console.error('❌ [ENV] Required environment variables are missing in production. Some features will not work.');
  } else {
    console.log('✅ [ENV] Environment validation passed.');
  }
}
validateEnv();

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

// Rate limiting — global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Please wait 15 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login',          authLimiter);
app.use('/api/auth/signup',         authLimiter);
app.use('/api/auth/verify-code',    authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password',  authLimiter);

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/scan',     scanRoutes);
app.use('/api/commits',  commitRoutes);
app.use('/api/github',   githubRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/auth',     signupRoutes);
app.use('/api/auth',     passwordResetRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/admin',    adminRoutes);

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
      startKeepAlive();
      startWeeklyDigest();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Starting server without database (demo mode)...');
    app.listen(PORT, () => {
      console.log(`🚀 Risk Checker API running on http://localhost:${PORT} (no DB)`);
      startKeepAlive();
      startWeeklyDigest();
    });
  });

// ── KEEP-ALIVE (Render free-tier spin-down prevention) ───────────────────────
// Pings /api/health every 2 minutes so Render stays awake and MongoDB
// connection stays warm. Only runs when RENDER_EXTERNAL_URL is present
// (i.e. on Render). Completely silent on failure — never affects the site.
function startKeepAlive() {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (!RENDER_URL) {
    console.log('ℹ️  Keep-alive disabled (not running on Render)');
    return;
  }

  const pingUrl = `${RENDER_URL.replace(/\/+$/, '')}/api/health`;
  const isHttps  = pingUrl.startsWith('https');
  const client   = isHttps ? https : http;

  const pingBackend = () => {
    client.get(pingUrl, { timeout: 10000 }, (res) => {
      // Drain the response so the socket is released cleanly
      res.resume();
      console.log(`🏓 Keep-alive ping → ${pingUrl} [${res.statusCode}]`);
    }).on('error', () => {
      // Silent — a failed ping should never crash the server
    });
  };

  const pingMongo = async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        console.log('🍃 Keep-alive: MongoDB ping OK');
      }
    } catch (_) {
      // Silent
    }
  };

  // Fire immediately on start, then every 2 minutes
  pingBackend();
  pingMongo();
  setInterval(() => { pingBackend(); pingMongo(); }, 2 * 60 * 1000);

  console.log(`✅ Keep-alive started — pinging every 2 min → ${pingUrl}`);
}

// ── WEEKLY DIGEST CRON ──────────────────────────────────────────────────────
// Sends every verified user a personalised weekly digest every Monday at 9am IST.
// Uses plain setInterval — no extra dependency needed.
function startWeeklyDigest() {
  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // check every hour

  const shouldSendNow = () => {
    // IST = UTC+5:30
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() < 60;
  };

  let lastSentWeek = -1; // tracks ISO week number to avoid double-send

  const getISOWeek = (d) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    return Math.ceil((((date - new Date(Date.UTC(date.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
  };

  const runDigest = async () => {
    if (!shouldSendNow()) return;
    const thisWeek = getISOWeek(new Date());
    if (thisWeek === lastSentWeek) return; // already sent this week
    lastSentWeek = thisWeek;

    console.log('📧 Weekly digest: starting...');
    try {
      const User   = require('./models/User');
      const Commit = require('./models/Commit');

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const users   = await User.find({ isVerified: true, email: { $exists: true } });

      for (const user of users) {
        try {
          const commits = await Commit.find({
            developer_email: user.email,
            timestamp: { $gte: weekAgo }
          });

          if (commits.length === 0) continue; // skip inactive users

          // Aggregate stats
          const totalScans      = commits.length;
          const blockedCommits  = commits.filter(c => !c.commit_allowed).length;
          const allowedCommits  = commits.filter(c =>  c.commit_allowed).length;
          const criticalCount   = commits.reduce((s, c) => s + (c.critical_count || 0), 0);
          const highCount       = commits.reduce((s, c) => s + (c.high_count    || 0), 0);
          const avgRiskScore    = Math.round(commits.reduce((s, c) => s + c.risk_score, 0) / totalScans);

          // Most active repository
          const repoCounts = {};
          commits.forEach(c => { repoCounts[c.repository] = (repoCounts[c.repository] || 0) + 1; });
          const topRepository = Object.entries(repoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

          await sendWeeklyDigestEmail(user.email, user.name, {
            totalScans, blockedCommits, allowedCommits,
            criticalCount, highCount, avgRiskScore, topRepository
          });
        } catch (_) {
          // skip individual user errors silently
        }
      }
      console.log(`✅ Weekly digest sent to ${users.length} users.`);
    } catch (err) {
      console.error('❌ Weekly digest error:', err.message);
    }
  };

  setInterval(runDigest, CHECK_INTERVAL_MS);
  console.log('📅 Weekly digest scheduler started (fires every Monday 9am IST)');
}

module.exports = app;
