import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Upload, Zap, Code2, Github, Link2, FileCode } from 'lucide-react'
import { apiUrl } from '../lib/api'

const DEMO_SNIPPETS = {
  'Leaked Passwords & API Keys': `const api_key = "SAFE_DEMO_KEY";
const DB_PASSWORD = "SAFE_DEMO_PASSWORD";
const github_token = "SAFE_DEMO_TOKEN";

function processInput(userInput) {
  return eval(userInput);  // dangerous!
}

console.log("Connected with key:", api_key);`,

  'Database Hacks (SQLi)': `app.get('/users', (req, res) => {
  const name = req.query.name;
  const query = "SELECT * FROM users WHERE name = " + name;
  db.execute(query, (err, rows) => res.json(rows));
});`,

  'Malicious Script Injection': `function renderUserContent(data) {
  document.getElementById('app').innerHTML = data.html;
  document.write('<h1>' + data.title + '</h1>');
}

const { exec } = require('child_process');
exec('ls ' + req.body.path, (err, stdout) => {
  res.send(stdout);
});`,

  'Dangerous Configurations': `import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const apiKey = process.env.API_KEY;
const sessionToken = randomBytes(32).toString('hex');

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
`
}

export default function ScanPage() {
  const [tab, setTab]             = useState('github')   // 'github' | 'manual'
  const [githubUrl, setGithubUrl] = useState('')
  const [code, setCode]           = useState('')
  const [fileName, setFileName]   = useState('code-input.js')
  const [loading, setLoading]     = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [scanPhase, setScanPhase] = useState('')
  const [fetching, setFetching]   = useState(false)
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const loadSnippet = (label) => {
    setCode(DEMO_SNIPPETS[label])
    toast.success(`Loaded: ${label}`)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setCode(ev.target.result)
    reader.readAsText(file)
  }

  const runPhases = async () => {
    const phases = [
      'Fetching file from GitHub...',
      'Running 23 detection rules...',
      'Scoring risk level...',
      'Generating AI suggestions...'
    ]
    setScanning(true)
    for (const phase of phases) {
      setScanPhase(phase)
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // ── GitHub URL mode ─────────────────────────────────────────────────────────
  const handleGithubScan = async () => {
    if (!githubUrl.trim()) {
      toast.error('Please enter a GitHub file URL')
      return
    }
    if (!githubUrl.includes('github.com') && !githubUrl.includes('raw.githubusercontent.com')) {
      toast.error('Please enter a valid GitHub URL')
      return
    }
    setLoading(true)
    await runPhases()
    try {
      const res = await axios.post(apiUrl('/api/scan/github-url'), {
        githubUrl: githubUrl.trim(),
        developer: localStorage.getItem('user_name') || 'Anonymous'
      })
      toast.success(`✅ Scan complete! Risk Score: ${res.data.riskScore ?? res.data.risk_score}`)
      navigate('/results', { state: { result: res.data } })
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to scan the GitHub URL'
      toast.error(msg)
    } finally {
      setLoading(false)
      setScanning(false)
      setScanPhase('')
    }
  }

  // ── Manual paste mode ────────────────────────────────────────────────────────
  const handleManualScan = async () => {
    if (!code.trim()) {
      toast.error('Please enter some code to scan')
      return
    }
    setLoading(true)
    const phases = ['Parsing code structure...', 'Running 23 detection rules...', 'Scoring risk level...', 'Generating AI suggestions...']
    setScanning(true)
    for (const phase of phases) {
      setScanPhase(phase)
      await new Promise(r => setTimeout(r, 500))
    }
    try {
      const res = await axios.post(apiUrl('/api/scan'), {
        code,
        developer: localStorage.getItem('user_name') || 'Anonymous',
        email: localStorage.getItem('user_email') || '',
        repository: 'manual-scan',
        branch: 'main',
        fileName,
        linesChanged: code.split('\n').length
      })
      toast.success(`✅ Scan complete! Risk Score: ${res.data.risk_score}`)
      navigate('/results', { state: { result: res.data } })
    } catch (err) {
      toast('Backend not connected — showing demo result', { icon: '⚠️' })
      const fakeResult = buildDemoResult(code, fileName)
      navigate('/results', { state: { result: fakeResult } })
    } finally {
      setLoading(false)
      setScanning(false)
      setScanPhase('')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>Security Scanner</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-label)' }}>
          Scan any GitHub file URL or paste code manually — results in under 3 seconds
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex rounded-xl p-1 mb-6 w-fit gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => setTab('github')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'github'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Github size={15} />
          GitHub URL
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'manual'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 size={15} />
          Paste Code
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── MAIN PANEL ─── */}
        <div className="lg:col-span-2 space-y-4">

          {tab === 'github' ? (
            /* ── GitHub URL Tab ─────────────────────────────────────────── */
            <div className="glass rounded-xl p-6 space-y-5" style={{ border: '1px solid var(--border)' }}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-label)' }}>
                  GitHub File URL
                </label>
                <div className="relative">
                  <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo/blob/main/src/app.js"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono transition-all focus:outline-none"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-label)' }}>
                  Paste the URL of any public GitHub file. The scanner will fetch and analyze the real code.
                </p>
              </div>

              {/* URL Examples */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>📎 Example URLs to try:</p>
                <div className="space-y-2">
                  {[
                    'https://github.com/surendrap227/risk-checker/blob/main/README.md',
                    'https://github.com/facebook/react/blob/main/packages/react/index.js',
                  ].map(url => (
                    <button
                      key={url}
                      onClick={() => setGithubUrl(url)}
                      className="block w-full text-left text-xs font-mono truncate px-3 py-2 rounded-lg transition-all"
                      style={{ color: 'var(--accent)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      {url}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan Button */}
              <button
                onClick={handleGithubScan}
                disabled={loading || !githubUrl.trim()}
                className="w-full btn-primary justify-center py-4 text-base relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanning && <div className="scan-line" />}
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {scanPhase || 'Scanning...'}
                  </>
                ) : (
                  <>
                    <Github size={18} />
                    Fetch & Scan from GitHub
                  </>
                )}
              </button>
            </div>
          ) : (
            /* ── Manual Paste Tab ───────────────────────────────────────── */
            <>
              {/* Demo Snippets */}
              <div className="glass rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-label)' }}>⚡ Load Demo Snippet</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(DEMO_SNIPPETS).map(label => (
                    <button
                      key={label}
                      onClick={() => loadSnippet(label)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium whitespace-nowrap"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-label)'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Editor */}
              <div className="glass rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-label)' }}>
                    <Code2 size={13} /> {fileName}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs flex items-center gap-1 transition-colors font-medium"
                      style={{ color: 'var(--text-label)' }}
                    >
                      <Upload size={12} /> Upload File
                    </button>
                    {code && (
                      <button onClick={() => setCode('')} className="text-xs text-emerald-500 transition-colors font-medium">
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={`// Paste your code here...\n// Or click a demo snippet above\n\nconst api_key = "sk-your-key-here"; // ← will be detected!`}
                  className="w-full h-72 font-mono text-sm p-4 resize-none focus:outline-none placeholder:text-slate-400"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  spellCheck={false}
                />
                <input ref={fileRef} type="file" className="hidden" accept=".js,.ts,.py,.jsx,.tsx,.env,.sh,.java,.go,.rb,.php" onChange={handleFile} />
                <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'var(--bg-card-hover)', borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-label)' }}>{code.split('\n').length} lines · {code.length} chars</span>
                  <span className="text-xs" style={{ color: 'var(--text-label)' }}>JS, TS, PY, ENV, SHELL, GO, JAVA</span>
                </div>
              </div>

              {/* Scan Button */}
              <button
                onClick={handleManualScan}
                disabled={loading || !code.trim()}
                className="w-full btn-primary justify-center py-4 text-base relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanning && <div className="scan-line" />}
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {scanPhase || 'Scanning...'}
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Run Security Scan
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* ── SIDEBAR ─── */}
        <div className="space-y-4">
          {/* How it works */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid var(--border)' }}>
            <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {tab === 'github' ? '🔗 How GitHub Scan Works' : '📋 How It Works'}
            </p>
            {tab === 'github' ? (
              <ol className="space-y-3">
                {[
                  ['1', 'Paste any public GitHub file URL'],
                  ['2', 'Backend fetches the real file content'],
                  ['3', '23 security rules scan the code'],
                  ['4', 'AI generates fix suggestions'],
                  ['5', 'Results saved to your history'],
                ].map(([n, t]) => (
                  <li key={n} className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-label)' }}>
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 text-xs">{n}</span>
                    {t}
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="space-y-3">
                {[
                  ['1', 'Paste or upload your code'],
                  ['2', '23 detection rules scan instantly'],
                  ['3', 'Risk score 0–100 is calculated'],
                  ['4', 'AI suggests fixes per issue'],
                ].map(([n, t]) => (
                  <li key={n} className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-label)' }}>
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 text-xs">{n}</span>
                    {t}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* What we detect */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid var(--border)' }}>
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>What We Detect</p>
            <ul className="space-y-2">
              {[
                ['🔑', 'Exposed Passwords & API Keys'],
                ['💉', 'Database Vulnerabilities (SQLi)'],
                ['🚨', 'Malicious Code Execution'],
                ['⚠️', 'Server Command Hijacking'],
                ['🔓', 'Weak Encryption Methods'],
                ['🐛', 'Leftover Debugging Code'],
              ].map(([icon, label]) => (
                <li key={label} className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-label)' }}>
                  <span>{icon}</span>{label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Demo fallback scanner ────────────────────────────────────────────────────
function buildDemoResult(code, fileName) {
  const issues = []
  const rules = [
    { re: /(api[_-]?key|apikey)\s*[=:]\s*["'`][^"'`\s]{10,}["'`]/gi, type: 'SECRETS', sev: 'Critical', desc: 'Hardcoded API key detected', fix: 'Use process.env.API_KEY' },
    { re: /(password|passwd|pwd|secret)\s*[=:]\s*["'`][^"'`\s]{4,}["'`]/gi, type: 'SECRETS', sev: 'Critical', desc: 'Hardcoded password detected', fix: 'Use a secrets manager' },
    { re: /sk-[a-zA-Z0-9]{20,}/g, type: 'SECRETS', sev: 'Critical', desc: 'OpenAI API key exposed', fix: 'Move to .env file' },
    { re: /ghp_[a-zA-Z0-9]{30,}/g, type: 'SECRETS', sev: 'Critical', desc: 'GitHub token exposed', fix: 'Revoke and use GitHub Secrets' },
    { re: /\beval\s*\(/g, type: 'INJECTION', sev: 'High', desc: 'eval() — arbitrary code execution risk', fix: 'Use JSON.parse() or a function map' },
    { re: /innerHTML\s*=/g, type: 'XSS', sev: 'High', desc: 'innerHTML XSS vector', fix: 'Use textContent or DOMPurify' },
    { re: /document\.write\s*\(/g, type: 'XSS', sev: 'High', desc: 'document.write() detected', fix: 'Use modern DOM APIs' },
    { re: /exec\s*\(/g, type: 'CMD_INJECTION', sev: 'High', desc: 'Shell exec with potential user input', fix: 'Validate all inputs' },
    { re: /console\.(log|warn|error)\s*\(/g, type: 'DEBUG_CODE', sev: 'Low', desc: 'Debug console statement left in code', fix: 'Remove before production' },
  ]
  const lines = code.split('\n')
  for (const rule of rules) {
    rule.re.lastIndex = 0
    const m = rule.re.exec(code)
    if (m) {
      const lineNum = code.slice(0, m.index).split('\n').length
      issues.push({
        issue_type: rule.type, severity: rule.sev, rule_id: '',
        file_name: fileName, line_number: lineNum,
        code_snippet: lines[lineNum - 1]?.trim().slice(0, 150) || m[0].slice(0, 150),
        description: rule.desc, suggested_fix: rule.fix, owasp_ref: 'CWE-798',
        ai_explanation: 'Connect the backend for AI-generated explanations.',
        ai_corrected_code: rule.fix
      })
    }
  }
  const weights = { Critical: 25, High: 15, Medium: 8, Low: 3 }
  const score = Math.min(100, issues.reduce((s, i) => s + (weights[i.severity] || 0), 0))
  const level = score <= 20 ? 'Low' : score <= 50 ? 'Medium' : score <= 75 ? 'High' : 'Critical'
  return {
    success: true, risk_score: score, risk_level: level,
    risk_color: { Low: '#22c55e', Medium: '#eab308', High: '#f97316', Critical: '#ef4444' }[level],
    commit_allowed: score <= 50, total_issues: issues.length,
    severity_counts: issues.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc }, {}),
    developer: localStorage.getItem('user_name') || 'Anonymous',
    repository: 'manual-scan', branch: 'main', fileName,
    timestamp: new Date().toISOString(), issues
  }
}
