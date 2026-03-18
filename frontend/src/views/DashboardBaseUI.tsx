import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../components/base/Button'
import { Card, CardContent } from '../components/base/Card'
import { Badge } from '../components/base/Badge'
import { Input } from '../components/base/Input'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { IconButton } from '../components/base/IconButton'
import { 
  TrendingUpIcon, 
  ExternalLinkIcon, 
  RefreshCwIcon,
  FilterIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from 'lucide-react'

type StatusFilter = 'all' | 'new' | 'published' | 'unverified' | 'deleted_by_mod'

interface Opportunity {
  id: string
  clientId: string
  client: string
  subreddit: string
  title: string
  snippet: string
  threadUrl: string
  upvotes: number
  comments: number
  relevanceScore: number
  aiRelevanceNote: string
  status: StatusFilter
  createdAt: string
}

interface PipelineStatus {
  running: boolean
  lastRun?: string
  nextRun?: string
  stats?: {
    threadsFound: number
    opportunitiesCreated: number
  }
}

interface DashboardBaseUIProps {
  userRole?: 'admin' | 'operator'
}

export function DashboardBaseUI({ userRole = 'admin' }: DashboardBaseUIProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('new')
  const [clientFilter, setClientFilter] = useState('all')
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null)
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/opportunities')
      if (res.ok) {
        const data = await res.json()
        setOpportunities(data.map((o: any) => ({
          id: o.id,
          clientId: o.clientId,
          client: o.client?.name || 'Unknown',
          subreddit: o.subreddit,
          title: o.title,
          snippet: o.snippet,
          threadUrl: o.threadUrl,
          upvotes: o.upvotes,
          comments: o.comments,
          relevanceScore: o.relevanceScore,
          aiRelevanceNote: o.aiRelevanceNote,
          status: o.status,
          createdAt: o.createdAt,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: any) => ({ id: c.id, name: c.name })))
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }, [])

  const fetchPipelineStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/search/status')
      if (res.ok) {
        const data = await res.json()
        setPipelineStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch pipeline status:', err)
    }
  }, [])

  useEffect(() => {
    fetchOpportunities()
    fetchClients()
    fetchPipelineStatus()
  }, [fetchOpportunities, fetchClients, fetchPipelineStatus])

  const filteredOpportunities = opportunities.filter(opp => {
    if (statusFilter !== 'all' && opp.status !== statusFilter) return false
    if (clientFilter !== 'all' && opp.clientId !== clientFilter) return false
    return true
  })

  const statusCounts = {
    all: opportunities.length,
    new: opportunities.filter(o => o.status === 'new').length,
    published: opportunities.filter(o => o.status === 'published').length,
    unverified: opportunities.filter(o => o.status === 'unverified').length,
    deleted_by_mod: opportunities.filter(o => o.status === 'deleted_by_mod').length,
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 dark:text-green-400'
    if (score >= 0.7) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 0.9) return 'success'
    if (score >= 0.7) return 'warning'
    return 'danger'
  }

  const getStatusBadge = (status: StatusFilter) => {
    switch (status) {
      case 'new': return <Badge variant="info">New</Badge>
      case 'published': return <Badge variant="success">Published</Badge>
      case 'unverified': return <Badge variant="warning">Unverified</Badge>
      case 'deleted_by_mod': return <Badge variant="danger">Deleted</Badge>
      default: return <Badge variant="default">{status}</Badge>
    }
  }

  const handleRunSearch = async () => {
    try {
      await fetch('/api/search/run', { method: 'POST' })
      fetchPipelineStatus()
      setTimeout(fetchOpportunities, 2000)
    } catch (err) {
      console.error('Failed to run search:', err)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Pipeline Status Banner */}
      {pipelineStatus && (
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUpIcon className="text-orange-600 dark:text-orange-400" size={24} />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Search Pipeline
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {pipelineStatus.running ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" />
                        Running search...
                      </span>
                    ) : (
                      `Last run: ${pipelineStatus.lastRun || 'Never'}`
                    )}
                  </p>
                </div>
              </div>
              {userRole === 'admin' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunSearch}
                  disabled={pipelineStatus.running}
                >
                  <RefreshCwIcon size={14} className="mr-2" />
                  Run Search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Opportunities
        </h1>
        <Button variant="ghost" size="sm" onClick={fetchOpportunities}>
          <RefreshCwIcon size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'new', 'published', 'unverified', 'deleted_by_mod'] as StatusFilter[]).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                    <span className="ml-2 text-xs opacity-75">
                      {statusCounts[status]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Client Filter */}
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Client
              </label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No opportunities found. Try adjusting your filters or run a new search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOpportunities.map(opp => (
            <Card key={opp.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getScoreBadge(opp.relevanceScore)}>
                        {(opp.relevanceScore * 100).toFixed(0)}%
                      </Badge>
                      {getStatusBadge(opp.status)}
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        r/{opp.subreddit}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        •
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {opp.client}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">
                      {opp.title}
                    </h3>

                    {/* Snippet */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-3">
                      {opp.snippet}
                    </p>

                    {/* AI Note */}
                    {opp.aiRelevanceNote && (
                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <strong>AI Analysis:</strong> {opp.aiRelevanceNote}
                        </p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span>↑ {opp.upvotes}</span>
                      <span>💬 {opp.comments}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(opp.threadUrl, '_blank')}
                    >
                      <ExternalLinkIcon size={16} />
                    </IconButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
