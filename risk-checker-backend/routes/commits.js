const express = require('express');
const router = express.Router();
const Commit = require('../models/Commit');

// Commits collection operations using MongoDB. If DB fails, empty states are returned.

/**
 * GET /api/commits
 * Returns paginated commit history
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const riskLevel = req.query.risk_level;

    const filter = {};
    if (riskLevel && ['Low', 'Medium', 'High', 'Critical'].includes(riskLevel)) {
      filter.risk_level = riskLevel;
    }

    const [commits, total] = await Promise.all([
      Commit.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      Commit.countDocuments(filter)
    ]);

    res.json({
      commits,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    // Fallback to empty state if DB unavailable
    res.json({
      commits: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 1 },
      error: 'Database connection failed'
    });
  }
});

/**
 * GET /api/commits/stats
 * Returns aggregated dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [total, blocked, avgResult, levelCounts, recentTrend] = await Promise.all([
      Commit.countDocuments(),
      Commit.countDocuments({ commit_allowed: false }),
      Commit.aggregate([{ $group: { _id: null, avg: { $avg: '$risk_score' }, totalCritical: { $sum: '$critical_count' } } }]),
      Commit.aggregate([{ $group: { _id: '$risk_level', count: { $sum: 1 } } }]),
      Commit.find({}, { timestamp: 1, risk_score: 1, risk_level: 1 })
        .sort({ timestamp: -1 }).limit(14).lean()
    ]);

    const avg = avgResult[0]?.avg || 0;
    const totalCritical = avgResult[0]?.totalCritical || 0;

    const levelMap = {};
    for (const l of levelCounts) levelMap[l._id] = l.count;

    res.json({
      total_scans: total,
      commits_blocked: blocked,
      average_risk_score: Math.round(avg * 10) / 10,
      total_critical_issues: totalCritical,
      by_level: { Low: 0, Medium: 0, High: 0, Critical: 0, ...levelMap },
      trend: recentTrend.reverse().map(c => ({
        date: c.timestamp,
        score: c.risk_score,
        level: c.risk_level
      }))
    });
  } catch (err) {
    // Empty stats fallback
    res.json({
      total_scans: 0,
      commits_blocked: 0,
      average_risk_score: 0,
      total_critical_issues: 0,
      by_level: { Low: 0, Medium: 0, High: 0, Critical: 0 },
      trend: [],
      error: 'Database connection failed'
    });
  }
});

/**
 * GET /api/commits/:id
 * Returns a single commit with populated issues
 */
router.get('/:id', async (req, res) => {
  try {
    const commit = await Commit.findById(req.params.id).populate('issues').lean();
    if (!commit) return res.status(404).json({ error: 'Commit not found' });
    res.json(commit);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commit', message: err.message });
  }
});

module.exports = router;
