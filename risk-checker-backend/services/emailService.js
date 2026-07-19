const { BrevoClient } = require('@getbrevo/brevo');

// ─────────────────────────────────────────────────────────────────────────────
// Startup validation — warn loudly if email env vars are missing
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.BREVO_API_KEY) {
  console.error('❌ [Email] BREVO_API_KEY is not set — all email sends will fail!');
}
if (!process.env.BREVO_FROM_EMAIL) {
  console.warn('⚠️  [Email] BREVO_FROM_EMAIL is not set — using fallback noreply@riskchecker.dev');
}

const client   = new BrevoClient({ apiKey: process.env.BREVO_API_KEY || '' });
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@riskchecker.dev';
const FROM_NAME  = process.env.BREVO_FROM_NAME  || 'Risk Checker';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function riskColor(level) {
  return { Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#16a34a' }[level] || '#6b7280';
}
function riskBg(level) {
  return { Critical: '#fef2f2', High: '#fff7ed', Medium: '#fffbeb', Low: '#f0fdf4' }[level] || '#f9fafb';
}
function riskEmoji(level) {
  return { Critical: '🚨', High: '⚠️', Medium: '🟡', Low: '✅' }[level] || '🔍';
}

async function send(emailData) {
  // Guard: never attempt to send if API key is missing
  if (!process.env.BREVO_API_KEY) {
    console.error(`❌ [Email] Skipped — BREVO_API_KEY not set. Would have sent to: ${emailData.to?.[0]?.email} [${emailData.subject}]`);
    return false;
  }
  try {
    const result = await client.transactionalEmails.sendTransacEmail(emailData);
    console.log(`✅ Email sent → ${emailData.to[0].email} [${emailData.subject}]`);
    return true;
  } catch (err) {
    // @getbrevo/brevo v5 SDK stores the API error response in err.body (not err.response.body)
    const errBody = err.body || err.response?.body || null;
    console.error(`❌ [Email] Brevo send failed → to: ${emailData.to?.[0]?.email} | subject: ${emailData.subject}`);
    console.error(`❌ [Email] Error: ${err.message || String(err)}`);
    if (errBody) {
      console.error(`❌ [Email] Brevo response body: ${JSON.stringify(errBody)}`);
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Verification OTP Email
// ─────────────────────────────────────────────────────────────────────────────
async function sendVerificationEmail(toEmail, toName, otpCode) {
  console.log(`\n📧 [DEV MODE] Verification OTP for ${toEmail}: ${otpCode}\n`);
  return send({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail, name: toName }],
    subject: '✅ Verify your Risk Checker account',
    htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf2f2;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #fecaca;overflow:hidden;box-shadow:0 4px 20px rgba(220,38,38,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">🛡️</div>
            <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">Risk Checker</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Pre-Commit Security Scanner</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#450a0a;font-size:22px;margin:0 0 12px;">Welcome, ${toName}! 👋</h2>
            <p style="color:#7f1d1d;font-size:15px;line-height:1.6;margin:0 0 28px;">
              Thanks for signing up! Please enter the following 6-digit verification code to activate your account.
            </p>
            <div style="text-align:center;margin:0 0 28px;">
              <div style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:32px;font-family:monospace;letter-spacing:8px;font-weight:900;padding:16px 32px;border-radius:12px;border:2px dashed #fca5a5;">
                ${otpCode}
              </div>
            </div>
            <p style="color:#b91c1c;font-size:13px;text-align:center;margin:0 0 20px;">This code expires in <strong>24 hours</strong>.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #fecaca;text-align:center;">
            <p style="color:#b91c1c;font-size:12px;margin:0;">If you didn't sign up, you can safely ignore this email.</p>
            <p style="color:#fca5a5;font-size:11px;margin:8px 0 0;">© 2025 Risk Checker · Pre-Commit Security Scanner</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Welcome Email (after OTP verified)
// ─────────────────────────────────────────────────────────────────────────────
async function sendWelcomeEmail(toEmail, toName) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return send({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail, name: toName }],
    subject: '🎉 Your Risk Checker account is ready!',
    htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #bbf7d0;overflow:hidden;box-shadow:0 4px 24px rgba(22,163,74,0.10);">
        <tr>
          <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:36px 40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">🛡️</div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">You're all set!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Welcome to Risk Checker, ${toName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 24px;">
            <p style="color:#14532d;font-size:16px;line-height:1.7;margin:0 0 24px;">
              Your account is now verified and active. Here's how to get started in 3 steps:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:14px 20px;background:#f0fdf4;border-radius:10px;border-left:4px solid #16a34a;margin-bottom:12px;display:block;">
                  <strong style="color:#15803d;">Step 1 — Paste your code</strong>
                  <p style="color:#166534;margin:4px 0 0;font-size:13px;">Go to the Scan page and paste any code snippet or provide a GitHub URL.</p>
                </td>
              </tr>
              <tr><td style="height:10px;"></td></tr>
              <tr>
                <td style="padding:14px 20px;background:#fff7ed;border-radius:10px;border-left:4px solid #ea580c;">
                  <strong style="color:#c2410c;">Step 2 — Get your risk report</strong>
                  <p style="color:#9a3412;margin:4px 0 0;font-size:13px;">The AI scanner runs 23+ security rules + GitGuardian secret detection.</p>
                </td>
              </tr>
              <tr><td style="height:10px;"></td></tr>
              <tr>
                <td style="padding:14px 20px;background:#fef2f2;border-radius:10px;border-left:4px solid #dc2626;">
                  <strong style="color:#b91c1c;">Step 3 — Fix issues before committing</strong>
                  <p style="color:#991b1b;margin:4px 0 0;font-size:13px;">Review AI-suggested fixes and secure your code before it hits production.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}/scan" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:700;margin-top:20px;">
              🚀 Start Your First Scan
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #bbf7d0;text-align:center;">
            <p style="color:#86efac;font-size:12px;margin:0;">© 2025 Risk Checker · Pre-Commit Security Scanner</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Scan Result Email
// ─────────────────────────────────────────────────────────────────────────────
async function sendScanResultEmail(toEmail, toName, scanData) {
  if (!toEmail) return false;

  const {
    risk_score, risk_level, commit_allowed,
    repository, branch, fileName,
    severity_counts = {}, issues = [], timestamp
  } = scanData;

  const color  = riskColor(risk_level);
  const bg     = riskBg(risk_level);
  const emoji  = riskEmoji(risk_level);
  const status = commit_allowed
    ? '<span style="color:#16a34a;font-weight:700;">✅ Commit Allowed</span>'
    : '<span style="color:#dc2626;font-weight:700;">🚫 Commit Blocked</span>';

  const topIssues = issues.slice(0, 5).map(i => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">
        <span style="background:${riskBg(i.severity?.charAt(0).toUpperCase() + i.severity?.slice(1))};
          color:${riskColor(i.severity?.charAt(0).toUpperCase() + i.severity?.slice(1))};
          padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;text-transform:uppercase;">
          ${i.severity || 'info'}
        </span>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">
        ${i.issue_type || 'Security Issue'}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280;">
        Line ${i.line_number || '—'}
      </td>
    </tr>`).join('');

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

  return send({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail, name: toName || 'Developer' }],
    subject: `${emoji} Risk Checker Report — ${risk_level} Risk (Score: ${risk_score}/100)`,
    htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:32px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:6px;">🛡️</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Scan Report</h1>
            <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${repository || 'Code Snippet'} · ${branch || 'main'} · ${fileName || ''}</p>
          </td>
        </tr>

        <!-- Risk Score Badge -->
        <tr>
          <td style="padding:32px 40px 0;text-align:center;">
            <div style="display:inline-block;background:${bg};border:2px solid ${color};border-radius:14px;padding:20px 40px;">
              <div style="font-size:48px;font-weight:900;color:${color};line-height:1;">${risk_score}</div>
              <div style="font-size:12px;color:${color};font-weight:600;letter-spacing:1px;text-transform:uppercase;">/ 100 Risk Score</div>
              <div style="font-size:20px;font-weight:800;color:${color};margin-top:6px;">${emoji} ${risk_level} Risk</div>
            </div>
            <div style="margin-top:16px;font-size:16px;">${status}</div>
          </td>
        </tr>

        <!-- Severity Counts -->
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;">
              <tr>
                <td style="background:#fef2f2;padding:14px;text-align:center;width:25%;">
                  <div style="font-size:22px;font-weight:800;color:#dc2626;">${severity_counts.Critical || 0}</div>
                  <div style="font-size:11px;color:#991b1b;font-weight:600;text-transform:uppercase;">Critical</div>
                </td>
                <td style="background:#fff7ed;padding:14px;text-align:center;width:25%;">
                  <div style="font-size:22px;font-weight:800;color:#ea580c;">${severity_counts.High || 0}</div>
                  <div style="font-size:11px;color:#9a3412;font-weight:600;text-transform:uppercase;">High</div>
                </td>
                <td style="background:#fffbeb;padding:14px;text-align:center;width:25%;">
                  <div style="font-size:22px;font-weight:800;color:#d97706;">${severity_counts.Medium || 0}</div>
                  <div style="font-size:11px;color:#92400e;font-weight:600;text-transform:uppercase;">Medium</div>
                </td>
                <td style="background:#f0fdf4;padding:14px;text-align:center;width:25%;">
                  <div style="font-size:22px;font-weight:800;color:#16a34a;">${severity_counts.Low || 0}</div>
                  <div style="font-size:11px;color:#166534;font-weight:600;text-transform:uppercase;">Low</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Top Issues Table -->
        ${topIssues ? `
        <tr>
          <td style="padding:0 40px 24px;">
            <h3 style="color:#1e293b;font-size:15px;margin:0 0 12px;font-weight:700;">Top Issues Detected</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Severity</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Issue</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Location</th>
              </tr>
              ${topIssues}
            </table>
          </td>
        </tr>` : ''}

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${frontendUrl}/scan" style="display:inline-block;background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
              🔍 View Full Report
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">Scanned on ${new Date(timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">© 2025 Risk Checker · Pre-Commit Security Scanner</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Critical Risk Alert Email  (also notifies ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
async function sendCriticalAlertEmail(toEmail, toName, scanData) {
  const {
    risk_score, repository, branch, fileName,
    issues = [], timestamp
  } = scanData;

  const criticalIssues = issues.filter(
    i => (i.severity || '').toLowerCase() === 'critical'
  );

  const issueRows = criticalIssues.slice(0, 6).map(i => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #fecaca;">
        <div style="font-weight:700;color:#7f1d1d;font-size:14px;">${i.issue_type || 'Critical Issue'}</div>
        <div style="color:#991b1b;font-size:12px;margin-top:3px;">Line ${i.line_number || '—'} · ${i.file_name || fileName || ''}</div>
        ${i.description ? `<div style="color:#b91c1c;font-size:12px;margin-top:4px;">${i.description}</div>` : ''}
        ${i.suggested_fix ? `<div style="background:#fef9c3;color:#854d0e;font-size:12px;padding:6px 10px;border-radius:6px;margin-top:6px;"><strong>Fix:</strong> ${i.suggested_fix}</div>` : ''}
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fef2f2;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:2px solid #fca5a5;overflow:hidden;box-shadow:0 4px 32px rgba(220,38,38,0.15);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px 40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">🚨</div>
            <h1 style="color:#fff;margin:0;font-size:26px;font-weight:900;">CRITICAL RISK DETECTED</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${repository || 'Code Scan'} · ${branch || 'main'} · Score: ${risk_score}/100</p>
          </td>
        </tr>

        <!-- Alert Banner -->
        <tr>
          <td style="background:#fef2f2;padding:16px 40px;text-align:center;border-bottom:1px solid #fecaca;">
            <p style="color:#991b1b;font-size:15px;font-weight:700;margin:0;">
              🚫 This commit has been <u>BLOCKED</u>. Immediate action required.
            </p>
          </td>
        </tr>

        <!-- Critical Issues -->
        <tr>
          <td style="padding:28px 40px;">
            <h3 style="color:#7f1d1d;font-size:16px;margin:0 0 14px;">
              ${criticalIssues.length} Critical Issue${criticalIssues.length !== 1 ? 's' : ''} Found
            </h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:10px;overflow:hidden;">
              ${issueRows || '<tr><td style="padding:14px 16px;color:#991b1b;">Critical issues detected — please review your scan dashboard.</td></tr>'}
            </table>
          </td>
        </tr>

        <!-- What to do -->
        <tr>
          <td style="padding:0 40px 28px;">
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;">
              <p style="color:#78350f;font-size:14px;font-weight:700;margin:0 0 8px;">⚡ What to do next:</p>
              <ul style="color:#92400e;font-size:13px;margin:0;padding-left:20px;line-height:1.8;">
                <li>Do <strong>not push</strong> this code to production</li>
                <li>Review and fix all critical issues listed above</li>
                <li>Re-run the scan to confirm risk is resolved</li>
                <li>Contact your security team if needed</li>
              </ul>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #fecaca;text-align:center;">
            <p style="color:#fca5a5;font-size:12px;margin:0;">Detected on ${new Date(timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            <p style="color:#fca5a5;font-size:11px;margin:6px 0 0;">© 2025 Risk Checker · This is an automated security alert.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  const recipients = [{ email: toEmail, name: toName || 'Developer' }];

  // Also CC the admin if configured and different from developer
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && adminEmail !== toEmail) {
    recipients.push({ email: adminEmail, name: 'Admin' });
  }

  return send({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: recipients,
    subject: `🚨 CRITICAL RISK — ${repository || 'Scan'} blocked (Score: ${risk_score}/100)`,
    htmlContent: html
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Webhook Scan Notification Email
// ─────────────────────────────────────────────────────────────────────────────
async function sendWebhookScanEmail(toEmail, developerName, commitData, scanResult) {
  if (!toEmail) return false;

  const { repository, branch, commitId } = commitData;
  const { score, level, commit_allowed, counts } = scanResult;
  const color = riskColor(level);
  const bg    = riskBg(level);
  const emoji = riskEmoji(level);
  const shortId = (commitId || '').slice(0, 8);

  return send({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail, name: developerName || 'Developer' }],
    subject: `${emoji} GitHub Push Scan — ${level} Risk on ${repository}`,
    htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.07);">

        <tr>
          <td style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:6px;">🔗</div>
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800;">GitHub Push Scanned</h1>
            <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${repository} · branch: ${branch}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <div style="display:inline-block;background:${bg};border:2px solid ${color};border-radius:12px;padding:16px 32px;">
              <div style="font-size:40px;font-weight:900;color:${color};line-height:1;">${score}</div>
              <div style="font-size:12px;color:${color};font-weight:600;">/ 100 Risk Score</div>
              <div style="font-size:18px;font-weight:800;color:${color};margin-top:4px;">${emoji} ${level} Risk</div>
            </div>
            <p style="margin:16px 0 0;font-size:15px;font-weight:700;color:${commit_allowed ? '#16a34a' : '#dc2626'};">
              ${commit_allowed ? '✅ Commit Allowed' : '🚫 Commit Blocked'}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr style="background:#f8fafc;">
                <th style="padding:10px;font-size:11px;color:#64748b;text-align:center;font-weight:600;text-transform:uppercase;">Critical</th>
                <th style="padding:10px;font-size:11px;color:#64748b;text-align:center;font-weight:600;text-transform:uppercase;">High</th>
                <th style="padding:10px;font-size:11px;color:#64748b;text-align:center;font-weight:600;text-transform:uppercase;">Medium</th>
                <th style="padding:10px;font-size:11px;color:#64748b;text-align:center;font-weight:600;text-transform:uppercase;">Low</th>
              </tr>
              <tr>
                <td style="padding:12px;text-align:center;font-size:20px;font-weight:800;color:#dc2626;">${counts.Critical || 0}</td>
                <td style="padding:12px;text-align:center;font-size:20px;font-weight:800;color:#ea580c;">${counts.High || 0}</td>
                <td style="padding:12px;text-align:center;font-size:20px;font-weight:800;color:#d97706;">${counts.Medium || 0}</td>
                <td style="padding:12px;text-align:center;font-size:20px;font-weight:800;color:#16a34a;">${counts.Low || 0}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 32px;">
            <div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;">
              <p style="color:#64748b;font-size:12px;margin:0;font-family:monospace;">
                Commit: ${shortId || 'N/A'} &nbsp;|&nbsp; Developer: ${developerName} &nbsp;|&nbsp; ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="color:#cbd5e1;font-size:11px;margin:0;">© 2025 Risk Checker · Automated GitHub Webhook Scan</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Weekly Digest Email
// ─────────────────────────────────────────────────────────────────────────────
async function sendWeeklyDigestEmail(toEmail, toName, stats) {
  if (!toEmail) return false;

  const {
    totalScans = 0, blockedCommits = 0, allowedCommits = 0,
    criticalCount = 0, highCount = 0, topRepository = 'N/A',
    avgRiskScore = 0
  } = stats;

  const weekLabel = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return `${start.toLocaleDateString('en-IN')} – ${now.toLocaleDateString('en-IN')}`;
  })();

  return send({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail, name: toName || 'Developer' }],
    subject: `📊 Your Weekly Risk Checker Digest — ${weekLabel}`,
    htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">📊</div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">Weekly Security Digest</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">${weekLabel}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#1e293b;font-size:15px;margin:0 0 24px;">Hi <strong>${toName}</strong>, here's your security summary for the past week:</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="width:50%;padding-right:8px;">
                  <div style="background:#eff6ff;border-radius:10px;padding:18px;text-align:center;border:1px solid #bfdbfe;">
                    <div style="font-size:32px;font-weight:900;color:#1d4ed8;">${totalScans}</div>
                    <div style="color:#1e40af;font-size:12px;font-weight:600;text-transform:uppercase;margin-top:4px;">Total Scans</div>
                  </div>
                </td>
                <td style="width:50%;padding-left:8px;">
                  <div style="background:#fef2f2;border-radius:10px;padding:18px;text-align:center;border:1px solid #fecaca;">
                    <div style="font-size:32px;font-weight:900;color:#dc2626;">${blockedCommits}</div>
                    <div style="color:#991b1b;font-size:12px;font-weight:600;text-transform:uppercase;margin-top:4px;">Blocked Commits</div>
                  </div>
                </td>
              </tr>
              <tr><td colspan="2" style="height:12px;"></td></tr>
              <tr>
                <td style="width:50%;padding-right:8px;">
                  <div style="background:#f0fdf4;border-radius:10px;padding:18px;text-align:center;border:1px solid #bbf7d0;">
                    <div style="font-size:32px;font-weight:900;color:#16a34a;">${allowedCommits}</div>
                    <div style="color:#166534;font-size:12px;font-weight:600;text-transform:uppercase;margin-top:4px;">Safe Commits</div>
                  </div>
                </td>
                <td style="width:50%;padding-left:8px;">
                  <div style="background:#fff7ed;border-radius:10px;padding:18px;text-align:center;border:1px solid #fed7aa;">
                    <div style="font-size:32px;font-weight:900;color:#ea580c;">${avgRiskScore}</div>
                    <div style="color:#9a3412;font-size:12px;font-weight:600;text-transform:uppercase;margin-top:4px;">Avg Risk Score</div>
                  </div>
                </td>
              </tr>
            </table>

            ${(criticalCount > 0 || highCount > 0) ? `
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
              <p style="color:#991b1b;font-size:14px;font-weight:700;margin:0 0 6px;">⚠️ High Priority Issues This Week</p>
              <p style="color:#7f1d1d;font-size:13px;margin:0;">
                ${criticalCount} Critical &nbsp;·&nbsp; ${highCount} High severity issues detected.
                ${blockedCommits > 0 ? `${blockedCommits} commit${blockedCommits > 1 ? 's were' : ' was'} blocked.` : ''}
              </p>
            </div>` : `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
              <p style="color:#166534;font-size:14px;font-weight:700;margin:0;">🎉 Great week! No critical issues found.</p>
            </div>`}

            <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;">
              <p style="color:#64748b;font-size:13px;margin:0;">
                🗂 Most active repository: <strong style="color:#1e293b;">${topRepository}</strong>
              </p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <a href="${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/scan"
               style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:700;">
              🔍 Start a New Scan
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">© 2025 Risk Checker · You're receiving this because you have an active account.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// 7. Password Reset Email
// ───────────────────────────────────────────────────────────────────────────────
async function sendPasswordResetEmail(toEmail, toName, resetUrl) {
  console.log(`\n📧 [DEV MODE] Password Reset Link for ${toEmail}: ${resetUrl}\n`);
  return send({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail, name: toName || 'User' }],
    subject: '🔐 Reset your Risk Checker password',
    htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #bae6fd;overflow:hidden;box-shadow:0 4px 24px rgba(14,165,233,0.10);">

        <tr>
          <td style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:32px 40px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">🔐</div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">Password Reset</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Risk Checker · Security Request</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 28px;">
            <h2 style="color:#0c4a6e;font-size:18px;margin:0 0 12px;">Hi ${toName || 'there'} 👋</h2>
            <p style="color:#075985;font-size:14px;line-height:1.7;margin:0 0 24px;">
              We received a request to reset your password. Click the button below to choose a new one.
              This link is valid for <strong>1 hour</strong>.
            </p>
            <div style="text-align:center;margin:0 0 24px;">
              <a href="${resetUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
                🔑 Reset My Password
              </a>
            </div>
            <div style="background:#f0f9ff;border-radius:8px;padding:12px 16px;border:1px solid #bae6fd;">
              <p style="color:#0369a1;font-size:12px;margin:0;word-break:break-all;">
                Or copy this link: <a href="${resetUrl}" style="color:#0284c7;">${resetUrl}</a>
              </p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #e0f2fe;text-align:center;">
            <p style="color:#7dd3fc;font-size:12px;margin:0;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
            <p style="color:#bae6fd;font-size:11px;margin:8px 0 0;">© 2025 Risk Checker · Pre-Commit Security Scanner</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Login Notification Email
// ─────────────────────────────────────────────────────────────────────────────
async function sendLoginNotificationEmail(toEmail, toName, { provider = 'password', time, resetUrl }) {
  const providerLabel = provider === 'github' ? '🐙 GitHub' : provider === 'google' ? '🔵 Google' : '🔑 Email & Password';
  const loginTime = time || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
  const safeResetUrl = resetUrl || `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/forgot-password`;

  return send({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail, name: toName }],
    subject: '🔐 New Login to Your Risk Checker Account',
    htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">

      <table width="580" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#15803d,#1DB954);padding:32px 40px;text-align:center;">
            <div style="margin-bottom:12px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="56" height="56" style="display:inline-block;"><rect width="100" height="100" rx="22" ry="22" fill="rgba(255,255,255,0.15)"/><path d="M50 15 L78 26 L78 50 C78 66 65 78 50 84 C35 78 22 66 22 50 L22 26 Z" fill="white" opacity="0.95"/><polyline points="36,50 46,60 64,40" fill="none" stroke="#1DB954" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="78" cy="22" r="10" fill="#A8F7C1"/><circle cx="78" cy="22" r="6" fill="#00C957"/></svg></div>
            <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;letter-spacing:-0.5px;">New Login Detected</h1>
            <p style="color:#a7f3d0;font-size:13px;margin:6px 0 0;">Risk Checker Security Alert</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <h2 style="color:#e2e8f0;font-size:18px;margin:0 0 12px;">Hi ${toName || 'there'} 👋</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px;">
              We noticed a successful login to your Risk Checker account. Here are the details:
            </p>

            <!-- Login Details Card -->
            <div style="background:#0f172a;border-radius:12px;padding:20px 24px;border:1px solid #334155;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;">
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Login Method</span><br>
                    <span style="color:#e2e8f0;font-size:15px;font-weight:600;">${providerLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #1e293b;">
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Time (IST)</span><br>
                    <span style="color:#e2e8f0;font-size:15px;font-weight:600;">${loginTime}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Account</span><br>
                    <span style="color:#e2e8f0;font-size:15px;font-weight:600;">${toEmail}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Security Notice -->
            <div style="background:#1c1917;border:1px solid #78350f;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
              <p style="color:#fbbf24;font-size:13px;margin:0;font-weight:600;">⚠️ Wasn't this you?</p>
              <p style="color:#d97706;font-size:13px;margin:6px 0 0;line-height:1.6;">
                If you didn't log in, your account may be compromised. Reset your password immediately.
              </p>
            </div>

            <!-- Create New Password Button - always visible -->
            <div style="text-align:center;margin-bottom:20px;">
              <a href="${safeResetUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
                Create New Password
              </a>
            </div>

            <!-- If this was you reassurance -->
            <div style="background:#0f2a1a;border:1px solid #166534;border-radius:10px;padding:14px 20px;">
              <p style="color:#4ade80;font-size:13px;margin:0;font-weight:600;">If this login was you</p>
              <p style="color:#86efac;font-size:13px;margin:6px 0 0;line-height:1.6;">
                No action needed - you're all set! This is just a security notification to keep your account safe.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #1e293b;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">If this was you, no action is needed. You're all set!</p>
            <p style="color:#334155;font-size:11px;margin:8px 0 0;">© 2025 Risk Checker · Pre-Commit Security Scanner</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendScanResultEmail,
  sendCriticalAlertEmail,
  sendWebhookScanEmail,
  sendWeeklyDigestEmail,
  sendPasswordResetEmail,
  sendLoginNotificationEmail,
};
