import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, CheckCircle, ExternalLink, Bot, Code2, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

const SEVERITY_CONFIG = {
  Critical: { badge: 'badge-critical', dot: 'bg-red-500', glow: '#ef4444' },
  High:     { badge: 'badge-high',     dot: 'bg-orange-500', glow: '#f97316' },
  Medium:   { badge: 'badge-medium',   dot: 'bg-yellow-500', glow: '#eab308' },
  Low:      { badge: 'badge-low',      dot: 'bg-green-500', glow: '#22c55e' },
}

export default function IssueCard({ issue, index }) {
  const [expanded, setExpanded] = useState(index === 0)
  const [showAI, setShowAI] = useState(false)
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.Low

  const copy = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied!`)
  }

  return (
    <div
      className="glass rounded-xl overflow-hidden transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${index * 0.06}s`, borderLeft: `3px solid ${cfg.glow}` }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cfg.badge}>{issue.severity}</span>
            <span className="text-sm font-bold text-slate-900 truncate">
              {issue.issue_type?.replace(/_/g, ' ')}
            </span>
            {issue.rule_id && (
              <span className="text-xs text-slate-500 font-medium">[{issue.rule_id}]</span>
            )}
            {issue.category === 'GitGuardian Secret' && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md">
                <ShieldAlert size={10} /> GitGuardian
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 truncate">{issue.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500 font-medium">
          <span className="hidden sm:block">
            {issue.file_name}:{issue.line_number}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-200 pt-4">
          {/* Location */}
          <div className="flex gap-4 text-xs text-slate-600">
            <span>📁 <span className="text-slate-900 font-medium">{issue.file_name}</span></span>
            <span>📍 Line <span className="text-slate-900 font-medium">{issue.line_number}</span></span>
            {issue.owasp_ref && issue.owasp_ref !== 'N/A' && (
              <a
                href={`https://cwe.mitre.org/data/definitions/${issue.owasp_ref.replace('CWE-','')}.html`}
                target="_blank" rel="noreferrer"
                className="text-blue-600 hover:text-blue-500 flex items-center gap-1 font-medium"
              >
                {issue.owasp_ref} <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Code snippet */}
          {issue.code_snippet && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                  <Code2 size={12} /> Detected Code
                </span>
                <button
                  onClick={() => copy(issue.code_snippet, 'Snippet')}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors font-medium"
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              <div className="code-block text-red-600 bg-red-50 border-red-100">{issue.code_snippet}</div>
            </div>
          )}

          {/* Quick fix */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-700 font-bold mb-1">💡 Quick Fix</p>
            <p className="text-xs text-slate-700 font-medium">{issue.suggested_fix}</p>
          </div>

          {/* AI Section toggle */}
          {(issue.ai_explanation || issue.ai_corrected_code) && (
            <button
              onClick={() => setShowAI(a => !a)}
              className="flex items-center gap-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 w-full"
            >
              <Bot size={13} />
              {showAI ? 'Hide AI Analysis' : '✨ Show AI Explanation & Fix'}
              {showAI ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
            </button>
          )}

          {/* AI Panel */}
          {showAI && issue.ai_explanation && (
            <div className="space-y-3 bg-white border border-purple-200 rounded-xl p-4 shadow-sm">
              <div>
                <p className="text-xs font-bold text-purple-700 mb-1.5">🤖 AI Security Analysis</p>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{issue.ai_explanation}</p>
              </div>
              {issue.ai_corrected_code && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-green-600">✅ AI-Corrected Code</p>
                    <button
                      onClick={() => copy(issue.ai_corrected_code, 'Fix')}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600 transition-colors font-medium"
                    >
                      <Copy size={11} /> Copy Fix
                    </button>
                  </div>
                  <div className="code-block text-green-700 bg-green-50 border-green-200">{issue.ai_corrected_code}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
