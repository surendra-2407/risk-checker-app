import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, AreaChart, Area
} from 'recharts'
import {
  Shield, TrendingUp, AlertTriangle, Ban, Zap, Clock, ChevronRight, Download,
  User, CheckCircle, Activity, GitCommit, Lock, Eye
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { apiUrl } from '../lib/api'

const LEVEL_COLORS = {
  Low: '#22c55e', Medium: '#eab308', High: '#f97316', Critical: '#ef4444'
}

const EMPTY_STATS = {
  total_scans: 0,
  commits_blocked: 0,
  average_risk_score: 0,
  total_critical_issues: 0,
  by_level: { Low: 0, Medium: 0, High: 0, Critical: 0 },
  trend: []
}

/* ── Animated counter hook ─────────────────────────────────────────────── */
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) return
    const num = parseFloat(target)
    if (isNaN(num)) return
    let start = 0
    const step = num / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= num) { setCount(num); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

/* ── Animated Stat Card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = '#3b82f6', isFloat }) {
  const numVal = parseFloat(value)
  const animated = useCountUp(isNaN(numVal) ? 0 : numVal)
  const display = isNaN(numVal) ? value : isFloat ? animated.toFixed(1) : Math.round(animated)

  return (
    <div className="stat-card group relative overflow-hidden">
      {/* Subtle animated gradient sweep */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 80% 20%, ${color}08, transparent 70%)` }}
      />
      <div className="flex items-start justify-between relative z-10">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
          style={{ background: `${color}18`, border: `1px solid ${color}35` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
        <span className="text-xs text-slate-500">{sub}</span>
      </div>
      <div className="mt-2 relative z-10">
        <p className="text-3xl font-black text-slate-900 tabular-nums">{display}</p>
        <p className="text-sm text-slate-600 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

const LevelBadge = ({ level }) => {
  const cls = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' }
  return <span className={cls[level] || 'badge-low'}>{level}</span>
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs border border-slate-200">
      <p className="text-slate-600 font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value % 1 !== 0 ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  )
}

/* ── Animated Shield SVG ────────────────────────────────────────────────── */
function ShieldHero({ riskScore, totalScans, blocked }) {
  const pct = Math.min(Math.max(riskScore || 0, 0), 100)
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f97316' : '#10b981'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
      {/* Outer pulsing ring */}
      <div
        className="absolute inset-0 rounded-full opacity-20 animate-ping-slow"
        style={{ background: `radial-gradient(circle, ${color}40, transparent 70%)` }}
      />
      {/* Second ring */}
      <div
        className="absolute rounded-full border-2 opacity-30 animate-spin-slow"
        style={{ inset: 12, borderColor: color, borderStyle: 'dashed' }}
      />
      {/* SVG Shield */}
      <svg viewBox="0 0 120 140" width="160" height="180" className="relative z-10 drop-shadow-2xl">
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={pct >= 40 ? '#dc2626' : '#059669'} stopOpacity="0.7" />
          </linearGradient>
          {/* Arc for progress */}
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Shield outline */}
        <path
          d="M60 5 L110 25 L110 70 Q110 115 60 135 Q10 115 10 70 L10 25 Z"
          fill="url(#shieldGrad)"
          stroke={color}
          strokeWidth="2"
          filter="url(#glow)"
          opacity="0.85"
        />
        {/* Inner shield highlight */}
        <path
          d="M60 18 L98 34 L98 70 Q98 105 60 120 Q22 105 22 70 L22 34 Z"
          fill="white"
          opacity="0.08"
        />

        {/* Risk percentage text */}
        <text x="60" y="72" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" fontFamily="Inter, sans-serif">
          {Math.round(pct)}
        </text>
        <text x="60" y="88" textAnchor="middle" fill="white" fontSize="9" opacity="0.85" fontFamily="Inter, sans-serif">
          RISK SCORE
        </text>

        {/* Check or X mark */}
        {pct < 40 ? (
          <path d="M48 75 L56 83 L74 65" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        ) : (
          <>
            <line x1="48" y1="65" x2="72" y2="89" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
            <line x1="72" y1="65" x2="48" y2="89" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
          </>
        )}
      </svg>

      {/* Floating mini badges */}
      <div className="absolute top-4 right-0 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-center animate-float">
        <p className="text-lg font-black text-slate-900">{totalScans}</p>
        <p className="text-[10px] text-slate-500 font-medium">Scans</p>
      </div>
      <div className="absolute bottom-6 left-0 bg-white border border-red-200 rounded-xl px-3 py-2 shadow-lg text-center animate-float-delayed">
        <p className="text-lg font-black text-red-500">{blocked}</p>
        <p className="text-[10px] text-slate-500 font-medium">Blocked</p>
      </div>
    </div>
  )
}

/* ── Live Activity Feed ────────────────────────────────────────────────── */
const ACTIVITY_ITEMS = [
  { icon: Lock,        label: 'Secret detected',      sub: 'API key exposed in config.js',    color: '#ef4444', time: '2m ago' },
  { icon: CheckCircle, label: 'Commit allowed',        sub: 'Low risk — 0 critical issues',    color: '#22c55e', time: '5m ago' },
  { icon: Ban,         label: 'Commit blocked',        sub: 'SQL injection pattern found',     color: '#f97316', time: '11m ago' },
  { icon: Eye,         label: 'AI fix generated',      sub: 'Suggested patch for eval() use',  color: '#3b82f6', time: '18m ago' },
  { icon: GitCommit,   label: 'Webhook scan complete', sub: 'push to main — score 34',        color: '#8b5cf6', time: '25m ago' },
]

function ActivityFeed() {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-emerald-500" />
        <h2 className="font-bold text-slate-900">Live Activity</h2>
        <span className="ml-auto text-[10px] bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold animate-pulse">● LIVE</span>
      </div>
      <div className="flex flex-col gap-3">
        {ACTIVITY_ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}
              >
                <Icon size={14} style={{ color: item.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">{item.label}</p>
                <p className="text-[10px] text-slate-500 truncate">{item.sub}</p>
              </div>
              <span className="text-[10px] text-slate-400 flex-shrink-0">{item.time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Radar / Scanner Animation ────────────────────────────────────────── */
function SecurityRadar() {
  return (
    <div className="glass rounded-xl p-5 flex flex-col items-center justify-center" style={{ minHeight: 220 }}>
      <h2 className="font-bold text-slate-900 mb-4 self-start">Security Radar</h2>
      <div className="relative" style={{ width: 140, height: 140 }}>
        {/* Concentric circles */}
        {[70, 52, 36, 20].map((r, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-emerald-500/20"
            style={{ inset: 70 - r, width: r * 2, height: r * 2 }}
          />
        ))}
        {/* Cross lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-full h-px bg-emerald-500/15" />
          <div className="absolute h-full w-px bg-emerald-500/15" />
        </div>
        {/* Rotating sweep */}
        <div
          className="absolute inset-0 animate-radar-sweep"
          style={{
            background: 'conic-gradient(from 0deg, transparent 85%, rgba(16,185,129,0.35) 100%)',
            borderRadius: '50%',
          }}
        />
        {/* Dots (mock detected targets) */}
        <div className="absolute w-2 h-2 rounded-full bg-red-500 shadow-red-500/60 shadow-sm" style={{ top: '20%', left: '55%' }} />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-orange-400 shadow-orange-400/60 shadow-sm" style={{ top: '60%', left: '25%' }} />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ top: '45%', left: '70%' }} />
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-emerald-500/60 shadow-sm" />
      </div>
      <p className="text-xs text-slate-500 mt-3">Scanning for threats…</p>
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────────────────────── */
export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [commits, setCommits] = useState([])
  const [loading, setLoading] = useState(true)
  const [userScans, setUserScans] = useState(null)

  const userName = localStorage.getItem('user_name') || 'You'
  const userEmail = localStorage.getItem('user_email') || ''

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          axios.get(apiUrl('/api/commits/stats')),
          axios.get(apiUrl('/api/commits?limit=6'))
        ])
        setStats(sRes.data)
        setCommits(cRes.data.commits || [])
        try {
          const uRes = await axios.get(apiUrl('/api/commits/stats'), {
            params: { developer: userEmail || userName }
          })
          setUserScans(uRes.data?.total_scans ?? null)
        } catch {
          setUserScans(null)
        }
      } catch {
        setStats(EMPTY_STATS)
        setCommits([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center">
        <div className="relative mx-auto mb-4" style={{ width: 56, height: 56 }}>
          <div className="w-14 h-14 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <Shield size={20} className="text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-slate-500 text-sm font-medium">Loading security dashboard…</p>
      </div>
    </div>
  )

  const s = stats
  const pieData = Object.entries(s.by_level || {}).map(([name, value]) => ({ name, value }))
  const barData = Object.entries(s.by_level || {}).map(([name, value]) => ({ name, value, fill: LEVEL_COLORS[name] }))

  const generatePDFReport = () => {
    const doc = new jsPDF()
    doc.setFontSize(22)
    doc.text('Code Security Dashboard Report', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28)
    doc.setFontSize(14)
    doc.setTextColor(20)
    doc.text('Analytics Summary', 14, 40)
    doc.setFontSize(11)
    doc.text(`Total Scans: ${s.total_scans}`, 14, 48)
    doc.text(`Commits Blocked: ${s.commits_blocked}`, 14, 54)
    doc.text(`Average Risk Score: ${s.average_risk_score?.toFixed(1)} / 100`, 14, 60)
    doc.text(`Total Critical Issues: ${s.total_critical_issues}`, 14, 66)
    doc.setFontSize(14)
    doc.text('Recent Commits Analysis', 14, 80)
    const tableData = commits.map(c => [
      c.commit_id?.slice(0, 8), c.developer_name, c.repository,
      c.risk_score, c.risk_level, c.total_issues
    ])
    autoTable(doc, {
      startY: 85,
      head: [['Commit ID', 'Developer', 'Repository', 'Risk Score', 'Level', 'Issues']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    })
    doc.save('RiskChecker_Security_Report.pdf')
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">

      {/* ── HERO SECTION ─────────────────────────────────────────────── */}
      <div className="relative glass rounded-2xl overflow-hidden mb-8 p-6 md:p-8 border border-emerald-500/20">
        {/* Background gradient blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-60 h-60 bg-blue-500/6 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          {/* Left: Title + actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Live Dashboard</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
              Security Overview
            </h1>
            <p className="text-slate-500 text-sm mb-1">
              Real-time commit risk analytics — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-slate-400 text-xs mb-5">
              Logged in as <span className="text-emerald-600 font-semibold">{userName}</span>
            </p>

            {commits.length === 0 && stats?.total_scans === 0 && (
              <p className="text-emerald-500 text-xs font-semibold mb-4 bg-emerald-50/50 border border-emerald-200 rounded-md px-3 py-2 inline-flex items-center gap-1.5">
                ⚡ No data yet — run your first scan to see stats here
              </p>
            )}

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={generatePDFReport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
              >
                <Download size={16} /> Export PDF
              </button>
              <Link to="/scan" className="btn-primary">
                <Zap size={16} /> New Scan
              </Link>
              <Link to="/history" className="btn-ghost">
                <Clock size={16} /> Full History
              </Link>
            </div>
          </div>

          {/* Right: Animated Shield */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <ShieldHero
              riskScore={s.average_risk_score}
              totalScans={s.total_scans}
              blocked={s.commits_blocked}
            />
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Shield}        label="Total Scans"      value={s.total_scans}                          sub="all time"    color="#3b82f6" />
        <StatCard icon={User}          label="Your Scans"       value={userScans !== null ? userScans : '—'}   sub={userName}    color="#10b981" />
        <StatCard icon={Ban}           label="Commits Blocked"  value={s.commits_blocked}                      sub="prevented"   color="#ef4444" />
        <StatCard icon={TrendingUp}    label="Avg Risk Score"   value={s.average_risk_score?.toFixed(1)}       sub="0–100 scale" color="#eab308" isFloat />
        <StatCard icon={AlertTriangle} label="Critical Issues"  value={s.total_critical_issues}                sub="total found" color="#f97316" />
      </div>

      {/* ── CHARTS ROW ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Risk Trend Area Chart */}
        <div className="glass rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900">Risk Score Trend</h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 14 days</p>
            </div>
            <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-1 rounded-full font-semibold">14d</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={s.trend}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: '#3b82f6', r: 3 }} name="Risk Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Issues by Level pie */}
        <div className="glass rounded-xl p-5">
          <h2 className="font-bold text-slate-900 mb-1">Issues by Level</h2>
          <p className="text-xs text-slate-500 mb-4">Distribution breakdown</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={3}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={LEVEL_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {pieData.map(e => (
              <div key={e.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: LEVEL_COLORS[e.name] }} />
                <span className="truncate">{e.name}</span>
                <span className="ml-auto font-bold text-slate-800">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECOND ROW: Bar Chart + Radar + Activity ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

        {/* Bar Chart */}
        <div className="glass rounded-xl p-5 lg:col-span-1">
          <h2 className="font-bold text-slate-900 mb-1">By Risk Level</h2>
          <p className="text-xs text-slate-500 mb-4">Total commits per category</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={barData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Commits" radius={[6, 6, 0, 0]}>
                {barData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Security Radar */}
        <SecurityRadar />

        {/* Activity Feed */}
        <ActivityFeed />
      </div>

      {/* ── RECENT COMMITS TABLE ─────────────────────────────────────── */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" /> Recent Commits
          </h2>
          <Link to="/history" className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1 font-medium">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200 bg-slate-50/50">
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Commit</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600 hidden md:table-cell">Developer</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600 hidden lg:table-cell">Repository</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Risk</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Issues</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {commits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No commits scanned yet — <Link to="/scan" className="text-emerald-600 hover:underline font-medium">run your first scan</Link>
                  </td>
                </tr>
              ) : commits.map((c, i) => (
                <tr key={c._id || i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600 group-hover:text-slate-900 transition-colors">{c.commit_id?.slice(0, 8)}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-700 font-medium hidden md:table-cell">{c.developer_name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{c.repository}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <LevelBadge level={c.risk_level} />
                      <span className="text-xs text-slate-500 font-medium">{c.risk_score}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{c.total_issues}</td>
                  <td className="px-5 py-3.5">
                    {c.commit_allowed
                      ? <span className="text-xs text-green-500 flex items-center gap-1 font-medium">✅ Allowed</span>
                      : <span className="text-xs text-red-500 flex items-center gap-1 font-medium">⛔ Blocked</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
