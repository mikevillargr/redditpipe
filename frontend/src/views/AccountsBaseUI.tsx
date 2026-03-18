import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../components/base/Button'
import { Card, CardContent } from '../components/base/Card'
import { Badge } from '../components/base/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/base/Table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/base/Dialog'
import { Input } from '../components/base/Input'
import { IconButton } from '../components/base/IconButton'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { PlusIcon, EyeIcon, EyeOffIcon, EditIcon, Trash2Icon, ActivityIcon, ClipboardIcon, CheckIcon, WandIcon } from 'lucide-react'

interface Account {
  id: string
  username: string
  password: string
  status: 'active' | 'warming' | 'cooldown' | 'flagged'
  postKarma: number
  commentKarma: number
  subreddits: string[]
  clients: string[]
}

interface AccountsBaseUIProps {
  onViewAccount: (id: string) => void
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
  const [initialStatus, setInitialStatus] = useState<'active' | 'warming' | 'cooldown' | 'flagged'>('warming')
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(3)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; error?: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.map((a: any) => ({
          id: a.id,
          username: a.username,
          password: a.password,
          status: a.status,
          postKarma: a.postKarma,
          commentKarma: a.commentKarma,
          subreddits: a.subreddits ? a.subreddits.split(',').filter(Boolean) : [],
          clients: a.assignments?.map((c: any) => c.client.name) || [],
        })))
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

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setUsername(account.username)
    setPassword(account.password)
    setShowPasswordModal(false)
    setPersonaNotes('')
    setInitialStatus(account.status)
    setMaxPostsPerDay(3)
    setVerificationResult(null)
    setIsGenerating(false)
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

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Karma</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  No accounts yet. Click "Add Account" to get started.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500">u/</span>
                      {account.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(account.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Post: {account.postKarma.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Comment: {account.commentKarma.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {account.clients.length === 0 ? (
                        <span className="text-xs text-slate-500">None</span>
                      ) : (
                        account.clients.slice(0, 2).map((client, i) => (
                          <Badge key={i} variant="default">{client}</Badge>
                        ))
                      )}
                      {account.clients.length > 2 && (
                        <Badge variant="info">+{account.clients.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <IconButton size="sm" variant="ghost" onClick={() => onViewAccount(account.id)}>
                        <ActivityIcon size={14} />
                      </IconButton>
                      <IconButton size="sm" variant="ghost" onClick={() => handleEdit(account)}>
                        <EditIcon size={14} />
                      </IconButton>
                      <IconButton size="sm" variant="ghost" onClick={() => handleDelete(account.id)}>
                        <Trash2Icon size={14} />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

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
