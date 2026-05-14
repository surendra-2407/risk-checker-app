import { useState, useEffect } from 'react'
import axios from 'axios'
import { Clock, Filter, ChevronDown, ChevronUp, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiUrl } from '../lib/api'



const LEVEL_CLASSES = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' }
const LEVEL_COLORS  = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' }

export default function HistoryPage() {
  const [commits, setCommits]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')
  const [sortDir, setSortDir]   = useState('desc')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(apiUrl('/api/commits?limit=30'))
        setCommits(res.data.commits || [])
      } catch {
        setCommits([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = commits
    .filter(c => filter === 'All' || c.risk_level === filter)
    .sort((a, b) => sortDir === 'desc'
      ? new Date(b.timestamp) - new Date(a.timestamp)
      : new Date(a.timestamp) - new Date(b.timestamp))

  const exportCSV = () => {
    const header = ['commit_id', 'developer', 'repository', 'branch', 'risk_score', 'risk_level', 'total_issues', 'status', 'timestamp']
    const rows = filtered.map(c => [
      c.commit_id, c.developer_name, c.repository, c.branch,
      c.risk_score, c.risk_level, c.total_issues,
      c.commit_allowed ? 'Allowed' : 'Blocked',
      new Date(c.timestamp).toLocaleString()
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'commit-history.csv'; a.click()
    toast.success('CSV downloaded!')
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <Clock size={28} className="text-blue-600" /> Commit History
          </h1>
          <p className="text-slate-600 text-sm mt-1">{filtered.length} commits scanned</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 shadow-sm">
            <Filter size={13} className="text-slate-500 ml-1.5" />
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(l => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === l
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="btn-ghost text-sm"
          >
            {sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
          <button onClick={exportCSV} className="btn-ghost text-sm">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {['Critical', 'High', 'Medium', 'Low'].map(l => {
          const count = commits.filter(c => c.risk_level === l).length
          return (
            <div key={l} className="glass rounded-xl p-4 flex items-center gap-3 border border-slate-200 shadow-sm">
              <div className="w-3 h-3 rounded-full" style={{ background: LEVEL_COLORS[l] }} />
              <div>
                <p className="text-lg font-black text-slate-900">{count}</p>
                <p className="text-xs text-slate-600 font-medium">{l}</p>
              </div>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-700">Commit</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-700 hidden md:table-cell">Developer</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-700 hidden lg:table-cell">Repo / Branch</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-700">Risk Score</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-700">Issues</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-700 hidden xl:table-cell">Time</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <>
                    <tr
                      key={c._id}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === c._id ? null : c._id)}
                    >
                      <td className="px-5 py-4 font-mono text-xs text-blue-600 font-semibold">#{c.commit_id?.slice(0, 8)}</td>
                      <td className="px-5 py-4 text-sm text-slate-700 hidden md:table-cell font-medium">{c.developer_name}</td>
                      <td className="px-5 py-4 text-xs text-slate-500 hidden lg:table-cell">
                        <span className="text-slate-700 font-medium">{c.repository}</span>
                        <span className="text-slate-400"> / </span>
                        {c.branch}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ background: `${LEVEL_COLORS[c.risk_level]}20`, color: LEVEL_COLORS[c.risk_level] }}
                          >
                            {c.risk_score}
                          </div>
                          <span className={LEVEL_CLASSES[c.risk_level]}>{c.risk_level}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {c.critical_count > 0 && <span className="badge-critical">{c.critical_count}C</span>}
                          {c.high_count     > 0 && <span className="badge-high">{c.high_count}H</span>}
                          {c.medium_count   > 0 && <span className="badge-medium">{c.medium_count}M</span>}
                          {c.low_count      > 0 && <span className="badge-low">{c.low_count}L</span>}
                          {c.total_issues === 0  && <span className="text-xs text-green-600 font-semibold">Clean</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {c.commit_allowed
                          ? <span className="text-xs text-green-400 font-medium">✅ Allowed</span>
                          : <span className="text-xs text-emerald-400 font-medium">⛔ Blocked</span>}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 hidden xl:table-cell">
                        {new Date(c.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {expanded === c._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                    </tr>
                    {expanded === c._id && (
                      <tr key={`${c._id}-exp`} className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            {[
                              ['Developer', c.developer_name],
                              ['Repository', c.repository],
                              ['Branch', c.branch],
                              ['Timestamp', new Date(c.timestamp).toLocaleString()],
                              ['Risk Score', `${c.risk_score} / 100`],
                              ['Total Issues', c.total_issues],
                              ['Commit Decision', c.commit_allowed ? '✅ Allowed' : '⛔ Blocked'],
                              ['Commit ID', `#${c.commit_id}`],
                            ].map(([label, val]) => (
                              <div key={label} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm">
                                <p className="text-slate-500 mb-0.5">{label}</p>
                                <p className="text-slate-700 font-bold">{val}</p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Clock size={36} className="mx-auto mb-3 opacity-30" />
              <p>No commits found. Make sure the backend is running.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
