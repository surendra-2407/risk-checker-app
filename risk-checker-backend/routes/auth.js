const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * GET /api/auth/github
 * Redirects the user to GitHub's OAuth authorization page.
 */
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  
  // Get frontend url dynamically from referer header, fallback to env or localhost
  let frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  if (req.headers.referer) {
    try {
      const parsedReferer = new URL(req.headers.referer);
      frontendUrl = parsedReferer.origin;
    } catch (e) {
      // Fallback used
    }
  }

  let baseUrl = 'http://localhost:5000';
  if (process.env.RENDER_EXTERNAL_URL) {
    baseUrl = process.env.RENDER_EXTERNAL_URL;
  } else if (process.env.API_URL) {
    baseUrl = process.env.API_URL;
  }
  
  const redirectUri = `${baseUrl}/api/auth/github/callback`;
  const state = encodeURIComponent(frontendUrl);
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user&state=${state}`;
  res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/github/callback
 * Handles the redirect back from GitHub, exchanges code for token.
 */
router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  
  // Extract frontend URL from the OAuth state parameter
  let frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  if (state) {
    frontendUrl = decodeURIComponent(state);
  }

  if (!code || !clientId || !clientSecret) {
    return res.redirect(`${frontendUrl}/login?error=github_oauth_failed`);
  }

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = response.data;
    if (!access_token) {
      return res.redirect(`${frontendUrl}/login?error=github_auth_failed`);
    }

    // Fetch the user's GitHub profile
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' }
    });
    const profile = userRes.data;
    const name   = encodeURIComponent(profile.name || profile.login || 'GitHub User');
    const email  = encodeURIComponent(profile.email || '');
    const avatar = encodeURIComponent(profile.avatar_url || '');

    res.redirect(`${frontendUrl}/login?token=${access_token}&provider=github&name=${name}&email=${email}&avatar=${avatar}`);
  } catch (error) {
    console.error('GitHub Auth Error:', error.message);
    res.redirect(`${frontendUrl}/login?error=github_server_error`);
  }
});

/**
 * GET /api/auth/google
 * Redirects the user to Google's OAuth authorization page.
 */
router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Get frontend url dynamically from referer header, fallback to env or localhost
  let frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  if (req.headers.referer) {
    try {
      const parsedReferer = new URL(req.headers.referer);
      frontendUrl = parsedReferer.origin;
    } catch (e) {
      // Fallback used
    }
  }

  if (!clientId) {
    return res.redirect(`${frontendUrl}/login?error=google_oauth_not_configured`);
  }

  let baseUrl = 'http://localhost:5000';
  if (process.env.RENDER_EXTERNAL_URL) {
    baseUrl = process.env.RENDER_EXTERNAL_URL;
  } else if (process.env.API_URL) {
    baseUrl = process.env.API_URL;
  }
  
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const state = encodeURIComponent(frontendUrl);
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile&state=${state}`;
  
  res.redirect(googleAuthUrl);
});

/**
 * GET /api/auth/google/callback
 * Handles the redirect back from Google, exchanges code for token.
 */
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Extract frontend URL from the OAuth state parameter
  let frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  if (state) {
    frontendUrl = decodeURIComponent(state);
  }

  if (!code || !clientId || !clientSecret) {
    return res.redirect(`${frontendUrl}/login?error=google_oauth_failed`);
  }

  try {
    let baseUrl = 'http://localhost:5000';
    if (process.env.RENDER_EXTERNAL_URL) {
      baseUrl = process.env.RENDER_EXTERNAL_URL;
    } else if (process.env.API_URL) {
      baseUrl = process.env.API_URL;
    }
    
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }
    );

    const { access_token } = response.data;
    if (!access_token) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    // Fetch the user's Google profile
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const profile = userRes.data;
    const name   = encodeURIComponent(profile.name || 'Google User');
    const email  = encodeURIComponent(profile.email || '');
    const avatar = encodeURIComponent(profile.picture || '');

    res.redirect(`${frontendUrl}/login?token=${access_token}&provider=google&name=${name}&email=${email}&avatar=${avatar}`);
  } catch (error) {
    console.error('Google Auth Error:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/login?error=google_server_error`);
  }
});

module.exports = router;
