import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Legend
} from 'recharts'
import {
  Shield, TrendingUp, AlertTriangle, Ban, Zap, Clock, ChevronRight, Download
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

function StatCard({ icon: Icon, label, value, sub, color = '#3b82f6' }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={22} style={{ color }} />
        </div>
        <span className="text-xs text-slate-500">{sub}</span>
      </div>
      <div className="mt-2">
        <p className="text-3xl font-black text-slate-900">{value}</p>
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

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [commits, setCommits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          axios.get(apiUrl('/api/commits/stats')),
          axios.get(apiUrl('/api/commits?limit=6'))
        ])
        setStats(sRes.data)
        setCommits(cRes.data.commits || [])
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
        <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading dashboard...</p>
      </div>
    </div>
  )

  const s = stats
  const pieData = Object.entries(s.by_level || {}).map(([name, value]) => ({ name, value }))
  const barData = Object.entries(s.by_level || {}).map(([name, value]) => ({ name, value, fill: LEVEL_COLORS[name] }))

  const generatePDFReport = () => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22)
    doc.text('Code Security Dashboard Report', 14, 20)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28)
    
    // Stats Summary
    doc.setFontSize(14)
    doc.setTextColor(20)
    doc.text('Analytics Summary', 14, 40)
    
    doc.setFontSize(11)
    doc.text(`Total Scans: ${s.total_scans}`, 14, 48)
    doc.text(`Commits Blocked: ${s.commits_blocked}`, 14, 54)
    doc.text(`Average Risk Score: ${s.average_risk_score?.toFixed(1)} / 100`, 14, 60)
    doc.text(`Total Critical Issues: ${s.total_critical_issues}`, 14, 66)

    // Recent Commits Table
    doc.setFontSize(14)
    doc.text('Recent Commits Analysis', 14, 80)
    
    const tableData = commits.map(c => [
      c.commit_id?.slice(0, 8),
      c.developer_name,
      c.repository,
      c.risk_score,
      c.risk_level,
      c.total_issues
    ])

    autoTable(doc, {
      startY: 85,
      head: [['Commit ID', 'Developer', 'Repository', 'Risk Score', 'Level', 'Issues']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    })

    doc.save('RiskChecker_Security_Report.pdf')
    toast.success('Report downloaded successfully!')
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Security Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time commit risk analytics</p>
          {commits.length === 0 && stats?.total_scans === 0 && (
            <p className="text-emerald-500 text-xs font-semibold mt-2 bg-emerald-50/50 border border-emerald-200 rounded-md px-2 py-1">No data available. Try running a scan or ensure backend is connected.</p>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={generatePDFReport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-semibold hover:bg-slate-50 transition shadow-sm">
            <Download size={16} /> Export PDF
          </button>
          <Link to="/scan" className="btn-primary">
            <Zap size={16} /> New Scan
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Shield}       label="Total Scans"         value={s.total_scans}            sub="all time"   color="#3b82f6" />
        <StatCard icon={Ban}          label="Commits Blocked"     value={s.commits_blocked}         sub="prevented"  color="#ef4444" />
        <StatCard icon={TrendingUp}   label="Avg Risk Score"      value={s.average_risk_score?.toFixed(1)} sub="0–100 scale" color="#eab308" />
        <StatCard icon={AlertTriangle} label="Critical Issues"    value={s.total_critical_issues}   sub="total found" color="#f97316" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

        {/* Risk Trend */}
        <div className="glass rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">Risk Score Trend</h2>
            <span className="text-xs text-slate-500">Last 14 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={s.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} name="Risk Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Issues by Type pie */}
        <div className="glass rounded-xl p-5">
          <h2 className="font-bold text-slate-900 mb-5">Issues by Level</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={LEVEL_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-3">
            {pieData.map(e => (
              <div key={e.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full" style={{ background: LEVEL_COLORS[e.name] }} />
                {e.name}: {e.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="glass rounded-xl p-5 mb-8">
        <h2 className="font-bold text-slate-900 mb-5">Commits by Risk Level</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Commits" radius={[6, 6, 0, 0]}>
              {barData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent commits */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Recent Commits</h2>
          <Link to="/history" className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1">View all <ChevronRight size={12} /></Link>
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
              {commits.map((c, i) => (
                <tr key={c._id || i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{c.commit_id?.slice(0, 8)}</td>
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
                      ? <span className="text-xs text-green-400 flex items-center gap-1">✅ Allowed</span>
                      : <span className="text-xs text-red-400 flex items-center gap-1">⛔ Blocked</span>}
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
