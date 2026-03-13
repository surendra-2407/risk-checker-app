const { BrevoClient } = require('@getbrevo/brevo');

const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@riskchecker.dev';
const FROM_NAME  = process.env.BREVO_FROM_NAME  || 'Risk Checker';


/**
 * Sends a verification email with a 6-digit OTP code via Brevo.
 * @param {string} toEmail - recipient email address
 * @param {string} toName  - recipient full name
 * @param {string} otpCode - the 6-digit verification code
 */
async function sendVerificationEmail(toEmail, toName, otpCode) {
  const emailData = {
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail, name: toName }],
    subject: '✅ Verify your Risk Checker account',
    htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf2f2;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #fecaca;overflow:hidden;box-shadow:0 4px 20px rgba(220,38,38,0.08);">
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
              Thanks for signing up! Please enter the following 6-digit verification code to activate your account and start scanning your code.
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
</body>
</html>`
  };

  try {
    await client.transactionalEmails.sendTransacEmail(emailData);
    console.log(`✅ Verification email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('❌ Brevo email error:', err.message || err);
    return false;
  }
}

module.exports = { sendVerificationEmail };
