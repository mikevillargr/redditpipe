import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '../components/base/Button'
import { Card } from '../components/base/Card'
import { Input } from '../components/base/Input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/base/Table'
import { Badge } from '../components/base/Badge'
import { Switch } from '../components/base/Switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/base/Dialog'
import { IconButton } from '../components/base/IconButton'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { PlusIcon, EditIcon, Trash2Icon, ExternalLinkIcon } from 'lucide-react'

interface Client {
  id: string
  name: string
  website: string
  keywords: string[]
  mentionTerms: string[]
  nuance: string
  active: boolean
  opportunities: number
  description: string
}

export function ClientsBaseUI() {
  const [clients, setClients] = useState<Client[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState('')
  const [mentionTerms, setMentionTerms] = useState('')
  const [nuance, setNuance] = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: any) => ({
          id: c.id,
          name: c.name,
          website: c.websiteUrl,
          keywords: c.keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
          mentionTerms: c.mentionTerms ? c.mentionTerms.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
          nuance: c.nuance || '',
          active: c.status === 'active',
          opportunities: c._count.opportunities,
          description: c.description,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
      setError('Failed to load clients')
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleAdd = () => {
    setEditingClient(null)
    setName('')
    setWebsite('')
    setDescription('')
    setKeywords('')
    setMentionTerms('')
    setNuance('')
    setModalOpen(true)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setName(client.name)
    setWebsite(client.website)
    setDescription(client.description)
    setKeywords(client.keywords.join(', '))
    setMentionTerms(client.mentionTerms.join(', '))
    setNuance(client.nuance)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      fetchClients()
    } catch (err) {
      console.error('Failed to delete client:', err)
      setError('Failed to delete client')
    }
  }

  const handleToggleActive = async (client: Client) => {
    try {
      await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: client.name,
          websiteUrl: client.website,
          keywords: client.keywords.join(','),
          mentionTerms: client.mentionTerms.join(','),
          nuance: client.nuance,
          status: client.active ? 'inactive' : 'active',
          description: client.description,
        }),
      })
      fetchClients()
    } catch (err) {
      console.error('Failed to toggle client status:', err)
      setError('Failed to update client status')
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !website.trim()) {
      setError('Name and website are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        name: name.trim(),
        websiteUrl: website.trim(),
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean).join(','),
        mentionTerms: mentionTerms.split(',').map(t => t.trim()).filter(Boolean).join(','),
        nuance: nuance.trim(),
        status: 'active',
        description: description.trim(),
      }

      if (editingClient) {
        await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      setModalOpen(false)
      fetchClients()
    } catch (err) {
      console.error('Failed to save client:', err)
      setError('Failed to save client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Clients</h1>
        <Button variant="primary" onClick={handleAdd}>
          <PlusIcon size={16} className="mr-2" />
          Add Client
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
              <TableHead>Name</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Opportunities</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  No clients yet. Click "Add Client" to get started.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
                    >
                      {new URL(client.website).hostname}
                      <ExternalLinkIcon size={12} />
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.keywords.slice(0, 3).map((kw, i) => (
                        <Badge key={i} variant="default">{kw}</Badge>
                      ))}
                      {client.keywords.length > 3 && (
                        <Badge variant="info">+{client.keywords.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.opportunities > 0 ? 'success' : 'default'}>
                      {client.opportunities}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={client.active}
                      onCheckedChange={() => handleToggleActive(client)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <IconButton size="sm" variant="ghost" onClick={() => handleEdit(client)}>
                        <EditIcon size={14} />
                      </IconButton>
                      <IconButton size="sm" variant="ghost" onClick={() => handleDelete(client.id)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <Input
                label="Client Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Corp"
              />
              <Input
                label="Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
              <Input
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the client"
              />
              <Input
                label="Keywords (comma-separated)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="project management, collaboration, productivity"
                helperText="Search terms to find relevant Reddit discussions"
              />
              <Input
                label="Mention Terms (comma-separated, optional)"
                value={mentionTerms}
                onChange={(e) => setMentionTerms(e.target.value)}
                placeholder="Acme, AcmeCorp"
                helperText="Brand names or terms that indicate direct mentions"
              />
              <Input
                label="Nuance (optional)"
                value={nuance}
                onChange={(e) => setNuance(e.target.value)}
                placeholder="Additional context for AI scoring"
                helperText="Help AI understand what makes a good opportunity"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                editingClient ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
