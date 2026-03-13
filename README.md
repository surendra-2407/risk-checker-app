# 🛡️ Pre-Commit Risk Checker

A full-stack MERN security tool that scans your code **before it enters a Git repository** — detecting secrets, vulnerabilities, and unsafe patterns with AI-powered fix suggestions.

---

## 🗂️ Project Structure

```
Resume-1/
├── risk-checker-backend/     # Node.js + Express API
│   ├── server.js
│   ├── engine/
│   │   ├── scanner.js        # 23 regex-based detection rules
│   │   └── scorer.js         # Risk score calculator
│   ├── services/
│   │   └── aiService.js      # OpenAI GPT integration
│   ├── routes/
│   │   ├── scan.js           # POST /api/scan
│   │   └── commits.js        # GET /api/commits, /stats
│   └── models/
│       ├── Commit.js
│       └── Issue.js
├── risk-checker-frontend/    # React + Vite + Tailwind
│   └── src/
│       ├── pages/            # LandingPage, Dashboard, ScanPage, ResultsPage, HistoryPage
│       └── components/       # Navbar, RiskGauge, IssueCard
└── git-hook/
    └── pre-commit            # Git pre-commit shell script
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd risk-checker-backend
cp .env.example .env
# Edit .env: add your MONGODB_URI and OPENAI_API_KEY
npm install
npm start
# → API running at http://localhost:5000
```

### 2. Frontend Setup

```bash
cd risk-checker-frontend
npm install
npm run dev
# → Dashboard at http://localhost:5173
```

### 3. Git Hook Installation (Linux/Mac/WSL)

```bash
cp git-hook/pre-commit /path/to/your-repo/.git/hooks/pre-commit
chmod +x /path/to/your-repo/.git/hooks/pre-commit
```

---

## 🔑 Environment Variables

### Backend `.env`

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `OPENAI_API_KEY` | OpenAI API key for AI suggestions |
| `FRONTEND_URL` | Frontend URL for CORS (default: http://localhost:5173) |

> **Note:** The app works without MongoDB (uses demo data) and without OpenAI (uses static fix suggestions).

---

## 🧪 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/scan` | Scan code for risks |
| GET | `/api/commits` | Paginated commit history |
| GET | `/api/commits/stats` | Dashboard aggregate stats |
| GET | `/api/commits/:id` | Single commit with issues |
| GET | `/api/health` | Health check |

### Scan Request Body

```json
{
  "code": "const api_key = 'sk-abc123';",
  "developer": "Jane Doe",
  "repository": "my-app",
  "branch": "main",
  "fileName": "config.js"
}
```

---

## 🖥️ UI Pages

| Route | Page |
|---|---|
| `/` | Landing Page — hero, features, user flow |
| `/scan` | Code Scan Input — paste/upload code |
| `/results` | Risk Results — gauge, issues, AI fixes |
| `/dashboard` | Analytics — charts, stats, recent commits |
| `/history` | Commit History — filterable, sortable table |

---

## ⚠️ Risk Detection Categories

| Category | Examples | Severity |
|---|---|---|
| Secrets | API keys, passwords, GitHub tokens | Critical |
| Injection | eval(), Function(), innerHTML | High |
| SQL Injection | Dynamic queries with user input | High |
| Command Injection | exec() with user input | High |
| Path Traversal | readFile with user-controlled path | High |
| Cryptography | MD5, Math.random() | Medium |
| Debug Code | console.log, debugger | Low |
| Code Quality | TODO, FIXME comments | Low |

---

## 🏆 Hackathon Demo Script

1. Open `http://localhost:5173` — show the landing page
2. Click **"Run Your First Scan"** → navigate to Scan page
3. Click **"Secrets + Eval"** demo snippet to load risky code
4. Click **"Run Security Scan"** — watch the animated phases
5. Results page shows: Score 82, Critical level, ⛔ Blocked
6. Expand first issue → click **"Show AI Explanation"**
7. Navigate to **Dashboard** → show charts and stats
8. Navigate to **History** → filter by Critical

---

## 🔮 Future Roadmap

- ML-based vulnerability detection (CodeBERT)
- GitHub App for Pull Request integration
- VSCode extension for real-time inline warnings
- Team-level security analytics dashboard
- Slack/Teams alerts for critical commits
