import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import RiskGauge from '../components/RiskGauge'
import IssueCard from '../components/IssueCard'
import { CheckCircle, XCircle, ArrowLeft, Zap, Download, Clock, User, GitBranch, Bot, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResultsPage() {
  const location = useLocation()
  const navigate  = useNavigate()
  const result    = location.state?.result

  useEffect(() => {
    if (!result) navigate('/scan')
  }, [result, navigate])

  if (!result) return null

  const {
    risk_score, risk_level, risk_color, commit_allowed,
    total_issues, severity_counts = {}, issues = [],
    developer, repository, branch, fileName, timestamp
  } = result

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'risk-report.json'; a.click()
    toast.success('Report downloaded!')
  }

  const sevOrder = ['Critical', 'High', 'Medium', 'Low']
  const sorted = [...issues].sort((a, b) =>
    sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity)
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">

      {/* Back + Export */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/scan" className="btn-ghost">
          <ArrowLeft size={15} /> Back to Scan
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={exportJSON} className="btn-ghost text-sm">
            <Download size={14} /> Export JSON
          </button>
          <Link to="/scan" className="btn-primary text-sm">
            <Zap size={14} /> New Scan
          </Link>
        </div>
      </div>

      {/* Commit Decision Banner */}
      <div
        className={`rounded-xl p-5 mb-8 border flex items-center gap-4 ${
          commit_allowed
            ? 'bg-green-50/50 border-green-200'
            : 'bg-emerald-50/50 border-emerald-200'
        }`}
      >
        {commit_allowed
          ? <CheckCircle size={36} className="text-green-500 flex-shrink-0" />
          : <XCircle    size={36} className="text-red-500 flex-shrink-0" />}
        <div>
          <p className={`text-lg font-black ${commit_allowed ? 'text-green-600' : 'text-red-600'}`}>
            {commit_allowed ? '✅ Commit Allowed' : '⛔ Commit Blocked'}
          </p>
          <p className="text-sm text-slate-600 mt-0.5">
            {commit_allowed
              ? 'Risk score is within acceptable limits. Review warnings before proceeding.'
              : 'Risk score exceeds threshold (50). Fix the critical issues below before committing.'}
          </p>
        </div>
      </div>

      {/* ML Classification Banner */}
      {result.ml_classification && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot size={24} className="text-indigo-600" />
            <div>
              <p className="text-sm font-bold text-slate-900">AI Classification (HuggingFace CodeBERT)</p>
              <p className="text-sm text-slate-600">
                Model predicted <span className="text-indigo-600 font-semibold">{result.ml_classification.ml_label}</span> risk with {result.ml_classification.ml_confidence}% confidence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Score + Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Gauge */}
        <div className="glass rounded-xl p-6 flex flex-col items-center justify-center">
          <RiskGauge score={risk_score} level={risk_level} color={risk_color} />
        </div>

        {/* Severity breakdown */}
        <div className="glass rounded-xl p-6 space-y-3">
          <p className="text-sm font-bold text-slate-900 mb-4">Issue Breakdown</p>
          {['Critical', 'High', 'Medium', 'Low'].map(level => {
            const count = severity_counts[level] || 0
            const colors = { Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a' }
            const pct = total_issues > 0 ? (count / total_issues) * 100 : 0
            return (
              <div key={level}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: colors[level] }} className="font-semibold">{level}</span>
                  <span className="text-slate-600">{count} issue{count !== 1 ? 's' : ''}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: colors[level] }}
                  />
                </div>
              </div>
            )
          })}
          <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
            <span className="text-slate-600">Total Issues</span>
            <span className="font-bold text-slate-900">{total_issues}</span>
          </div>
        </div>

        {/* Commit meta */}
        <div className="glass rounded-xl p-6 space-y-3.5">
          <p className="text-sm font-bold text-slate-900 mb-4">Scan Details</p>
          {[
            [User,      'Developer', developer || '—'],
            [GitBranch, 'Repository', `${repository || '—'} / ${branch || 'main'}`],
            ['📄',     'File',      fileName || '—'],
            [Clock,     'Scanned',   new Date(timestamp).toLocaleTimeString()],
          ].map(([Icon, label, val]) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="flex-shrink-0 text-slate-500">
                {typeof Icon === 'string' ? Icon : <Icon size={14} />}
              </span>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm text-slate-900 font-medium">{val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Detected Issues
            {total_issues > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500">({total_issues} found)</span>
            )}
          </h2>
        </div>

        {sorted.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-900 mb-2">No issues detected</p>
            <p className="text-slate-600">Your code passed all 23 security checks. Great work!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((issue, i) => (
              <IssueCard key={i} issue={issue} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
