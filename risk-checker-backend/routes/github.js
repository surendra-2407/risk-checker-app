const express = require('express');
const router = express.Router();
const { getRepoInfo, getRecentCommits, getAuthenticatedUser } = require('../services/githubService');

/**
 * GET /api/github/user
 * Validates the GitHub token and returns the authenticated user's profile.
 */
router.get('/user', async (req, res) => {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return res.status(401).json({ error: 'GitHub token invalid or not configured.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/github/repo?owner=:owner&repo=:repo
 * Returns metadata for a GitHub repository.
 */
router.get('/repo', async (req, res) => {
  const { owner, repo } = req.query;
  if (!owner || !repo) return res.status(400).json({ error: 'owner and repo query params required' });
  try {
    const info = await getRepoInfo(owner, repo);
    if (!info) return res.status(404).json({ error: 'Repository not found or token lacks access' });
    res.json({ success: true, repo: info });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/github/commits?owner=:owner&repo=:repo&limit=10
 * Returns the most recent commits for a repository.
 */
router.get('/commits', async (req, res) => {
  const { owner, repo, limit = 10 } = req.query;
  if (!owner || !repo) return res.status(400).json({ error: 'owner and repo query params required' });
  try {
    const commits = await getRecentCommits(owner, repo, Number(limit));
    res.json({ success: true, commits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
