# 🛡️ Risk Checker — Pre-Commit Security Scanner

A full-stack security tool that scans your code for **secrets, vulnerabilities, and risky patterns** before they reach production.  
Works in 3 ways: **Web UI**, **Git Hook**, and **GitHub Webhooks**.

🌐 **Live App:** https://risk-checker-app.vercel.app  
⚙️ **Backend API:** https://risk-checker-app-1.onrender.com

---

## 🚀 Quick Start (Local Dev)

```bash
# 1. Clone the repo
git clone https://github.com/surendra-2407/risk-checker-app.git
cd risk-checker-app

# 2. Setup Backend
cd risk-checker-backend
npm install
cp .env.example .env     # fill in your API keys
npm run dev              # → http://localhost:5000

# 3. Setup Frontend (new terminal)
cd risk-checker-frontend
npm install
npm run dev              # → http://localhost:5173

# 4. Seed admin account (first time only)
cd risk-checker-backend
node scripts/seedAdmin.js
```

---

## 🔁 3 Ways to Use Risk Checker

---

### 1. 🖥️ Web UI — Manual Scan

**Best for:** Developers who want to check code before committing.

**How it works:**
1. Open https://risk-checker-app.vercel.app and log in (Google, GitHub, or Email)
2. Go to the **Scan Code** page
3. Paste your code into the editor
4. Click **Scan** — results appear instantly
5. See your **risk score (0–100)**, risk level, and a full list of issues
6. Download a **PDF report** if needed

**What it detects:**

| Category | Examples |
|---|---|
| 🔴 Secrets | API keys, passwords, tokens hardcoded in code |
| 🔴 Injection | `eval()`, `Function()`, `innerHTML` |
| 🔴 SQL Injection | Dynamic queries built with user input |
| 🔴 Command Injection | `exec()` with unvalidated input |
| 🟡 Cryptography | Weak hashing like MD5, `Math.random()` |
| 🟢 Debug Code | `console.log`, `debugger` statements |
| 🟢 Code Quality | TODO / FIXME comments |

**Risk Score Explained:**

| Score | Level | Commit Allowed? |
|---|---|---|
| 0 – 20 | 🟢 Low | ✅ Yes |
| 21 – 50 | 🟡 Medium | ✅ Yes (with warnings) |
| 51 – 80 | 🔴 High | ⛔ Blocked |
| 81 – 100 | 🔴 Critical | ⛔ Blocked |

---

### 2. 🔗 Git Hook — Automatic Scan on Every Commit

**Best for:** Developers who want risky commits blocked automatically **before** they're pushed.

**How it works:**
1. You install the hook once in your project (takes 30 seconds)
2. Every time you run `git commit`, the hook runs **automatically in the background**
3. Your staged files are sent to the Risk Checker backend for scanning
4. If risk score ≤ 50 → ✅ commit goes through
5. If risk score > 50 → ⛔ commit is **blocked** with a full report

---

#### 📥 Step-by-Step Hook Installation

**Step 1 — Navigate to your project root (where `.git/` folder is):**
```bash
cd /path/to/your-project
```

**Step 2 — Copy the hook file:**

**Mac / Linux / WSL:**
```bash
bash git-hook/install-hook.sh
```

**Windows (PowerShell):**
```powershell
copy git-hook\pre-commit .git\hooks\pre-commit
```

**Step 3 — Point the hook to the live backend (no local server needed):**

Add to your shell profile (`~/.bashrc` or `~/.zshrc`):
```bash
export RISK_CHECKER_API=https://risk-checker-app-1.onrender.com
```

Or apply just for the current session:
```bash
export RISK_CHECKER_API=https://risk-checker-app-1.onrender.com
```

> ℹ️ Without this, the hook defaults to `http://localhost:5000` (requires local backend running).

---

#### 🧪 Testing the Hook

**Test 1 — Safe code (commit should be approved):**
```bash
echo "const greeting = 'hello world';" > test-safe.js
git add test-safe.js
git commit -m "test: safe code"
# Expected: ✅ Commit approved — no security issues detected!
```

**Test 2 — Risky code (commit should be blocked):**
```bash
echo "const API_KEY = 'sk-live-abc123secretkey';" > test-risky.js
git add test-risky.js
git commit -m "test: risky code"
# Expected: ⛔ COMMIT BLOCKED — Risk score exceeds threshold (50)
```

**Test 3 — Verify hook is installed:**
```bash
ls .git/hooks/pre-commit
# Should print: .git/hooks/pre-commit
```

---

#### 📟 Terminal Output

When a commit is **blocked:**
```
🛡️  Pre-Commit Risk Checker — scanning staged changes...
   Developer : Surendra
   Branch    : main
   Repository: my-project

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Risk Score  : 78 / 100
   Risk Level  : Critical
   Total Issues: 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ COMMIT BLOCKED — Risk score (78) exceeds threshold (50)

   → View full report at: https://risk-checker-app.vercel.app/results
   → Fix the issues above and try again, or run:
     git commit --no-verify   (force commit, NOT recommended)
```

