import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { apiUrl } from '../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    setLoading(true)
    try {
      await axios.post(apiUrl('/api/auth/forgot-password'), { email: email.trim().toLowerCase() })
      setSubmitted(true)
    } catch (err) {
      // Always show success to prevent email enumeration — even on error
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-6 animate-fade-in relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass rounded-2xl p-8 w-full max-w-md relative z-10 border border-slate-200 shadow-xl">

        {/* Back link */}
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-8">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        {submitted ? (
          /* ── Success state ── */
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 mb-5">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">Check your inbox</h1>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              If an account with <strong>{email}</strong> exists, you'll receive a password reset link within a few minutes.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Don't see it? Check your spam folder or try again in a few minutes.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft size={14} /> Return to login
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-emerald-500/10 text-blue-600 mb-5 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <Shield size={30} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Forgot Password?</h1>
              <p className="text-slate-500 text-sm">Enter your email and we'll send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail size={16} className="text-slate-400" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@company.com"
                    autoComplete="email"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="forgot-submit"
                disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Mail size={16} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/signup" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                Don't have an account? <span className="font-semibold text-blue-600">Sign up</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
