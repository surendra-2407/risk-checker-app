const express = require('express');
const axios = require('axios');
const router = express.Router();
const { sendLoginNotificationEmail } = require('../services/emailService');

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

  // Use explicit callback URL from env (must match what's registered in GitHub OAuth App)
  let redirectUri = process.env.GITHUB_CALLBACK_URL;
  if (!redirectUri) {
    let baseUrl = 'http://localhost:5000';
    if (process.env.RENDER_EXTERNAL_URL) {
      baseUrl = process.env.RENDER_EXTERNAL_URL;
    } else if (process.env.API_URL) {
      baseUrl = process.env.API_URL;
    }
    baseUrl = baseUrl.replace(/\/+$/, '');
    redirectUri = `${baseUrl}/api/auth/github/callback`;
  }

  console.log('[GitHub OAuth] redirect_uri:', redirectUri);
  const state = encodeURIComponent(frontendUrl);
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;
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

    // Some GitHub accounts hide their email on the /user endpoint.
    // Fall back to /user/emails to get the primary verified email.
    let primaryEmail = profile.email || '';
    if (!primaryEmail) {
      try {
        const emailsRes = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' }
        });
        const primary = emailsRes.data.find(e => e.primary && e.verified);
        primaryEmail = primary?.email || emailsRes.data[0]?.email || '';
      } catch (_) {
        // silently ignore — email stays empty
      }
    }

    const name   = encodeURIComponent(profile.name || profile.login || 'GitHub User');
    const email  = encodeURIComponent(primaryEmail);
    const avatar = encodeURIComponent(profile.avatar_url || '');

    // 🔐 Fire-and-forget login notification — now always fires if email is available
    if (primaryEmail) {
      const resetUrl = `${frontendUrl}/forgot-password`;
      sendLoginNotificationEmail(primaryEmail, profile.name || profile.login || 'GitHub User', { provider: 'github', resetUrl }).catch(() => {});
    }

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

  // Use explicit callback URL from env (must match what's registered in Google Cloud Console)
  let redirectUri = process.env.GOOGLE_CALLBACK_URL;
  if (!redirectUri) {
    let baseUrl = 'http://localhost:5000';
    if (process.env.RENDER_EXTERNAL_URL) {
      baseUrl = process.env.RENDER_EXTERNAL_URL;
    } else if (process.env.API_URL) {
      baseUrl = process.env.API_URL;
    }
    redirectUri = `${baseUrl}/api/auth/google/callback`;
  }

  console.log('[Google OAuth] redirect_uri:', redirectUri);
  const state = encodeURIComponent(frontendUrl);
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&state=${state}&prompt=select_account`;
  
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
    // Must use the exact same redirect_uri as the initial /google request
    let redirectUri = process.env.GOOGLE_CALLBACK_URL;
    if (!redirectUri) {
      let baseUrl = 'http://localhost:5000';
      if (process.env.RENDER_EXTERNAL_URL) {
        baseUrl = process.env.RENDER_EXTERNAL_URL;
      } else if (process.env.API_URL) {
        baseUrl = process.env.API_URL;
      }
      redirectUri = `${baseUrl}/api/auth/google/callback`;
    }
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

    // 🔐 Fire-and-forget login notification
    if (profile.email) {
      const resetUrl = `${frontendUrl}/forgot-password`;
      sendLoginNotificationEmail(profile.email, profile.name || 'Google User', { provider: 'google', resetUrl }).catch(() => {});
    }

    res.redirect(`${frontendUrl}/login?token=${access_token}&provider=google&name=${name}&email=${email}&avatar=${avatar}`);
  } catch (error) {
    console.error('Google Auth Error:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/login?error=google_server_error`);
  }
});

module.exports = router;
