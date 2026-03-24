import React, { useState, useEffect, useCallback } from 'react'
import { copyToClipboard } from '../utils/clipboard'
import { Button } from '../components/base/Button'
import { Card, CardContent } from '../components/base/Card'
import { Badge } from '../components/base/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/base/Dialog'
import { Input } from '../components/base/Input'
import { IconButton } from '../components/base/IconButton'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { Tabs, TabsList, TabsTrigger } from '../components/base/Tabs'
import { PlusIcon, EyeIcon, EyeOffIcon, EditIcon, Trash2Icon, ActivityIcon, ClipboardIcon, CheckIcon, WandIcon } from 'lucide-react'

interface Account {
  id: string
  username: string
  password: string
  status: 'active' | 'warming' | 'cooldown' | 'flagged' | 'retired'
  age?: string
  postKarma: number
  commentKarma: number
  subreddits: string[]
  clients: string[]
  organicPostsTotal?: number
  citationPostsTotal?: number
  postsTodayCount?: number
  maxPostsPerDay?: number
}

// Helper function to format days into "Xy Ym" format
const formatAge = (days: number | null | undefined): string => {
  if (!days || days <= 0) return '0y 0m'
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  return `${years}y ${months}m`
}

// Helper component for Citation Ratio display
function CitationRatio({ organic, citation }: { organic?: number; citation?: number }) {
  if (organic === undefined || citation === undefined) return null

  const total = organic + citation
  const citationPct = total > 0 ? (citation / total) * 100 : 0
  const citationPctRounded = Math.round(citationPct)

  // Determine status based on citation percentage
  let status: { label: string; color: string } = { label: 'Good', color: 'green' }
  if (citationPct > 40) {
    status = { label: 'At Risk', color: 'red' }
  } else if (citationPct > 25) {
    status = { label: 'Borderline', color: 'yellow' }
  }

  const colorClasses = {
    green: { bar: 'bg-green-500', text: 'text-green-500', badge: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
    yellow: { bar: 'bg-amber-500', text: 'text-amber-500', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
    red: { bar: 'bg-red-500', text: 'text-red-500', badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  }

  const colors = colorClasses[status.color as keyof typeof colorClasses]

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 border-b border-dashed border-slate-400 cursor-help" title="Reddit penalizes accounts that post too many promotional/citation replies relative to organic participation. Maintain at least 3 organic posts for every 1 citation post.">
          Organic : Citation ratio
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium border text-[10px] ${colors.badge}`}>
          {status.label}
        </span>
      </div>
      <div className="flex gap-4 mb-2">
        <div className="text-center">
          <div className="text-base font-extrabold text-green-500">{organic}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Organic</div>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-slate-400">:</span>
        </div>
        <div className="text-center">
          <div className="text-base font-extrabold text-amber-500">{citation}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Citation</div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-0.5">
            <span className="text-[10px] text-slate-500">Citation %</span>
            <span className={`text-[10px] font-bold ${colors.text}`}>{citationPctRounded}%</span>
          </div>
          <div className="relative h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-slate-400 z-10" />
            <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${Math.min(citationPct, 100)}%` }} />
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Target: max 25% citation (3:1 ratio)</div>
        </div>
      </div>
    </div>
  )
}

interface AccountsBaseUIProps {
  onViewAccount: (id: string) => void
}

interface AccountCardProps {
  account: Account
  onView: (id: string) => void
  onEdit: (account: Account) => void
  onDelete: (id: string) => void
  showPasswordTable: Record<string, boolean>
  togglePasswordVisibility: (id: string) => void
}