When a commit is **approved:**
```
✅ Commit approved — no security issues detected!
```

**To bypass the hook (emergency only):**
```bash
git commit --no-verify
```

> ⚠️ If the backend is offline, the hook automatically allows the commit — it will never block your workflow unexpectedly.

---

### 3. 🪝 GitHub Webhook — Automatic Scan on Push

**Best for:** Teams who want every push to GitHub to be scanned automatically.

**How it works:**
1. GitHub sends a notification to the backend whenever code is pushed
2. The backend scans the commit automatically
3. Results are stored in the database
4. Admin can view all scans from the **Admin Dashboard**
5. The commit author receives an email with the scan results

**How to set up:**
1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
2. Set **Payload URL** to:
   ```
   https://risk-checker-app-1.onrender.com/api/webhooks/github
   ```
3. Set **Content type** to `application/json`
4. Choose events: **Just the push event**
5. Click **Add webhook**

---

## 👤 User Roles

| Role | Access |
|---|---|
| **User** | Login, scan code, view own history, download PDF report |
| **Admin** | All of the above + view all users' scans, full analytics dashboard |

**Login options:**
- 📧 Email & Password (with email verification)
- Continue with Google (OAuth)
- Continue with GitHub (OAuth)

---

## 🔑 Environment Variables

Copy `risk-checker-backend/.env.example` → `risk-checker-backend/.env` and fill in:

```env
# ── Server ───────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ── Database ─────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/risk-checker

# ── Security ─────────────────────────────────────────────────
JWT_SECRET=any_long_random_64_char_string

# ── AI (Google Gemini) ───────────────────────────────────────
GEMINI_API_KEY=AIzaSy...         # From aistudio.google.com

# ── GitHub OAuth + API ───────────────────────────────────────
GITHUB_TOKEN=ghp_...             # From github.com/settings/tokens
GITHUB_CLIENT_ID=...             # From GitHub OAuth App
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
GITHUB_WEBHOOK_SECRET=...        # Optional — for webhook HMAC signature verification

# ── Google OAuth ─────────────────────────────────────────────
GOOGLE_CLIENT_ID=...             # From console.cloud.google.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ── Secret Detection ─────────────────────────────────────────
GITGUARDIAN_API_KEY=...          # From dashboard.gitguardian.com

# ── ML Classification ────────────────────────────────────────
HUGGINGFACE_API_KEY=hf_...       # From huggingface.co/settings/tokens

# ── Email (Brevo) ────────────────────────────────────────────
BREVO_API_KEY=xkeysib-...        # From app.brevo.com
BREVO_FROM_EMAIL=you@gmail.com
BREVO_FROM_NAME=Risk Checker

# ── Admin Seed ───────────────────────────────────────────────
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourAdminPassword
```

Frontend `.env` (`risk-checker-frontend/.env`):
```env
VITE_API_URL=http://localhost:5000
```

> ⚠️ **Never commit your `.env` file.** It is already in `.gitignore`.

**For Production (Render):** Use `https://risk-checker-app-1.onrender.com` as callback URLs and set `FRONTEND_URL=https://risk-checker-app.vercel.app`.

---

## 📁 Project Structure

```
risk-checker-app/
├── risk-checker-backend/       # Node.js + Express API (port 5000)
│   ├── engine/                 # Scanner & risk scorer logic
│   ├── models/                 # MongoDB schemas (User, Commit, Issue, Admin)
│   ├── routes/                 # API endpoints
│   ├── scripts/                # seedAdmin.js
│   ├── services/               # AI, GitHub, Email integrations
│   └── server.js               # App entry point
│
├── risk-checker-frontend/      # React 19 + Vite 8 + TailwindCSS
│   └── src/
│       ├── pages/              # All page components
│       ├── components/         # Navbar, IssueCard, RiskGauge etc.
│       └── lib/                # API client (api.js)
│
├── git-hook/                   # Pre-commit hook files
│   ├── pre-commit              # The hook script (sh)
│   └── install-hook.sh         # Installer (Mac/Linux/WSL)
│
├── render.yaml                 # Render.com deployment config
└── REQUIREMENTS.md             # Full package list & setup guide
```

---

## 🆚 Risk Checker vs `.gitignore` — What's the Difference?

| Feature | `.gitignore` | Risk Checker |
|---|---|---|
| Hides `.env` file from Git | ✅ Yes | ❌ Not its job |
| Detects API keys **hardcoded inside** `.js` files | ❌ No | ✅ Yes |
| Detects SQL injection patterns in code | ❌ No | ✅ Yes |
| Detects `eval()`, `innerHTML` abuse | ❌ No | ✅ Yes |
| Blocks risky commits automatically | ❌ No | ✅ Yes (via hook) |
| Emails developer on risky push | ❌ No | ✅ Yes (via webhook) |

**Summary:** `.gitignore` hides entire files from Git. Risk Checker scans the **content inside** your committed files for security issues. Use both together for maximum safety.
