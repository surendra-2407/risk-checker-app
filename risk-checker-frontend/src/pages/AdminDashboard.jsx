import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Shield, Users, Activity, LogOut, Github, Mail, CheckCircle, Database, Ban, Trash2, Search, Filter, Download, X, Settings as SettingsIcon } from 'lucide-react'
import { apiUrl } from '../lib/api'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [scans, setScans] = useState([])
  const [settings, setSettings] = useState({ maintenance_mode: false, risk_threshold: 50 })
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState('All')
  
  // Modal State
  const [selectedScan, setSelectedScan] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return navigate('/admin')

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [statsRes, usersRes, scansRes, settingsRes] = await Promise.all([
          axios.get(apiUrl('/api/admin/stats'), { headers }),
          axios.get(apiUrl('/api/admin/users'), { headers }),
          axios.get(apiUrl('/api/admin/scans'), { headers }),
          axios.get(apiUrl('/api/admin/settings'), { headers })
        ])
        setStats(statsRes.data)
        setUsers(usersRes.data)
        setScans(scansRes.data)
        setSettings(settingsRes.data)
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('admin_token')
          navigate('/admin')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    navigate('/admin')
  }

  const exportScansToCSV = () => {
    const headers = ['Commit ID', 'Developer', 'Repository', 'Branch', 'File', 'Risk Score', 'Risk Level', 'Issues Count', 'Allowed', 'Date']
    const rows = scans.map(s => [
      s.commit_id, s.developer_name || s.developer || 'Anonymous', s.repository, s.branch, s.fileName, 
      s.risk_score, s.risk_level, s.total_issues, s.commit_allowed, new Date(s.timestamp || s.createdAt).toLocaleString()
    ])
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `RiskChecker_Scans_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredScans = scans.filter(s => {
    const matchesSearch = (s.developer_name || s.developer || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.repository || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.fileName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === 'All' || s.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  })

  const handleSuspendUser = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === 'suspended' ? 'activate' : 'suspend'} this user?`)) return;
    try {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      const token = localStorage.getItem('admin_token');
      await axios.patch(apiUrl(`/api/admin/users/${userId}/status`), { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u));
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`);
    } catch (err) {
      toast.error('Failed to update user status');
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you absolutely sure you want to PERMANENTLY delete this user and ALL their scans?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      await axios.delete(apiUrl(`/api/admin/users/${userId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u._id !== userId));
      toast.success('User deleted successfully');
    } catch (err) {
      toast.error('Failed to delete user');
    }
  }

  const handleUpdateSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('admin_token')
      await axios.patch(apiUrl('/api/admin/settings'), { [key]: value }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSettings(prev => ({ ...prev, [key]: value }))
      toast.success('Settings updated')
    } catch (err) {
      toast.error('Failed to update setting')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-8 text-slate-500 gap-2">
      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      Loading Admin Data...
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-700 flex items-center justify-center">
              <Shield size={18} className="text-emerald-100" />
            </div>
            <h1 className="font-bold tracking-wide">Risk Checker Admin</h1>
            <span className="ml-4 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-emerald-300 border border-slate-700 uppercase tracking-widest">Control Panel</span>
          </div>
          <button onClick={handleLogout} className="text-slate-300 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-lg w-fit mb-8 shadow-sm">
          {[
            { id: 'overview', label: 'Overview Metrics', icon: Activity },
            { id: 'users', label: 'User Directory', icon: Users },
            { id: 'scans', label: 'Scan History', icon: Database },
            { id: 'settings', label: 'Settings', icon: SettingsIcon }
          ].map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all ${
                  tab === t.id ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} className={tab === t.id ? 'text-emerald-600' : 'text-slate-400'} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && stats && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Registered Users" value={stats.users.total} sub={`${stats.users.verified} fully verified`} icon={Users} color="blue" />
              <StatCard title="Global Average Risk" value={`${stats.scans.avgRiskScore}%`} sub="Overall security score" icon={Activity} color="indigo" />
              <StatCard title="Total Issues Detected" value={stats.scans.issuesFound} sub="Vulnerabilities caught" icon={Shield} color="red" />
              <StatCard title="High-Risk Blocked" value={stats.scans.blocked} sub="Commits intercepted" icon={Shield} color="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">User Authentication Setup</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Email / Password</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{stats.users.email} users</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white font-bold">G</div>
                      <span className="text-sm font-medium text-slate-700">Google OAuth</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{stats.users.google} users</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Github size={16} className="text-slate-700" />
                      <span className="text-sm font-medium text-slate-700">GitHub OAuth</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{stats.users.github} users</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">User Directory</h3>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">{users.length} Users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-center">Scans</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-center">Avg Score</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img src={u.avatar} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full border border-slate-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                              {u.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-tighter w-fit">
                            {u.provider}
                          </span>
                          {u.isVerified 
                            ? <span className="text-green-600 text-[10px] font-bold flex items-center gap-1 uppercase tracking-tighter"><CheckCircle size={10} /> Verified</span>
                            : <span className="text-amber-500 text-[10px] font-bold uppercase tracking-tighter">Unverified</span>
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-slate-700">{u.scanCount || 0}</td>
                      <td className="px-6 py-4 text-center">
                         <span className={`font-black ${u.avgUserScore > 50 ? 'text-red-500' : 'text-emerald-600'}`}>
                           {u.avgUserScore ? Math.round(u.avgUserScore) : 0}%
                         </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleSuspendUser(u._id, u.status || 'active')}
                            className={`p-1.5 rounded text-white ${u.status === 'suspended' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                            title={u.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                          >
                            <Ban size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u._id)}
                            className="p-1.5 rounded bg-red-500 hover:bg-red-600 text-white"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scans Tab */}
        {tab === 'scans' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-800">Global Scan History</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">{filteredScans.length} Scans</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search developer or file..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={14} className="text-slate-400" />
                  </div>
                  <select 
                    value={riskFilter} 
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="pl-9 pr-8 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none bg-white"
                  >
                    <option value="All">All Risks</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <button 
                  onClick={exportScansToCSV}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Target & Developer</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-center">Risk</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-center">Issues</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Recommendation</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Scanned At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScans.map(s => (
                    <tr key={s._id} onClick={() => setSelectedScan(s)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 truncate max-w-[180px]" title={s.fileName}>{s.fileName}</div>
                        <div className="text-[10px] font-medium text-slate-500 truncate max-w-[180px] mb-1" title={s.repository}>{s.repository} · {s.branch}</div>
                        <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                           <Users size={10} /> {s.developer || 'Anonymous'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                           <span className={`text-lg font-black leading-none ${s.risk_score > 75 ? 'text-red-600' : s.risk_score > 50 ? 'text-orange-500' : 'text-emerald-600'}`}>
                             {s.risk_score}%
                           </span>
                           <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">{s.risk_level}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${s.total_issues > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {s.total_issues}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         {s.commit_allowed 
                            ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase">Allowed</span>
                            : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 uppercase">Blocked</span>
                         }
                         <div className="text-[9px] text-slate-400 mt-1 font-bold italic">{s.lines_added || 0} lines scanned</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {s.issuesList?.length > 0 ? (
                          <div className="bg-slate-50 border border-slate-200 p-2 rounded text-[10px] leading-relaxed text-slate-600 italic">
                             "{s.issuesList[0].suggestion || s.issuesList[0].suggested_fix}"
                             {s.issuesList.length > 1 && <div className="text-emerald-600 font-bold mt-1">+{s.issuesList.length - 1} more fixes</div>}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">No issues found.</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-[10px] font-bold">{new Date(s.timestamp || s.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in p-6 max-w-2xl">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h3 className="font-bold text-slate-800 text-lg">System Settings</h3>
              <p className="text-sm text-slate-500">Manage global configurations for the Risk Checker platform.</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Maintenance Mode</h4>
                  <p className="text-xs text-slate-500 mt-1">When enabled, users cannot log in or perform new scans.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.maintenance_mode} onChange={(e) => handleUpdateSetting('maintenance_mode', e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Commit Block Threshold (Risk Score)</h4>
                  <p className="text-xs text-slate-500 mt-1">Scans with a score higher than this value will be blocked.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={settings.risk_threshold}
                    onChange={(e) => handleUpdateSetting('risk_threshold', Number(e.target.value))}
                    className="w-20 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    min="1" max="100"
                  />
                  <span className="text-sm font-bold text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Detailed Scan View Modal */}
      {selectedScan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Scan Details: {selectedScan.fileName}</h3>
                <p className="text-xs text-slate-500 font-medium">Commit ID: {selectedScan.commit_id} • Developer: {selectedScan.developer_name || selectedScan.developer}</p>
              </div>
              <button 
                onClick={() => setSelectedScan(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              {selectedScan.issuesList && selectedScan.issuesList.length > 0 ? (
                <div className="space-y-4">
                  {selectedScan.issuesList.map((issue, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white ${
                              issue.severity === 'Critical' ? 'bg-red-500' :
                              issue.severity === 'High' ? 'bg-orange-500' :
                              issue.severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-sm font-bold text-slate-800">{issue.category} Issue</span>
                          </div>
                          <p className="text-sm text-slate-600">{issue.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">Line {issue.line_number}</div>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Flagged Code Snippet</p>
                          <pre className="bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
                            <code>{issue.code_snippet}</code>
                          </pre>
                        </div>
                        
                        {issue.ai_explanation && (
                          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield size={14} className="text-blue-600" />
                              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">AI Security Analysis</h4>
                            </div>
                            <p className="text-sm text-blue-800/80 leading-relaxed">{issue.ai_explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No Issues Detected</h3>
                  <p className="text-slate-500 text-sm">This scan passed with a perfect score.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, sub, icon: Icon, color }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    green: 'text-green-600 bg-green-50 border-green-100'
  }
  
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-lg border ${colors[color]}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}
