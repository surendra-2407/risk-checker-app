const express = require('express');
const router = express.Router();
const { scanCode } = require('../engine/scanner');
const { calculateRiskScore } = require('../engine/scorer');
const { enrichWithAI } = require('../services/aiService');
const { scanWithGitGuardian } = require('../services/gitguardianService');
const { getRiskClassification } = require('../services/huggingfaceService');
const Commit = require('../models/Commit');
const Issue = require('../models/Issue');

/**
 * POST /api/scan
 * Body: { code, developer, email, repository, branch, fileName, linesChanged }
 *
 * Pipeline:
 *   1. Regex scanner (23 rules)
 *   2. GitGuardian secret scan (replaces HaveIBeenPwned)
 *   3. Risk score calculation
 *   4. HuggingFace ML classification (secondary signal)
 *   5. OpenAI AI suggestions (top 3 issues)
 *   6. Persist to MongoDB
 */
router.post('/', async (req, res) => {
  try {
    const {
      code = '',
      developer = 'Anonymous',
      email = '',
      repository = 'unknown',
      branch = 'main',
      fileName = 'code-input.js',
      linesChanged = 0
    } = req.body;

    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: 'No code provided to scan' });
    }

    // ── Step 1: Regex-based local scan ──────────────────────────────────────
    const regexIssues = scanCode(code, fileName);

    // ── Step 2: GitGuardian secret scan (runs in parallel with HF) ──────────
    const [ggIssues, mlClassification] = await Promise.all([
      scanWithGitGuardian(code, fileName),
      getRiskClassification(code)
    ]);

    // Merge issues — deduplicate by line_number + issue_type
    const seen = new Set(regexIssues.map(i => `${i.line_number}:${i.issue_type}`));
    const mergedIssues = [...regexIssues];
    for (const gi of ggIssues) {
      const key = `${gi.line_number}:${gi.issue_type}`;
      if (!seen.has(key)) {
        mergedIssues.push(gi);
        seen.add(key);
      }
    }

    // ── Step 3: Risk score ───────────────────────────────────────────────────
    const { score, level, color, emoji, counts, commit_allowed } =
      calculateRiskScore(mergedIssues, { linesChanged: Number(linesChanged) });

    // ── Step 4: OpenAI enrichment (top 3 issues by severity) ────────────────
    const enrichedIssues = await enrichWithAI(mergedIssues, 3);

    // ── Step 5: Persist to MongoDB ───────────────────────────────────────────
    let savedCommitId = null;
    try {
      const savedIssues = await Promise.all(
        enrichedIssues.map(issue => new Issue(issue).save())
      );
      const issueIds = savedIssues.map(i => i._id);

      const commit = new Commit({
        developer_name: developer,
        developer_email: email,
        repository,
        branch,
        risk_score: score,
        risk_level: level,
        total_issues: enrichedIssues.length,
        critical_count: counts.Critical || 0,
        high_count: counts.High || 0,
        medium_count: counts.Medium || 0,
        low_count: counts.Low || 0,
        files_changed: [fileName],
        lines_added: Number(linesChanged),
        commit_allowed,
        issues: issueIds
      });
      await commit.save();
      savedCommitId = commit._id;
    } catch (dbErr) {
      console.warn('[DB] Save skipped:', dbErr.message);
    }

    // ── Step 6: Build and return response ───────────────────────────────────
    res.json({
      success: true,
      commit_id: savedCommitId,
      risk_score: score,
      risk_level: level,
      risk_color: color,
      risk_emoji: emoji,
      commit_allowed,
      total_issues: enrichedIssues.length,
      gitguardian_issues: ggIssues.length,
      severity_counts: counts,
      ml_classification: mlClassification,   // HuggingFace secondary signal
      developer,
      repository,
      branch,
      fileName,
      timestamp: new Date().toISOString(),
      issues: enrichedIssues.map(issue => ({
        issue_type:       issue.issue_type,
        category:         issue.category,
        severity:         issue.severity,
        rule_id:          issue.rule_id || '',
        file_name:        issue.file_name,
        line_number:      issue.line_number,
        code_snippet:     issue.code_snippet,
        description:      issue.description,
        suggested_fix:    issue.suggested_fix,
        owasp_ref:        issue.owasp_ref,
        gg_type:          issue.gg_type || null,
        gg_validity:      issue.gg_validity || null,
        ai_explanation:   issue.ai_explanation || '',
        ai_corrected_code: issue.ai_corrected_code || ''
      }))
    });
  } catch (err) {
    console.error('[Scan] Error:', err);
    res.status(500).json({ error: 'Scan failed', message: err.message });
  }
});

