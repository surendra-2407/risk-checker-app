const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { scanCode } = require('../engine/scanner');
const { calculateRiskScore } = require('../engine/scorer');
const Commit = require('../models/Commit');
const Issue = require('../models/Issue');
const { sendWebhookScanEmail } = require('../services/emailService');

/**
 * POST /api/webhooks/github
 * Receives GitHub push event webhooks, parses the commits, and triggers a background scan.
 */
router.post('/github', async (req, res) => {
  try {
    // 1. Optional Signature Verification
    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    
    if (secret && signature) {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
      if (signature !== digest) {
        console.warn('⚠️ Webhook signature mismatch.');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // 2. Parse payload
    const event = req.headers['x-github-event'];
    if (event !== 'push') {
      return res.status(200).json({ message: 'Ignored non-push event' });
    }

    const payload = req.body;
    const repository = payload.repository?.name || 'unknown-repo';
    const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : 'main';
    const commits = payload.commits || [];

    console.log(`📥 Received push webhook for ${repository} on branch ${branch} with ${commits.length} commits.`);

    // 3. Process commits in background
    if (commits.length > 0) {
      // Respond quickly to GitHub
      res.status(202).json({ message: 'Webhook received. Processing commits in background.' });

      for (const commitData of commits) {
        const developer = commitData.author?.name || 'Webhook User';
        const email = commitData.author?.email || '';
        const commitId = commitData.id;
        
        // For a hackathon/resume project, we simulate downloading the actual patch 
        // by concatenating the modified files names or commit messages as the "code" to scan.
        // In a strictly real-world scenario, we would use GitHub API to fetch the patch text.
        const simulatedCode = commitData.message + '\n' + (commitData.added || []).join('\n') + '\n' + (commitData.modified || []).join('\n');
        
        // Run Scanner
        const regexIssues = scanCode(simulatedCode, 'webhook-patch');
        const { score, level, commit_allowed, counts } = calculateRiskScore(regexIssues, { linesChanged: 10 });

        // Save issues
        const issueIds = [];
        for (const issue of regexIssues) {
          const saved = await new Issue(issue).save();
          issueIds.push(saved._id);
        }

        // Save commit
        const dbCommit = new Commit({
          commit_id: commitId,
          developer_name: developer,
          developer_email: email,
          repository,
          branch,
          risk_score: score,
          risk_level: level,
          total_issues: regexIssues.length,
          critical_count: counts.Critical || 0,
          high_count: counts.High || 0,
          medium_count: counts.Medium || 0,
          low_count: counts.Low || 0,
          files_changed: [...(commitData.added || []), ...(commitData.modified || [])],
          lines_added: 10,
          commit_allowed,
          issues: issueIds
        });
        
        await dbCommit.save();
        console.log(`✅ Webhook Commit ${commitId.slice(0, 8)} saved with Risk Score: ${score}`);

        // Notify the commit author by email (fire-and-forget)
        if (email) {
          sendWebhookScanEmail(
            email,
            developer,
            { repository, branch, commitId },
            { score, level, commit_allowed, counts }
          ).catch(() => {});
        }
      }
    } else {
      res.status(200).json({ message: 'No commits to process.' });
    }

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
});

module.exports = router;
