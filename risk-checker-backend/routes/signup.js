const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const User    = require('../models/User');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/emailService');

/**
 * POST /api/auth/signup
 * Creates a new user, hashes password, sends verification email via Brevo.
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.provider !== 'password') {
        return res.status(409).json({
          error: `This email is already registered via ${existing.provider}. Please log in with ${existing.provider}.`
        });
      }
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate 6-digit OTP verification code
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Save user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      provider: 'password',
      isVerified: false,
      verificationToken,
      verificationExpires,
    });
    await user.save();

    // Send verification email with OTP code instead of URL
    await sendVerificationEmail(email, name, verificationToken);

    res.status(201).json({
      success: true,
      message: `Verification email sent to ${email}. Please check your inbox!`
    });
  } catch (err) {
    console.error('[Signup] Error:', err.message);
    res.status(500).json({ error: 'Signup failed.', message: err.message });
  }
});

/**
 * POST /api/auth/verify-code
 * Body: { email, code }
 * Verifies the 6-digit OTP code, marks isVerified=true, and returns user data.
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationToken: code,
      verificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();

    // Send welcome email (fire-and-forget — never blocks the response)
    sendWelcomeEmail(user.email, user.name).catch(() => {});

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        provider: user.provider
      }
    });
  } catch (err) {
    console.error('[Verify Code] Error:', err.message);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

module.exports = router;
