# 🛡️ Risk Checker — Pre-Commit Security Scanner

A security tool that scans your code for vulnerabilities **before** they reach production.  
Works in 3 ways: Web UI, Git Hook, and GitHub Webhooks.

---

## 🚀 Quick Start

```bash
# 1. Start Backend
cd risk-checker-backend
npm install
npm run dev
# Runs on → http://localhost:5000

# 2. Start Frontend
cd risk-checker-frontend
npm install
npm run dev
# Runs on → http://localhost:5173

# 3. (First time only) Seed the admin account
cd risk-checker-backend
node scripts/seedAdmin.js
```

---

## 🔁 3 Ways to Use Risk Checker

---

### 1. 🖥️ Web UI — Manual Scan

**Best for:** Developers who want to check code before committing.

**How it works:**
1. Open `http://localhost:5173` and log in
2. Go to the **Scan Code** page
3. Paste your code into the editor
4. Click **Scan** — results appear instantly
5. See your **risk score (0–100)**, risk level, and a list of issues found

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

---

### 2. 🔗 Git Hook — Automatic Scan on Every Commit

**Best for:** Teams that want to block risky commits automatically.

**How it works:**
1. Install the hook once on your machine
2. Every time you run `git commit`, the hook runs **automatically**
3. Your staged code is sent to the backend for scanning
4. If risk score ≤ 50 → ✅ commit goes through
5. If risk score > 50 → ⛔ commit is **blocked** with a report

**How to install:**

**Mac / Linux / WSL:**
```bash
# Run from the root of your project
bash git-hook/install-hook.sh
```

**Windows (PowerShell):**
```powershell
copy git-hook\pre-commit .git\hooks\pre-commit
```

**What you see in terminal when a commit is blocked:**
```
🛡️  Pre-Commit Risk Checker — scanning staged changes...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Risk Score  : 78 / 100
   Risk Level  : Critical
   Total Issues: 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ COMMIT BLOCKED — Risk score (78) exceeds threshold (50)
   → View full report at: http://localhost:5173/results
   → Fix issues and try again
```

**To bypass the hook (not recommended):**
```bash
git commit --no-verify
```

> ⚠️ The backend must be running (`npm run dev`) for the hook to work.  
> If the backend is offline, the hook allows the commit automatically.

---

### 3. 🪝 GitHub Webhook — Automatic Scan on Push / Pull Request

**Best for:** Teams who want every push or PR on GitHub to be scanned automatically.

**How it works:**
1. GitHub sends a notification to your backend whenever code is pushed or a PR is opened
2. The backend scans the code diff automatically
3. Results are stored in the database
4. Admin can view all scans across all repositories from the **Admin Dashboard**

**How to set up:**
1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
2. Set **Payload URL** to:
   ```
   https://your-backend-domain.com/api/webhooks
   ```
3. Set **Content type** to `application/json`
4. Choose events: **Pushes** and **Pull Requests**
5. Click **Add webhook**

> 💡 For local testing use [ngrok](https://ngrok.com/) to expose your localhost:
> ```bash
> ngrok http 5000
> # Use the generated URL as your webhook payload URL
> ```

---

## 👤 User Roles

| Role | Access |
|---|---|
| **User** | Login, scan code, view history |
| **Admin** | All of the above + view all users' scans, analytics, manage system |

**Login options:**
- Email & Password
- Continue with Google (OAuth)
- Continue with GitHub (OAuth)

---

## 🔑 Environment Variables

Copy `.env.example` → `.env` in the backend folder and fill in:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=any_long_random_string

OPENAI_API_KEY=sk-...         # From platform.openai.com
GITHUB_TOKEN=ghp_...          # From github.com/settings/tokens
HUGGINGFACE_API_KEY=hf_...    # From huggingface.co/settings/tokens
GITGUARDIAN_API_KEY=...       # From dashboard.gitguardian.com
BREVO_API_KEY=...             # From app.brevo.com (for emails)

GITHUB_CLIENT_ID=...          # For GitHub OAuth login
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...          # For Google OAuth login
GOOGLE_CLIENT_SECRET=...
```

---

## 📁 Project Structure

```
risk-checker-app/
├── risk-checker-backend/       # Node.js + Express API
│   ├── engine/                 # Scanner & risk scorer logic
│   ├── models/                 # MongoDB schemas
│   ├── routes/                 # API endpoints
│   ├── services/               # AI, GitHub, Email integrations
│   └── server.js
│
├── risk-checker-frontend/      # React + Vite web app
│   └── src/
│       ├── pages/              # All page components
│       ├── components/         # Navbar, cards, gauge etc.
│       └── lib/                # API client
│
└── git-hook/                   # Pre-commit hook files
    ├── pre-commit              # The hook script
    └── install-hook.sh         # Installer (Mac/Linux)
```