/**
 * POST /api/scan/github-url
 * Body: { githubUrl, developer }
 *
 * Parses a GitHub file URL, fetches real file content via GitHub API,
 * then runs the full scan pipeline on it.
 *
 * Supported URL formats:
 *   https://github.com/owner/repo/blob/branch/path/to/file.js
 *   https://raw.githubusercontent.com/owner/repo/branch/path/to/file.js
 */
router.post('/github-url', async (req, res) => {
  try {
    const { githubUrl, developer = 'Anonymous' } = req.body;

    if (!githubUrl) {
      return res.status(400).json({ error: 'GitHub URL is required.' });
    }

    let rawUrl, owner, repo, branch, filePath, fileName;

    // Parse normal GitHub blob URL
    const blobMatch = githubUrl.match(
      /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/
    );
    // Parse raw URL
    const rawMatch = githubUrl.match(
      /https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/
    );

    if (blobMatch) {
      [, owner, repo, branch, filePath] = blobMatch;
      rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    } else if (rawMatch) {
      [, owner, repo, branch, filePath] = rawMatch;
      rawUrl = githubUrl;
    } else {
      return res.status(400).json({
        error: 'Invalid GitHub URL. Please use a URL like: https://github.com/owner/repo/blob/main/file.js'
      });
    }

    fileName = filePath.split('/').pop();

    // Fetch the raw file content
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    let code;
    try {
      const fileRes = await require('axios').get(rawUrl, { headers, timeout: 15000 });
      code = typeof fileRes.data === 'string' ? fileRes.data : JSON.stringify(fileRes.data);
    } catch (fetchErr) {
      return res.status(400).json({
        error: `Could not fetch file from GitHub: ${fetchErr.response?.status === 404 ? 'File not found or repository is private.' : fetchErr.message}`
      });
    }

    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: 'The file is empty.' });
    }

    // Run the full scan pipeline on the fetched code
    const regexIssues   = scanCode(code, fileName);
    let   allIssues     = [...regexIssues];
    const riskScore     = calculateRiskScore(allIssues);
    const commitAllowed = riskScore < 50;

    let aiSuggestions = [];
    try {
      aiSuggestions = await enrichWithAI(allIssues.slice(0, 5), code);
    } catch (_) {}

    allIssues = allIssues.map((issue, i) => ({
      ...issue,
      suggestion: aiSuggestions[i]?.suggestion || 'Review and address this issue manually.'
    }));

    // Save to DB
    const commitId = require('uuid').v4();
    let savedCommit = null;
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        savedCommit = await Commit.create({
          commitId,
          developer,
          repository: `${owner}/${repo}`,
          branch,
          fileName,
          linesChanged: code.split('\n').length,
          riskScore,
          commitAllowed,
          issueCount: allIssues.length
        });
        if (allIssues.length > 0) {
          await Issue.insertMany(allIssues.map(issue => ({
            commitId,
            ...issue
          })));
        }
      }
    } catch (_) {}

    res.json({
      commitId,
      developer,
      repository: `${owner}/${repo}`,
      branch,
      fileName,
      githubUrl,
      rawUrl,
      linesScanned: code.split('\n').length,
      riskScore,
      commit_allowed: commitAllowed,
      issues: allIssues,
      summary: {
        critical: allIssues.filter(i => i.severity === 'critical').length,
        high:     allIssues.filter(i => i.severity === 'high').length,
        medium:   allIssues.filter(i => i.severity === 'medium').length,
        low:      allIssues.filter(i => i.severity === 'low').length,
      }
    });
  } catch (err) {
    console.error('[GitHub URL Scan] Error:', err);
    res.status(500).json({ error: 'GitHub scan failed.', message: err.message });
  }
});

module.exports = router;