function AccountListItem({ account, onView, onEdit, onDelete, showPasswordTable, togglePasswordVisibility }: AccountCardProps) {
  const [copied, setCopied] = useState(false)
  const showPassword = showPasswordTable[account.id] || false

  const handleCopy = async () => {
    const success = await copyToClipboard(account.password)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const statusConfig = {
    active: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    warming: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
    cooldown: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    flagged: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
    retired: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' },
  }

  const status = statusConfig[account.status as keyof typeof statusConfig] || statusConfig.warming

  return (
    <Card variant="elevated" className="hover:border-slate-600 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">R</span>
          </div>

          {/* Account Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                u/{account.username}
              </h3>
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: status.bg,
                  color: status.color,
                  border: `1px solid ${status.border}`
                }}
              >
                {account.status === 'warming' ? 'Farming' : account.status}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Age: <strong className="text-slate-700 dark:text-slate-300">{account.age || '0y 0m'}</strong></span>
              <span>Post Karma: <strong className="text-slate-700 dark:text-slate-300">{account.postKarma.toLocaleString()}</strong></span>
              <span>Comment Karma: <strong className="text-slate-700 dark:text-slate-300">{account.commentKarma.toLocaleString()}</strong></span>
            </div>

            {/* Citation Ratio */}
            {(account.organicPostsTotal !== undefined || account.citationPostsTotal !== undefined) && (
              <div className="mt-2">
                <CitationRatio organic={account.organicPostsTotal} citation={account.citationPostsTotal} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => togglePasswordVisibility(account.id)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {copied ? <CheckIcon size={14} className="text-green-500" /> : <ClipboardIcon size={14} />}
            </button>
            <button
              onClick={() => onView(account.id)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ActivityIcon size={14} />
            </button>
            <button
              onClick={() => onEdit(account)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <EditIcon size={14} />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2Icon size={14} />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AccountCard({ account, onView, onEdit, onDelete, showPasswordTable, togglePasswordVisibility }: AccountCardProps) {
  const [copied, setCopied] = useState(false)
  const showPassword = showPasswordTable[account.id] || false

  const handleCopy = async () => {
    const success = await copyToClipboard(account.password)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const statusConfig = {
    active: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    warming: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
    cooldown: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    flagged: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
    retired: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' },
  }

  const status = statusConfig[account.status as keyof typeof statusConfig] || statusConfig.warming

  return (
    <Card variant="elevated" className="h-full flex flex-col hover:border-slate-600 transition-colors">
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  u/{account.username}
                </h3>
              </div>
              {/* Password row */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {showPassword ? account.password : '••••••••••'}
                </span>
                <button
                  onClick={() => togglePasswordVisibility(account.id)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOffIcon size={11} /> : <EyeIcon size={11} />}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {copied ? <CheckIcon size={11} className="text-green-500" /> : <ClipboardIcon size={11} />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span 
              className="px-2 py-1 rounded text-xs font-semibold"
              style={{ 
                backgroundColor: status.bg, 
                color: status.color,
                border: `1px solid ${status.border}`
              }}
            >
              {account.status === 'warming' ? 'Farming' : account.status}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex mb-4 p-3 bg-slate-900 rounded-lg border border-slate-800">
          <div className="flex-1 flex flex-col justify-center items-center px-2 border-r border-slate-800">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Age</div>
            <div className="text-sm font-bold text-slate-100 leading-tight">{account.age || '0y 0m'}</div>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center px-2 border-r border-slate-800">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Post Karma</div>
            <div className="text-sm font-bold text-slate-100 leading-tight">{account.postKarma.toLocaleString()}</div>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center px-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Comment Karma</div>
            <div className="text-sm font-bold text-slate-100 leading-tight">{account.commentKarma.toLocaleString()}</div>
          </div>
        </div>

        {/* Citation Ratio */}
        <CitationRatio organic={account.organicPostsTotal} citation={account.citationPostsTotal} />

        {/* Subreddits */}
        {account.subreddits && account.subreddits.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Active Subreddits</div>
            <div className="flex flex-wrap gap-1">
              {account.subreddits.slice(0, 4).map((sub, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">
                  {sub}
                </span>
              ))}
              {account.subreddits.length > 4 && (
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded border border-slate-700">
                  +{account.subreddits.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Clients */}
        {account.clients && account.clients.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Clients</div>
            <div className="flex flex-wrap gap-1">
              {account.clients.slice(0, 3).map((client, i) => (
                <Badge key={i} variant="default">{client}</Badge>
              ))}
              {account.clients.length > 3 && (
                <Badge variant="info">+{account.clients.length - 3}</Badge>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => onView(account.id)}
            className="text-xs text-orange-500 hover:text-orange-400 font-medium"
          >
            View Details
          </button>
          <div className="flex items-center gap-1">
            <IconButton size="sm" variant="ghost" onClick={() => onEdit(account)}>
              <EditIcon size={14} />
            </IconButton>
            <IconButton size="sm" variant="ghost" onClick={() => onDelete(account.id)}>
              <Trash2Icon size={14} />
            </IconButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AccountsBaseUI({ onViewAccount }: AccountsBaseUIProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordTable, setShowPasswordTable] = useState<Record<string, boolean>>({})

  // Form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [personaNotes, setPersonaNotes] = useState('')
  const [initialStatus, setInitialStatus] = useState<'active' | 'warming' | 'cooldown' | 'flagged' | 'retired'>('warming')
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(3)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; error?: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts?autoRefresh=true')
      if (res.ok) {
        const data = await res.json().then((data: any[]) =>
          data.map((a: any) => ({
            id: a.id,
            username: a.username,
            password: a.password,
            status: a.status,
            age: formatAge(a.accountAgeDays),
            postKarma: a.postKarma,
            commentKarma: a.commentKarma,
            subreddits: a.activeSubreddits ? a.activeSubreddits.split(',').filter(Boolean) : [],
            clients: a.accountAssignments?.map((c: any) => c.client.name) || [],
            organicPostsTotal: a.organicPostsTotal,
            citationPostsTotal: a.citationPostsTotal,
            postsTodayCount: a.postsTodayCount,
            maxPostsPerDay: a.maxPostsPerDay,
          }))
        )
        setAccounts(data)
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
      setError('Failed to load accounts')
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleVerifyCredentials = async () => {
    if (!username.trim() || !password.trim()) return
    setVerifying(true)
    setVerificationResult(null)

    try {
      const res = await fetch('/api/accounts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      })
      const data = await res.json()
      setVerificationResult(data)
    } catch {
      setVerificationResult({ valid: false, error: 'Network error' })
    }
    setVerifying(false)
  }

  const handleRandomizePersona = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/accounts/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })
      const data = await res.json()
      if (data.personaNotes) {
        setPersonaNotes(data.personaNotes)
      }
    } catch (err) {
      console.error('Failed to generate persona:', err)
    }
    setIsGenerating(false)
  }

  const handleAdd = () => {
    setEditingAccount(null)
    setUsername('')
    setPassword('')
    setShowPasswordModal(false)
    setPersonaNotes('')
    setInitialStatus('warming')
    setMaxPostsPerDay(3)
    setVerificationResult(null)
    setIsGenerating(false)
    setModalOpen(true)
  }

  const handleEdit = async (account: Account) => {
    setEditingAccount(account)
    setUsername(account.username)
    setPassword(account.password)
    setShowPasswordModal(false)
    setInitialStatus(account.status)
    setVerificationResult(null)
    setIsGenerating(false)
    
    // Fetch full account details to get personaNotes and maxPostsPerDay
    try {
      const res = await fetch(`/api/accounts/${account.id}`)
      if (res.ok) {
        const fullAccount = await res.json()
        setPersonaNotes(fullAccount.personalitySummary || '')
        setMaxPostsPerDay(fullAccount.maxPostsPerDay || 3)
      } else {
        // Fallback to defaults if fetch fails
        setPersonaNotes('')
        setMaxPostsPerDay(3)
      }
    } catch (err) {
      console.error('Failed to fetch account details:', err)
      setPersonaNotes('')
      setMaxPostsPerDay(3)
    }
    
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      fetchAccounts()
    } catch (err) {
      console.error('Failed to delete account:', err)
      setError('Failed to delete account')
    }
  }

  const handleSave = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required')
      return
    }

    try {
      const payload = {
        username: username.trim(),
        password: password.trim(),
        status: initialStatus,
        maxPostsPerDay,
        personaNotes: personaNotes.trim(),
      }

      if (editingAccount) {
        await fetch(`/api/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      setModalOpen(false)
      fetchAccounts()
    } catch (err) {
      console.error('Failed to save account:', err)
      setError('Failed to save account')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Active</Badge>
      case 'warming': return <Badge variant="info">Farming</Badge>
      case 'cooldown': return <Badge variant="warning">Cooldown</Badge>
      case 'flagged': return <Badge variant="danger">Flagged</Badge>
      default: return <Badge variant="default">{status}</Badge>
    }
  }

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordTable(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reddit Accounts</h1>
        <Button variant="primary" onClick={handleAdd}>
          <PlusIcon size={16} className="mr-2" />
          Add Account
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({accounts.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({accounts.filter(a => a.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="warming">Farming ({accounts.filter(a => a.status === 'warming').length})</TabsTrigger>
          <TabsTrigger value="cooldown">Cooldown ({accounts.filter(a => a.status === 'cooldown').length})</TabsTrigger>
          <TabsTrigger value="flagged">Flagged ({accounts.filter(a => a.status === 'flagged').length})</TabsTrigger>
          <TabsTrigger value="retired">Retired ({accounts.filter(a => a.status === 'retired').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Card Grid / List */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No accounts yet. Click "Add Account" to get started.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts
            .filter(account => statusFilter === 'all' || account.status === statusFilter)
            .map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onView={onViewAccount}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showPasswordTable={showPasswordTable}
              togglePasswordVisibility={togglePasswordVisibility}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts
            .filter(account => statusFilter === 'all' || account.status === statusFilter)
            .map((account) => (
            <AccountListItem
              key={account.id}
              account={account}
              onView={onViewAccount}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showPasswordTable={showPasswordTable}
              togglePasswordVisibility={togglePasswordVisibility}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-6">
              {/* Reddit Credentials Section */}
              <div>
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Reddit Credentials
                </h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <Input
                      label="Reddit Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. fitness_mike (without u/)"
                      helperText="The Reddit username for this account"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Reddit Password
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showPasswordModal ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Reddit password"
                        className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <IconButton
                        size="md"
                        variant="ghost"
                        onClick={() => setShowPasswordModal(!showPasswordModal)}
                      >
                        {showPasswordModal ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                      </IconButton>
                      <IconButton
                        size="md"
                        variant="ghost"
                        onClick={() => navigator.clipboard.writeText(password)}
                      >
                        <ClipboardIcon size={16} />
                      </IconButton>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Used to authenticate via Reddit API</p>
                  </div>

                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={handleVerifyCredentials}
                    disabled={verifying || !username.trim() || !password.trim()}
                    className="w-full"
                  >
                    {verifying ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckIcon size={14} className="mr-2" />
                        Verify Credentials
                      </>
                    )}
                  </Button>

                  {verificationResult && (
                    <Alert variant={verificationResult.valid ? 'success' : 'error'}>
                      {verificationResult.valid
                        ? '✓ Credentials verified successfully'
                        : `✗ ${verificationResult.error || 'Invalid credentials'}`}
                    </Alert>
                  )}
                </div>
              </div>

              {/* Persona Notes Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Persona Notes
                  </h3>
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={handleRandomizePersona}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <WandIcon size={14} className="mr-2" />
                        Randomize
                      </>
                    )}
                  </Button>
                </div>
                <textarea
                  value={personaNotes}
                  onChange={(e) => setPersonaNotes(e.target.value)}
                  placeholder="Persona Notes"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Used by AI to write replies that match this account's voice and background
                </p>
              </div>

              {/* Configuration Section */}
              <div>
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Configuration
                </h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Initial Status
                    </label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="warming">Farming — new account, building karma</option>
                      <option value="active">Active — ready for outreach</option>
                      <option value="cooldown">Cooldown — temporary pause</option>
                      <option value="flagged">Flagged — needs attention</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      New accounts should typically start on Farming
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Max Posts Per Day
                    </label>
                    <input
                      type="number"
                      value={maxPostsPerDay}
                      onChange={(e) => setMaxPostsPerDay(parseInt(e.target.value) || 3)}
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Daily limit to avoid rate limiting (recommended: 3-5)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingAccount ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
