/**
 * GitHub API Service
 * Fetches repository metadata and commit information using the GitHub REST API v3.
 * Used for enriching scan results with real repo context.
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const BASE_URL     = 'api.github.com';

/**
 * Generic GitHub API GET helper.
 */
function githubGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path,
      method:  'GET',
      headers: {
        'User-Agent':    'PreCommitRiskChecker/1.0',
        'Accept':        'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN && { 'Authorization': `Bearer ${GITHUB_TOKEN}` })
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { reject(new Error('JSON parse failed: ' + e.message)); }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('GitHub API timeout')); });
    req.end();
  });
}

/**
 * Get basic repository metadata.
 * @param {string} owner
 * @param {string} repo
 */
async function getRepoInfo(owner, repo) {
  if (!owner || !repo) return null;
  try {
    const res = await githubGet(`/repos/${owner}/${repo}`);
    if (res.status !== 200) return null;
    const d = res.data;
    return {
      full_name:        d.full_name,
      description:      d.description,
      language:         d.language,
      stars:            d.stargazers_count,
      forks:            d.forks_count,
      open_issues:      d.open_issues_count,
      default_branch:   d.default_branch,
      private:          d.private,
      html_url:         d.html_url,
      topics:           d.topics || []
    };
  } catch (e) {
    console.warn('[GitHub] getRepoInfo failed:', e.message);
    return null;
  }
}

/**
 * Get the last N commits for a repository.
 * @param {string} owner
 * @param {string} repo
 * @param {number} perPage
 */
async function getRecentCommits(owner, repo, perPage = 10) {
  if (!owner || !repo) return [];
  try {
    const res = await githubGet(`/repos/${owner}/${repo}/commits?per_page=${perPage}`);
    if (res.status !== 200) return [];
    return res.data.map(c => ({
      sha:     c.sha?.slice(0, 8),
      message: c.commit?.message?.split('\n')[0],
      author:  c.commit?.author?.name,
      date:    c.commit?.author?.date,
      url:     c.html_url
    }));
  } catch (e) {
    console.warn('[GitHub] getRecentCommits failed:', e.message);
    return [];
  }
}

/**
 * Get authenticated user info (verifies token is valid).
 */
async function getAuthenticatedUser() {
  if (!GITHUB_TOKEN) return null;
  try {
    const res = await githubGet('/user');
    if (res.status !== 200) return null;
    return {
      login:      res.data.login,
      name:       res.data.name,
      avatar_url: res.data.avatar_url,
      public_repos: res.data.public_repos
    };
  } catch (e) {
    console.warn('[GitHub] Auth check failed:', e.message);
    return null;
  }
}

module.exports = { getRepoInfo, getRecentCommits, getAuthenticatedUser };
