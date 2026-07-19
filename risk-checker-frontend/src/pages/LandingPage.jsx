import { Link } from 'react-router-dom'
import {
  Shield, Zap, Eye, TrendingUp, Lock, GitCommit, CheckCircle, ArrowRight
} from 'lucide-react'

const FEATURES = [
  { icon: Lock,       title: 'Secret Detection',      desc: 'Catches API keys, passwords, tokens, and private keys before they leave your machine.' },
  { icon: Shield,     title: 'Vulnerability Scanning', desc: 'Detects SQL injection, XSS, eval() usage, command injection, and path traversal.' },
  { icon: Zap,        title: 'Instant Risk Score',     desc: 'Every commit gets a 0–100 risk score with Critical / High / Medium / Low breakdown.' },
  { icon: Eye,        title: 'AI Fix Suggestions',     desc: 'GPT-powered explanations and corrected code for every detected vulnerability.' },
  { icon: TrendingUp, title: 'Trend Dashboard',        desc: 'Track your team\'s security posture over time with interactive charts and commit history.' },
  { icon: GitCommit,  title: 'Git Hook Integration',   desc: 'Drop-in pre-commit hook — blocks risky commits with zero configuration required.' },
]

const FLOW_STEPS = [
  { step: '01', label: 'Write Code', desc: 'Developer stages files with git add' },
  { step: '02', label: 'Hook Fires', desc: 'Pre-commit shell script activates' },
  { step: '03', label: 'Scan Runs',  desc: 'Backend applies 30 detection rules' },
  { step: '04', label: 'AI Explains', desc: 'GPT analyzes top issues and suggests fixes' },
  { step: '05', label: 'Decision',   desc: 'Commit allowed or blocked based on score' },
]

const DEMO_CODE = `// ⚠️  RISKY CODE — TRY SCANNING THIS!
const api_key = "SAFE_DEMO_KEY";
const password = "SAFE_DEMO_PASSWORD";

function search(userInput) {
  const query = "SELECT * FROM users WHERE name = " + userInput;
  return eval(query);
}

console.log("Debug:", api_key);`

export default function LandingPage() {
  return (
    <div className="animate-fade-in">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32 text-center">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">

          {/* Static badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI-Powered Security Scanner
          </div>

          {/* Fixed single-line hero title — no br, no changing text */}
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-4">
            Catch Risks Before They Ship
          </h1>

          {/* Static highlighted keyword with shimmer underline — no text changes */}
          <p className="text-xl md:text-2xl font-semibold mb-6">
            <span className="hero-highlight">Secure every commit automatically.</span>
          </p>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Pre-Commit Risk Checker intercepts your Git commits and scans for secrets,
            vulnerabilities, and unsafe code — with AI-powered fix suggestions in under 3 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="btn-primary text-base px-8 py-3">
              <Zap size={18} />
              Start Scanning Now
              <ArrowRight size={16} />
            </Link>
            <Link to="/dashboard" className="btn-ghost text-base px-8 py-3">
              <TrendingUp size={16} />
              View Dashboard
            </Link>
          </div>

          {/* Live stats */}
          <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
            {[
              { val: '30+', label: 'Detection Rules' },
              { val: '<3s', label: 'Scan Time' },
              { val: 'GPT', label: 'AI Suggestions' },
              { val: '5✕', label: 'Risk Categories' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black gradient-text">{s.val}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO CODE PREVIEW ─────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="glass rounded-2xl overflow-hidden border border-emerald-500/20">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-800/80 border-b border-slate-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-3 text-xs text-slate-400 font-mono">config.js — 5 risks detected</span>
            <div className="ml-auto badge-critical">🔴 Score: 82</div>
          </div>
          <pre className="code-block rounded-none p-6 text-sm overflow-auto border-none">
            <code>{DEMO_CODE}</code>
          </pre>
          <div className="px-5 py-3 bg-emerald-500/5 border-t border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">⛔ Commit blocked — 3 Critical, 1 High, 1 Low issue</span>
            <Link to="/login" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Scan this code <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Everything you need to ship safely</h2>
          <p className="text-slate-600">Six powerful layers of protection, built for developer speed.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-6 group hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1">
              <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
                <Icon size={22} className="text-blue-400" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── USER FLOW ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
          <p className="text-slate-600">Zero-friction security in 5 automatic steps.</p>
        </div>
        <div className="flex flex-col md:flex-row items-start gap-0">
          {FLOW_STEPS.map((s, i) => (
            <div key={s.step} className="flex md:flex-col items-start md:items-center gap-4 md:gap-2 flex-1 min-w-0">
              {/* Circle + connector row */}
              <div className="flex flex-row items-center w-full">
                {/* Circle — always centered within its flex-1 column */}
                <div className="flex items-center justify-center flex-shrink-0 md:flex-1">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center text-blue-400 font-black text-sm glow-blue">
                    {s.step}
                  </div>
                </div>
                {/* Connector line — only between steps, not after the last */}
                {i < FLOW_STEPS.length - 1 && (
                  <div className="hidden md:block flex-1 h-0.5 bg-gradient-to-r from-blue-500/40 to-slate-700" />
                )}
              </div>
              {/* Label + description — centered under the circle */}
              <div className="md:w-full md:text-center mt-0 md:mt-3 px-1">
                <p className="text-sm font-bold text-slate-900 leading-snug">{s.label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-snug">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FOOTER ────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-3xl mx-auto text-center">
        <div className="glass rounded-2xl p-10 border border-blue-500/20 glow-blue">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Ready to ship safer code?</h2>
          <p className="text-slate-600 mb-8">Paste your code and get a full risk scan with AI suggestions in seconds.</p>
          <Link to="/login" className="btn-primary mx-auto w-fit text-base px-10 py-3">
            <Zap size={18} /> Run Your First Scan
          </Link>
        </div>
      </section>
    </div>
  )
}
