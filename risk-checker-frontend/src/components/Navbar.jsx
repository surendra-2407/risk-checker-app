import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Shield, LayoutDashboard, Search, History, LogOut, LogIn, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan',      label: 'Scan Code',  icon: Search },
  { to: '/history',   label: 'History',    icon: History },
]

function ProviderBadge({ provider }) {
  if (provider === 'google') return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
  if (provider === 'github') return <Github size={12} className="text-slate-700" />
  return null
}

export default function Navbar() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const isAuthenticated = !!localStorage.getItem('auth_token')
  const userName   = localStorage.getItem('user_name') || 'User'
  const userEmail  = localStorage.getItem('user_email') || ''
  const userAvatar = localStorage.getItem('user_avatar') || ''
  const provider   = localStorage.getItem('auth_provider') || 'password'
  const isVerified = localStorage.getItem('user_verified') === 'true'

  // Verified badge text by provider
  const verifiedLabel = isVerified
    ? provider === 'google'   ? '✅ Verified Google User'
    : provider === 'github'   ? '✅ Verified GitHub User'
    : '✅ Verified User'
    : '⚠️ Email not verified'

  const verifiedColor = isVerified ? 'text-green-600' : 'text-amber-500'

  // Initials from name
  const initials = userName
    .split(' ')
    .map(w => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_provider')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_avatar')
    setDropdownOpen(false)
    navigate('/login')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav className="glass sticky top-0 z-50 border-b border-emerald-100 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center glow-emerald group-hover:scale-110 transition-transform">
              <Shield size={20} className="text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-lg leading-none">RiskChecker</span>
            <span className="block text-xs text-slate-500 leading-none">Pre-Commit Security</span>
          </div>
        </Link>

        {/* Nav Links */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-9 h-9 flex items-center justify-center rounded-lg border transition-all"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)'
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/admin"
                title="Admin Gateway"
                className="flex items-center justify-center w-9 h-9 text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg transition-all border border-slate-300 shadow-sm"
              >
                <Shield size={16} />
              </Link>
              
              <div className="relative" ref={dropdownRef}>
                {/* Avatar Button */}
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all"
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : null}
                <div
                  className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center text-white text-xs font-bold"
                  style={{ display: userAvatar ? 'none' : 'flex' }}
                >
                  {initials}
                </div>
                <span className="hidden sm:inline text-sm font-semibold text-slate-800 max-w-[120px] truncate">{userName}</span>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                  {/* Profile Row */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : null}
                    <div
                      className="w-10 h-10 rounded-full bg-emerald-600 items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ display: userAvatar ? 'none' : 'flex' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                      <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                      {/* Verification badge */}
                      <p className={`text-xs font-semibold mt-1 ${verifiedColor}`}>{verifiedLabel}</p>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 px-4 py-2 rounded-lg transition-all border border-slate-300 shadow-sm"
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
              <Link
                to="/signup"
                className="flex items-center gap-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-all shadow-sm"
              >
                <span className="hidden sm:inline">Sign Up</span>
              </Link>
              <Link
                to="/admin"
                title="Admin Gateway"
                className="flex items-center justify-center w-9 h-9 text-slate-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg transition-all border border-slate-300 shadow-sm"
              >
                <Shield size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
