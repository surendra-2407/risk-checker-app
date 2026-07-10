const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Commit = require('../models/Commit');
const Issue = require('../models/Issue');
const Setting = require('../models/Setting');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_admin_secret_key_123';

// Middleware to protect admin routes
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error('Not an admin');
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};

/**
 * POST /api/admin/login
 * Validates admin credentials and returns a JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ error: 'Invalid admin credentials' });

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid admin credentials' });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: { name: admin.name, email: admin.email }
    });
  } catch (err) {
    console.error('[Admin Login Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/stats
 * Returns high-level numbers for the dashboard
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const googleUsers = await User.countDocuments({ provider: 'google' });
    const githubUsers = await User.countDocuments({ provider: 'github' });
    const emailUsers = await User.countDocuments({ provider: 'password' }); // Fixed from 'email' to 'password'
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    const totalScans = await Commit.countDocuments();
    const totalIssues = await Issue.countDocuments();
    
    // NEW: Blocked scans count
    const blockedScans = await Commit.countDocuments({ commit_allowed: false });
    
    // NEW: Average risk score
    const avgScoreResult = await Commit.aggregate([
      { $group: { _id: null, avg: { $avg: "$risk_score" } } }
    ]);
    const avgRiskScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avg) : 0;

    res.json({
      users: {
        total: totalUsers,
        google: googleUsers,
        github: githubUsers,
        email: emailUsers,
        verified: verifiedUsers
      },
      scans: {
        total: totalScans,
        issuesFound: totalIssues,
        blocked: blockedScans,
        avgRiskScore: avgRiskScore
      }
    });
  } catch (err) {
    console.error('[Admin Stats Error]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/users
 * Lists all registered users with their scan activity
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    // NEW: Use aggregation to get user data + scan counts + avg score
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'commits',
          localField: 'email',
          foreignField: 'developer_email',
          as: 'userScans'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          provider: 1,
          avatar: 1,
          isVerified: 1,
          createdAt: 1,
          scanCount: { $size: "$userScans" },
          avgUserScore: { $avg: "$userScans.risk_score" }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(users);
  } catch (err) {
    console.error('[Admin Users Error]', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Suspend or activate a user
 */
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `User status updated to ${status}`, user });
  } catch (err) {
    console.error('[Admin User Status Error]', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a user and their scans
 */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Find all commits by this user's email
    const userCommits = await Commit.find({ developer_email: user.email });
    const commitIds = userCommits.map(c => c.commit_id); // The string commit_id

    // Delete their issues
    await Issue.deleteMany({ commitId: { $in: commitIds } });
    
    // Delete their commits
    await Commit.deleteMany({ developer_email: user.email });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User and all associated scans deleted successfully' });
  } catch (err) {
    console.error('[Admin User Delete Error]', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/scans
 * Lists all scans (commits) along with their issues (recommendations)
 */
router.get('/scans', requireAdmin, async (req, res) => {
  try {
    const scans = await Commit.aggregate([
      { $sort: { timestamp: -1 } }, // Commit uses timestamp instead of createdAt
      { $limit: 100 },
      {
        $lookup: {
          from: 'issues',
          localField: 'commit_id', // Commit uses commit_id
          foreignField: 'commitId',
          as: 'issuesList'
        }
      }
    ]);
    res.json(scans);
  } catch (err) {
    console.error('[Admin Scans Error]', err);
    res.status(500).json({ error: 'Failed to fetch scans' });
  }
});

/**
 * GET /api/admin/settings
 * Get global settings (maintenance_mode, risk_threshold)
 */
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await Setting.find();
    // Default fallback if not found
    const result = {
      maintenance_mode: false,
      risk_threshold: 50
    };
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    res.json(result);
  } catch (err) {
    console.error('[Admin Settings Get Error]', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PATCH /api/admin/settings
 * Update global settings
 */
router.patch('/settings', requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('[Admin Settings Patch Error]', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
