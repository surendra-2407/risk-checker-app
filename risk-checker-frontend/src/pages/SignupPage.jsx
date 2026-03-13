import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Shield, KeyRound, User, ChevronRight, Github, Mail } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function SignupPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentTo, setSentTo]     = useState('')
  const [otp, setOtp]           = useState('')
  const [verifying, setVerifying] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token  = params.get('token')
    const error  = params.get('error')
    const provider = params.get('provider')
    const name_p   = params.get('name')
    const email_p  = params.get('email')
    const avatar   = params.get('avatar')

    if (token) {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_provider', provider || 'oauth')
      localStorage.setItem('user_verified', 'true')
      if (name_p)  localStorage.setItem('user_name', decodeURIComponent(name_p))
      if (email_p) localStorage.setItem('user_email', decodeURIComponent(email_p))
      if (avatar)  localStorage.setItem('user_avatar', decodeURIComponent(avatar))
      toast.success(`Signed up with ${provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'OAuth'}!`)
      navigate('/dashboard', { replace: true })
    }

    if (error) {
      toast.error('Signup Failed: ' + error.replace(/_/g, ' '))
    }
  }, [location.search, navigate])

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/auth/signup`, { name, email, password })
      setSentTo(email)
      setEmailSent(true)
      toast.success(res.data.message || 'Verification email sent!')
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGithubLogin = () => {
    toast('Redirecting to GitHub...', { icon: '🐙' })
    window.location.href = `${API}/api/auth/github`
  }

  const handleGoogleLogin = () => {
    toast('Redirecting to Google...', { icon: '🔍' })
    window.location.href = `${API}/api/auth/google`
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }
    setVerifying(true)
    try {
      const res = await axios.post(`${API}/api/auth/verify-code`, { email: sentTo, code: otp })
      const user = res.data.user
      
      localStorage.setItem('auth_token', 'verified_' + Date.now())
      localStorage.setItem('auth_provider', user.provider || 'password')
      localStorage.setItem('user_verified', 'true')
      localStorage.setItem('user_name', user.name)
      localStorage.setItem('user_email', user.email)
      localStorage.removeItem('user_avatar')
      
      toast.success('Email verified successfully! Welcome! 🎉')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  // ─── Email Sent Confirmation Screen ───────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-[90vh] flex items-center justify-center p-6 animate-fade-in relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="glass rounded-2xl p-10 w-full max-w-md text-center border border-emerald-100 shadow-xl relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600">
            <Mail size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Check Your Inbox!</h2>
          <p className="text-slate-600 text-sm mb-1">Enter the 6-digit code sent to</p>
          <p className="text-emerald-600 font-bold text-sm mb-6 break-all">{sentTo}</p>
          
          <form onSubmit={handleVerifyOtp} className="space-y-4 mb-6">
            <input 
              type="text" 
              maxLength="6"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-3xl font-mono tracking-[0.5em] bg-slate-50 border border-slate-300 rounded-xl py-4 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-300 font-bold"
            />
            <button
              type="submit"
              disabled={verifying || otp.length !== 6}
              className="w-full btn-primary py-3.5 disabled:opacity-50 flex items-center justify-center font-bold text-sm tracking-wide"
            >
              {verifying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Verify Code'}
            </button>
          </form>

          <button
            onClick={() => {
              setEmailSent(false)
              setSentTo('')
              setOtp('')
            }}
            className="text-sm text-slate-500 hover:text-slate-800 transition underline underline-offset-4"
          >
            Use a different email address
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Signup Form ────────────────────────────────────────────────────
  return (
    <div className="min-h-[90vh] flex items-center justify-center p-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass rounded-2xl p-8 w-full max-w-md relative z-10 border border-emerald-100 shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-5 border border-emerald-200">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Create Account</h1>
          <p className="text-slate-500 text-sm">Join Risk Checker and secure your code</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 ml-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Developer"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail size={16} className="text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound size={16} className="text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign Up
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
            Sign in
          </Link>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={handleGithubLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-all border border-slate-300 shadow-sm"
          >
            <Github size={18} />
            Sign up with GitHub
          </button>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-all border border-slate-300 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>
        </div>
      </div>
    </div>
  )
}
