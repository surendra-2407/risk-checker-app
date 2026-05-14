# Risk Checker App — Requirements & Setup Guide

## 📦 Node.js Packages

This project uses **Node.js (v18+)** and **npm**. There is no Python — so instead of a `requirements.txt`, packages are listed below.

---

### 🔧 Backend (`risk-checker-backend/`)

Install with: `cd risk-checker-backend && npm install`

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18.3 | Web server framework |
| `mongoose` | ^8.2.3 | MongoDB ODM |
| `dotenv` | ^16.4.5 | Load `.env` environment variables |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing |
| `helmet` | ^7.1.0 | Security HTTP headers |
| `express-rate-limit` | ^7.2.0 | Rate limiting middleware |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT auth tokens |
| `uuid` | ^9.0.1 | Generate unique IDs |
| `axios` | ^1.13.6 | HTTP client (for external API calls) |
| `@google/generative-ai` | ^0.24.1 | Google Gemini AI SDK |
| `@getbrevo/brevo` | ^5.0.1 | Brevo (SendinBlue) email service |
| `nodemon` *(dev)* | ^3.1.0 | Auto-restart server on file change |

---

### 🎨 Frontend (`risk-checker-frontend/`)

Install with: `cd risk-checker-frontend && npm install`

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | UI library |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `react-router-dom` | ^7.13.1 | Client-side routing |
| `axios` | ^1.13.6 | API calls to backend |
| `recharts` | ^3.8.0 | Charts and analytics |
| `lucide-react` | ^0.577.0 | Icon library |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `jspdf` | ^4.2.0 | Generate PDF reports |
| `jspdf-autotable` | ^5.0.7 | PDF table support |
| `vite` *(dev)* | ^8.0.0 | Frontend build tool |
| `tailwindcss` *(dev)* | ^3.4.19 | CSS utility framework |

---

## 🔑 API Keys Required

Copy `risk-checker-backend/.env.example` → `risk-checker-backend/.env` and fill in:

```env
# ── Server ──────────────────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ── Database ─────────────────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/risk-checker?retryWrites=true&w=majority
# Get from: https://cloud.mongodb.com → Create free cluster → Connect

# ── JWT Secret ───────────────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-jwt-key-here
# Any long random string, e.g.: openssl rand -hex 32

# ── AI / LLM ─────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-proj-your-openai-key-here
# Get from: https://platform.openai.com/api-keys

# ── GitHub Integration ────────────────────────────────────────────────────────
GITHUB_TOKEN=ghp_your-github-token-here
# Get from: https://github.com/settings/tokens → Generate new token (classic)
# Required scopes: repo, read:user

# ── ML Classification (HuggingFace) ──────────────────────────────────────────
HUGGINGFACE_API_KEY=hf_your-huggingface-key-here
# Get from: https://huggingface.co/settings/tokens

# ── Secret Detection (GitGuardian) ────────────────────────────────────────────
GITGUARDIAN_API_KEY=your-gitguardian-api-key-here
# Get from: https://dashboard.gitguardian.com/api → Create API key

# ── Email Service (Brevo / SendinBlue) ───────────────────────────────────────
BREVO_API_KEY=xkeysib-your-brevo-api-key-here
# Get from: https://app.brevo.com/settings/keys/api → Create new API key
```

> ⚠️ **Never commit your `.env` file to GitHub.** It is already in `.gitignore`.

---

## 🚀 How to Run

### 1. Start Backend
```bash
cd risk-checker-backend
npm install     # first time only
npm run dev
# Runs on: http://localhost:5000
```

### 2. Start Frontend
```bash
cd risk-checker-frontend
npm install     # first time only
npm run dev
# Runs on: http://localhost:5173
```

### 3. Seed Admin User (first time only)
```bash
cd risk-checker-backend
node scripts/seedAdmin.js
```

---

## 📁 Project Structure

```
risk-checker-app/
├── risk-checker-backend/       # Node.js + Express API
│   ├── engine/                 # Core scanner & scorer logic
│   ├── models/                 # MongoDB schemas (User, Commit, Issue, Admin)
│   ├── routes/                 # API route handlers
│   ├── scripts/                # Utility scripts (seedAdmin)
│   ├── services/               # External service integrations (AI, GitHub, Email)
│   ├── server.js               # App entry point
│   └── .env.example            # Environment variable template
│
├── risk-checker-frontend/      # React + Vite SPA
│   └── src/
│       ├── components/         # Reusable UI components
│       ├── context/            # React context (ThemeContext)
│       ├── lib/                # API client (axios)
│       └── pages/              # Route pages
│
├── git-hook/                   # Pre-commit git hook for risk checking
│   ├── pre-commit              # The hook script
│   └── install-hook.sh         # Installer script
│
├── render.yaml                 # Render.com deployment config
└── REQUIREMENTS.md             # ← This file
```
