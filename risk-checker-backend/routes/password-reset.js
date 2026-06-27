const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const { sendPasswordResetEmail } = require('../services/emailService');

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Generates a secure reset token and emails the user a reset link.
 * Always returns 200 to prevent email enumeration.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond 200 — never reveal whether the email exists (prevents enumeration)
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Only allow password reset for email/password accounts
    if (user.provider !== 'password') {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate a cryptographically secure token
    const resetToken   = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken        = resetToken;
    user.resetTokenExpires = tokenExpires;
    await user.save();

    // Build the reset URL pointing to the frontend
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[Forgot Password] Error:', err.message);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { email, token, newPassword }
 * Validates the token and updates the user's password.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, token and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const user = await User.findOne({
      email:             email.toLowerCase(),
      resetToken:        token,
      resetTokenExpires: { $gt: new Date() }   // token must not be expired
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    // Hash the new password and clear the reset token
    user.password          = await bcrypt.hash(newPassword, 12);
    user.resetToken        = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('[Reset Password] Error:', err.message);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;
