import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Shield, KeyRound, User, ChevronRight, Github } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiUrl } from '../lib/api'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token    = params.get('token')
    const error    = params.get('error')
    const provider = params.get('provider')
    const name     = params.get('name')
    const email    = params.get('email')
    const avatar   = params.get('avatar')
    const verified = params.get('verified')

    // User clicked the Brevo verification link
    if (verified === 'true' && name && email) {
      localStorage.setItem('auth_token', 'verified_' + Date.now())
      localStorage.setItem('auth_provider', 'password')
      localStorage.setItem('user_verified', 'true')
      localStorage.setItem('user_name', decodeURIComponent(name))
      localStorage.setItem('user_email', decodeURIComponent(email))
      localStorage.removeItem('user_avatar')
      toast.success('Email verified! Welcome to Risk Checker 🎉')
      navigate('/dashboard', { replace: true })
      return
    }

    if (token) {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_provider', provider || 'oauth')
      localStorage.setItem('user_verified', 'true')
      if (name)   localStorage.setItem('user_name', decodeURIComponent(name))
      if (email)  localStorage.setItem('user_email', decodeURIComponent(email))
      if (avatar) localStorage.setItem('user_avatar', decodeURIComponent(avatar))
      toast.success(`Successfully logged in with ${provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'OAuth'}!`)
      navigate('/dashboard', { replace: true })
    }

    if (error) {
      toast.error('Login Failed: ' + error.replace(/_/g, ' '))
    }
  }, [location.search, navigate])


  const handleLogin = (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Login successful!')
      localStorage.setItem('auth_token', 'demo_token_' + Date.now())
      localStorage.setItem('auth_provider', 'password')
      localStorage.setItem('user_name', email.split('@')[0])
      localStorage.setItem('user_email', email)
      localStorage.removeItem('user_avatar')
      navigate('/dashboard')
    }, 1200)
  }

  const handleGithubLogin = () => {
    toast('Redirecting to GitHub...', { icon: '🐙' })
    window.location.href = apiUrl('/api/auth/github')
  }

  const handleGoogleLogin = () => {
    toast('Redirecting to Google...', { icon: '🔍' })
    window.location.href = apiUrl('/api/auth/google')
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-6 animate-fade-in relative overflow-hidden">
      
      {/* Background glow effects matching the theme */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass rounded-2xl p-8 w-full max-w-md relative z-10 border border-slate-200 shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 text-emerald-600 mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome Back</h1>
          <p className="text-slate-600 text-sm">Sign in to your Risk Checker account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User size={16} className="text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound size={16} className="text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
            <div className="flex justify-end mt-1">
              <Link to="/forgot-password" className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
                Forgot password?
              </Link>
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
                Sign In
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
            Sign up
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleGithubLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-all border border-slate-300 shadow-sm"
          >
            <Github size={18} />
            Continue with GitHub
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
            Continue with Google
          </button>
        </div>

      </div>
    </div>
  )
}
