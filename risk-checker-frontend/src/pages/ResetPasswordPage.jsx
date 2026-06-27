import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { apiUrl } from '../lib/api'

export default function ResetPasswordPage() {
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [showCf, setShowCf]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)
  const [tokenError, setTokenError] = useState(false)
  const [token, setToken]           = useState('')
  const [email, setEmail]           = useState('')

  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('token')
    const e = params.get('email')
    if (!t || !e) {
      setTokenError(true)
    } else {
      setToken(t)
      setEmail(decodeURIComponent(e))
    }
  }, [location.search])

  // Password strength checker
  const strength = (() => {
    if (!password) return { label: '', color: '', score: 0 }
    let score = 0
    if (password.length >= 8)  score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    const levels = [
      { label: 'Weak',   color: '#ef4444' },
      { label: 'Fair',   color: '#f97316' },
      { label: 'Good',   color: '#eab308' },
      { label: 'Strong', color: '#22c55e' },
    ]
    return { ...levels[score - 1] || levels[0], score }
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await axios.post(apiUrl('/api/auth/reset-password'), { email, token, newPassword: password })
      setDone(true)
      toast.success('Password reset successfully!')
    } catch (err) {
      const msg = err.response?.data?.error || 'Reset failed. The link may have expired.'
      toast.error(msg)
      if (err.response?.status === 400) setTokenError(true)
    } finally {
      setLoading(false)
    }
  }

  // ── Expired / Invalid token ──
  if (tokenError) {
    return (
      <div className="min-h-[90vh] flex items-center justify-center p-6 animate-fade-in">
        <div className="glass rounded-2xl p-8 w-full max-w-md text-center border border-red-200 shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 border border-red-200 mb-5">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3">Link Expired</h1>
          <p className="text-slate-600 text-sm mb-6">
            This password reset link is invalid or has expired. Reset links are only valid for 1 hour.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 w-full btn-primary py-3 text-sm font-semibold"
          >
            Request a New Link
          </Link>
          <Link to="/login" className="block mt-4 text-xs text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={12} className="inline mr-1" /> Back to login
          </Link>
        </div>
      </div>
    )
  }

  // ── Success state ──
  if (done) {
    return (
      <div className="min-h-[90vh] flex items-center justify-center p-6 animate-fade-in">
        <div className="glass rounded-2xl p-8 w-full max-w-md text-center border border-emerald-200 shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 mb-5">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3">Password Reset! 🎉</h1>
          <p className="text-slate-600 text-sm mb-8">
            Your password has been updated successfully. You can now log in with your new password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full btn-primary py-3 text-sm font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // ── Form ──
  return (
    <div className="min-h-[90vh] flex items-center justify-center p-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass rounded-2xl p-8 w-full max-w-md relative z-10 border border-slate-200 shadow-xl">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-emerald-500/10 text-blue-600 mb-5 border border-blue-500/20">
            <KeyRound size={30} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Set New Password</h1>
          <p className="text-slate-500 text-sm">Choose a strong password for <span className="font-semibold">{email}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* New password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 ml-1">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound size={16} className="text-slate-400" />
              </div>
              <input
                id="reset-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-11 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength bar */}
            {password && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex gap-1 flex-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all"
                      style={{ background: i <= strength.score ? strength.color : '#e2e8f0' }} />
                  ))}
                </div>
                <span className="text-xs font-semibold" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 ml-1">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound size={16} className="text-slate-400" />
              </div>
              <input
                id="reset-confirm"
                type={showCf ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={`w-full bg-slate-50 border rounded-xl py-3 pl-10 pr-11 text-sm text-slate-900 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 shadow-sm ${
                  confirm && password !== confirm
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              <button type="button" onClick={() => setShowCf(v => !v)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-red-500 ml-1 mt-0.5">Passwords don't match</p>
            )}
          </div>

          <button
            type="submit"
            id="reset-submit"
            disabled={loading || password !== confirm || password.length < 8}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-1 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound size={16} />
                Reset Password
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={12} className="inline mr-1" /> Back to login
          </Link>
        </div>

      </div>
    </div>
  )
}
