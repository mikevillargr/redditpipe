import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../components/base/Button'
import { Card, CardContent } from '../components/base/Card'
import { Badge } from '../components/base/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/base/Table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/base/Dialog'
import { Input } from '../components/base/Input'
import { IconButton } from '../components/base/IconButton'
import { Alert } from '../components/base/Alert'
import { PlusIcon, EyeIcon, EyeOffIcon, EditIcon, Trash2Icon, ActivityIcon } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})

  // Form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

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

  const handleAdd = () => {
    setEditingAccount(null)
    setUsername('')
    setPassword('')
    setModalOpen(true)
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setUsername(account.username)
    setPassword(account.password)
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
        status: 'active',
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
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }))
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
                      <span className="font-mono text-sm">
                        {showPassword[account.id] ? account.password : '••••••••'}
                      </span>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePasswordVisibility(account.id)}
                      >
                        {showPassword[account.id] ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
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
            <div className="flex flex-col gap-4">
              <Input
                label="Reddit Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username (without u/)"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Reddit password"
              />
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
