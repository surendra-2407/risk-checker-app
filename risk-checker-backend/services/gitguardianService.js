/**
 * GitGuardian Service
 * Replaces HaveIBeenPwned — uses GitGuardian's /v1/scan endpoint to detect
 * exposed secrets/credentials in code snippets.
 * Docs: https://api.gitguardian.com/docs
 */

const https = require('https');

const GITGUARDIAN_API = 'api.gitguardian.com';
const GITGUARDIAN_KEY = process.env.GITGUARDIAN_API_KEY;

/**
 * Scan a code snippet through GitGuardian's secret detection API.
 * @param {string} code       - raw source code to scan
 * @param {string} fileName   - filename for context (e.g., 'config.js')
 * @returns {Promise<Array>}  - array of GitGuardian policy breaks, or []
 */
async function scanWithGitGuardian(code, fileName = 'code-snippet.js') {
  if (!GITGUARDIAN_KEY) {
    console.warn('[GitGuardian] No API key configured — skipping GG scan.');
    return [];
  }

  const payload = JSON.stringify({
    document: {
      content:  code,
      filename: fileName
    },
    extra_headers: {}
  });

  return new Promise((resolve) => {
    const options = {
      hostname: GITGUARDIAN_API,
      path:     '/v1/scan',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization':  `Token ${GITGUARDIAN_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (!json.policy_break_count || json.policy_break_count === 0) {
            return resolve([]);
          }
          // Map GitGuardian policy breaks → our issue format
          const breaks = (json.policies_breaks || json.policy_breaks || []).map(pb => ({
            issue_type:     'GG_' + (pb.policy || 'SECRET').toUpperCase().replace(/\s+/g, '_'),
            category:       'GitGuardian Secret',
            severity:       mapGGSeverity(pb.policy),
            file_name:      fileName,
            line_number:    pb.matches?.[0]?.line_start || 0,
            code_snippet:   pb.matches?.[0]?.match?.slice(0, 200) || '',
            description:    `GitGuardian detected: ${pb.policy || 'Secret'}`,
            suggested_fix:  'Remove this secret immediately and rotate/revoke it.',
            owasp_ref:      'CWE-798',
            gg_type:        pb.type,
            gg_validity:    pb.validity,
            ai_explanation: '',
            ai_corrected_code: ''
          }));
          resolve(breaks);
        } catch (e) {
          console.error('[GitGuardian] Parse error:', e.message);
          resolve([]);
        }
      });
    });

    req.on('error', (e) => {
      console.error('[GitGuardian] Request error:', e.message);
      resolve([]);
    });

    req.setTimeout(8000, () => {
      console.warn('[GitGuardian] Request timed out.');
      req.destroy();
      resolve([]);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Map GitGuardian policy names to our severity levels.
 */
function mapGGSeverity(policy = '') {
  const p = policy.toLowerCase();
  if (p.includes('private_key') || p.includes('rsa') || p.includes('secret_key')) return 'Critical';
  if (p.includes('api') || p.includes('token') || p.includes('password'))           return 'Critical';
  if (p.includes('credential') || p.includes('oauth'))                              return 'High';
  return 'High';
}

module.exports = { scanWithGitGuardian };
