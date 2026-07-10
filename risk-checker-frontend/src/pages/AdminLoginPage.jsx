import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Shield, KeyRound, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { apiUrl } from '../lib/api'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Fill all fields')

    setLoading(true)
    try {
      const res = await axios.post(apiUrl('/api/admin/login'), { email, password })
      localStorage.setItem('admin_token', res.data.token)
      localStorage.setItem('admin_user', JSON.stringify(res.data.admin))
      toast.success('Admin access granted')
      navigate('/admin/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Prevent normal users from accidentally logging in here by clearly marking it
  return (
    <div className="min-h-screen flex items-center justify-center -mt-16 animate-fade-in px-4 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background glow specific to admin */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 glass rounded-2xl relative z-10" style={{ border: '1px solid var(--border)' }}>
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg backdrop-blur-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Shield size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Admin Gateway</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--critical)' }}>Restricted Access Area</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest block" style={{ color: 'var(--text-label)' }}>Admin Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail size={15} className="text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                placeholder="admin@riskchecker.dev"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest block" style={{ color: 'var(--text-label)' }}>Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound size={15} className="text-slate-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark w-full pl-10 pr-11 py-3 rounded-xl text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-3.5 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Enter Control Panel <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
