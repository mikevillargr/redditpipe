import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { copyToClipboard } from '../utils/clipboard'
import { Button } from '../components/base/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/base/Dialog'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { Tabs, TabsList, TabsTrigger } from '../components/base/Tabs'
import { PileOnDialog } from '../components/PileOnDialog'
import {
  TrendingUpIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  XIcon,
  SlidersHorizontalIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  ClipboardIcon,
  SparklesIcon,
  RefreshCwIcon,
  AlignLeftIcon,
  MessageSquareIcon,
  BriefcaseIcon,
  LinkIcon,
  ExternalLinkIcon,
  TrashIcon,
  AlertCircleIcon,
  LightbulbIcon,
  SquareIcon,
  BrainIcon,
  UserIcon,
} from 'lucide-react'
import { RedditIcon } from '../components/RedditIcon'
import { DeletionAnalysisModal } from '../components/DeletionAnalysisModal'

type StatusFilter = 'all' | 'new' | 'published' | 'unverified' | 'deleted_by_mod'
interface AccountStats {
  postsToday: number
  maxPostsPerDay: number
  citationPct: number
}
interface Opportunity {
  id: string
  clientId: string
  subreddit: string
  title: string
  snippet: string
  topComments: string
  threadUrl: string
  upvotes: number
  comments: number
  age: string
  relevanceScore: number
  aiRelevanceNote: string
  client: string
  account: string
  accountPassword: string
  accountActive: boolean
  accountStats: AccountStats
  draftReply: string
  status: StatusFilter
  platform: 'reddit'
  permalinkUrl?: string
  discoveredVia?: string
  opportunityType?: string
  parentOpportunityId?: string
  pileOnEligibleAt?: string
  publishedAt?: string
  deletedAt?: string
  createdAt: string
}

function getTimeAgo(date: Date): string {
  const ms = Date.now() - date.getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

type ScoreFilter = 'any' | '<0.5' | '0.7' | '0.85' | '0.9'
type AiScoreFilter = 'all' | 'has_ai' | 'no_ai'
const scoreFilterOptions: { value: ScoreFilter; label: string; color: string }[] = [
  { value: 'any', label: 'Any score', color: '#64748b' },
  { value: '<0.5', label: '≤0.5', color: '#ef4444' },
  { value: '0.7', label: '0.7+', color: '#f59e0b' },
  { value: '0.85', label: '0.85+', color: '#10b981' },
  { value: '0.9', label: '0.9+ Strong', color: '#10b981' },
]

function CountBadge({ count, active, color }: { count: number; active: boolean; color?: string }) {
  return (
    <span
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold leading-none"
      style={{
        backgroundColor: active ? 'rgba(255,255,255,0.25)' : color ? `${color}20` : '#e2e8f0',
        color: active ? '#fff' : (color ?? '#64748b'),
      }}
    >
      {count}
    </span>
  )
}

interface DashboardProps {
  userRole?: 'admin' | 'operator'
}

export function DashboardBaseUI({ userRole = 'admin' }: DashboardProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [clientList, setClientList] = useState<{ id: string; name: string }[]>([])
  const [accountList, setAccountList] = useState<{ id: string; username: string; status: string }[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('new')
  const [clientFilter, setClientFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('any')
  const [aiScoreFilter, setAiScoreFilter] = useState<AiScoreFilter>('all')
  const [showPileOnOnly, setShowPileOnOnly] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [dateStart, setDateStart] = useState(sevenDaysAgo)
  const [dateEnd, setDateEnd] = useState(today)

  const applyPreset = (preset: string) => {
    const end = new Date().toISOString().split('T')[0]
    let start = end
    if (preset === '7d') start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    else if (preset === '30d') start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    else if (preset === '1y') start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setDateStart(start)
    setDateEnd(end)
  }

  const activePreset = (() => {
    const diffDays = Math.round((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / (1000 * 60 * 60 * 24))
    if (dateEnd === today && dateStart === today) return 'today'
    if (dateEnd === today && diffDays === 7) return '7d'
    if (dateEnd === today && diffDays === 30) return '30d'
    if (dateEnd === today && diffDays === 365) return '1y'
    return null
  })()

  const presets = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '1y', label: '1y' },
  ]

  const fetchOpportunities = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateStart) params.set('startDate', dateStart)
      if (dateEnd) params.set('endDate', dateEnd)
      const res = await fetch(`/api/opportunities?${params}`)
      if (res.ok) {
        const data = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOpportunities(data.map((o: any) => {
          const acct = o.account
          const totalPosts = (acct?.organicPostsTotal ?? 0) + (acct?.citationPostsTotal ?? 0)
          const citPct = totalPosts > 0 ? Math.round(((acct?.citationPostsTotal ?? 0) / totalPosts) * 100) : 0
          return {
            id: o.id,
            clientId: o.client?.id || '',
            subreddit: `r/${o.subreddit}`,
            title: o.title,
            snippet: o.bodySnippet || o.body || '',
            topComments: o.topComments || '',
            threadUrl: o.threadUrl || '',
            upvotes: o.score || o.threadUpvotes || 0,
            comments: o.commentCount || o.threadCommentCount || 0,
            age: getTimeAgo(new Date(o.createdAt)),
            relevanceScore: o.relevanceScore ?? 0,
            aiRelevanceNote: o.aiRelevanceNote || '',
            client: o.client?.name || 'Unknown',
            account: acct ? `u/${acct.username}` : 'Unassigned',
            accountPassword: acct?.password || '',
            accountActive: acct?.status === 'active',
            accountStats: {
              postsToday: acct?.postsTodayCount ?? 0,
              maxPostsPerDay: acct?.maxPostsPerDay ?? 3,
              citationPct: citPct,
            },
            draftReply: o.aiDraftReply || '',
            status: o.status as StatusFilter,
            platform: 'reddit' as const,
            permalinkUrl: o.permalinkUrl || undefined,
            discoveredVia: o.discoveredVia || undefined,
            opportunityType: o.opportunityType || undefined,
            parentOpportunityId: o.parentOpportunityId || undefined,
            pileOnEligibleAt: o.pileOnEligibleAt || undefined,
            publishedAt: o.publishedAt || undefined,
            deletedAt: o.deletedAt || undefined,
            createdAt: o.createdAt,
          }
        }))
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err)
    }
  }, [dateStart, dateEnd])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClientList(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }, [])

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccountList(data.map((a: { id: string; username: string; status: string }) => ({
          id: a.id,
          username: a.username,
          status: a.status,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    }
  }, [])

  useEffect(() => { fetchClients(); fetchAccounts() }, [fetchClients, fetchAccounts])
  useEffect(() => { fetchOpportunities() }, [fetchOpportunities])

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDismissDialog, setShowDismissDialog] = useState(false)
  const [dismissReason, setDismissReason] = useState('')
  // Single dismiss
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [showSingleDismissDialog, setShowSingleDismissDialog] = useState(false)
  const [singleDismissReason, setSingleDismissReason] = useState('')
  // Reassign
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [reassigningId, setReassigningId] = useState<string | null>(null)
  const [reassignAccountId, setReassignAccountId] = useState('')
  // Mark published permalink dialog
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishPermalink, setPublishPermalink] = useState('')
  // Pile-on dialog
  const [pileOnOppId, setPileOnOppId] = useState<string | null>(null)
  const [pileOnOppTitle, setPileOnOppTitle] = useState('')
  const [pileOnThreadUrl, setPileOnThreadUrl] = useState('')
  const [showPileOnDialog, setShowPileOnDialog] = useState(false)
  const [showDeletionAnalysis, setShowDeletionAnalysis] = useState(false)
  const [deletionAnalysisData, setDeletionAnalysisData] = useState<any>(null)
  const [analyzingDeletion, setAnalyzingDeletion] = useState(false)
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<number>>(new Set())
  // Thread preview
  const [previewOpp, setPreviewOpp] = useState<Opportunity | null>(null)
  // Lazy load / infinite scroll
  const PAGE_SIZE = 15
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // AI Scoring Alert interface
  interface AiScoringAlert {
    id: string
    timestamp: string
    failures: number
    successes: number
    failureRate: number
    sampleErrors: string[]
    dismissed: boolean
  }

  // Pipeline status polling
  interface PipelineStatusData {
    running: boolean
    phase: string
    progress: string
    startedAt: string | null
    lastCompletedAt: string | null
    opportunitiesCreated: number
    lastResult: {
      summary: {
        opportunitiesCreated: number
        threadsDiscovered: number
        skipped: { duplicate: number; tooOld: number; lowScore: number; heuristic: number }
        aiCalls: number
        aiScoringSuccesses: number
        aiScoringFailures: number
        durationMs: number
        errors: number
      }
      aiScoringErrors?: string[]
    } | null
  }
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusData | null>(() => {
    // Load from localStorage on initial render
    try {
      const saved = localStorage.getItem('pipelineStatus')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [triggeringSearch, setTriggeringSearch] = useState(false)
  const prevCreatedRef = useRef(0)

  const fetchPipelineStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/search/status')
      if (res.ok) {
        const data = await res.json()
        setPipelineStatus(data)
        // Save to localStorage
        try {
          localStorage.setItem('pipelineStatus', JSON.stringify(data))
        } catch (e) {
          // Ignore localStorage errors
        }
        if (data.running && data.opportunitiesCreated > prevCreatedRef.current) {
          prevCreatedRef.current = data.opportunitiesCreated
          fetchOpportunities()
        }
        if (!data.running && prevCreatedRef.current > 0) {
          prevCreatedRef.current = 0
          fetchOpportunities()
        }
        if (data.lastCompletedAt && !data.running) {
          fetchOpportunities()
        }
      }
    } catch (err) {
      console.error('Failed to fetch pipeline status:', err)
    }
  }, [fetchOpportunities])

  useEffect(() => {
    fetchPipelineStatus()
    const interval = setInterval(fetchPipelineStatus, pipelineStatus?.running ? 2000 : 30000)
    return () => clearInterval(interval)
  }, [fetchPipelineStatus, pipelineStatus?.running])

  const handleTriggerSearch = async () => {
    setTriggeringSearch(true)
    try {
      await fetch('/api/search/run', { method: 'POST' })
      setTimeout(fetchPipelineStatus, 1000)
    } catch { /* ignore */ }
    setTriggeringSearch(false)
  }

  const [stoppingSearch, setStoppingSearch] = useState(false)
  const handleStopSearch = async () => {
    setStoppingSearch(true)
    try {
      await fetch('/api/search/stop', { method: 'POST' })
      setTimeout(fetchPipelineStatus, 1000)
    } catch { /* ignore */ }
    setTimeout(() => setStoppingSearch(false), 3000)
  }

  const [verifyingCards, setVerifyingCards] = useState<Set<string>>(new Set())
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' }>({
    open: false, message: '', severity: 'success',
  })

  // AI Scoring Alert state
  const [aiScoringAlert, setAiScoringAlert] = useState<AiScoringAlert | null>(() => {
    try {
      const stored = localStorage.getItem('aiScoringAlerts')
      if (stored) {
        const alerts = JSON.parse(stored) as AiScoringAlert[]
        return alerts.find(a => !a.dismissed) || null
      }
    } catch {}
    return null
  })
  const [showAlertDetails, setShowAlertDetails] = useState(false)

  // Auto-hide snackbar
  useEffect(() => {
    if (snackbar.open) {
      const t = setTimeout(() => setSnackbar(s => ({ ...s, open: false })), 4000)
      return () => clearTimeout(t)
    }
  }, [snackbar.open, snackbar.message])

  // Detect AI scoring failures and create alerts
  useEffect(() => {
    if (!pipelineStatus?.running && pipelineStatus?.lastResult) {
      const { aiScoringFailures, aiScoringSuccesses } = pipelineStatus.lastResult.summary
      if (aiScoringFailures > 0) {
        const totalAttempts = aiScoringFailures + (aiScoringSuccesses || 0)
        const failureRate = (aiScoringFailures / totalAttempts) * 100
        const alert: AiScoringAlert = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          failures: aiScoringFailures,
          successes: aiScoringSuccesses || 0,
          failureRate,
          sampleErrors: pipelineStatus.lastResult.aiScoringErrors || [],
          dismissed: false,
        }
        setAiScoringAlert(alert)
        try {
          localStorage.setItem('aiScoringAlerts', JSON.stringify([alert]))
        } catch {}
      }
    }
  }, [pipelineStatus?.running, pipelineStatus?.lastResult])

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleMarkPublished = (id: string) => {
    setPublishingId(id)
    setPublishPermalink('')
    setShowPublishDialog(true)
  }

  const handleConfirmPublish = async () => {
    if (!publishingId || !publishPermalink.trim()) return
    await handleManualVerify(publishingId, publishPermalink)
    setShowPublishDialog(false)
    setPublishingId(null)
    setPublishPermalink('')
  }

  const handlePileOn = (id: string, title: string, threadUrl: string) => {
    setPileOnOppId(id)
    setPileOnOppTitle(title)
    setPileOnThreadUrl(threadUrl)
    setShowPileOnDialog(true)
  }

  const handlePileOnSuccess = () => {
    setSnackbar({ open: true, message: 'Pile-on comment published successfully ✓', severity: 'success' })
    fetchOpportunities()
  }

  const handleAssignAccount = async (opportunityId: string, accountId: string) => {
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      if (res.ok) {
        setSnackbar({ open: true, message: 'Account assigned successfully ✓', severity: 'success' })
        fetchOpportunities()
      } else {
        const data = await res.json()
        setSnackbar({ open: true, message: data.error || 'Failed to assign account', severity: 'warning' })
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to assign account', severity: 'warning' })
    }
  }

  const handleManualVerify = async (id: string, permalink: string) => {
    if (!permalink.trim()) return
    setVerifyingCards(prev => new Set(prev).add(id))
    try {
      await fetch(`/api/opportunities/${id}/manual-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permalinkUrl: permalink.trim() }),
      })
      setVerifyingCards(prev => { const n = new Set(prev); n.delete(id); return n })
      setSnackbar({ open: true, message: 'Permalink saved — marked as Published ✓', severity: 'success' })
      fetchOpportunities()
    } catch {
      setVerifyingCards(prev => { const n = new Set(prev); n.delete(id); return n })
      setSnackbar({ open: true, message: 'Manual verification failed', severity: 'warning' })
    }
  }

  const handleDismiss = (id: string) => {
    setDismissingId(id)
    setSingleDismissReason('')
    setShowSingleDismissDialog(true)
  }

  const handleAnalyzeDeletion = async (id: string) => {
    setAnalyzingDeletion(true)
    setShowDeletionAnalysis(true)
    setDeletionAnalysisData(null)
    setSelectedRecommendations(new Set())
    try {
      const res = await fetch(`/api/deletion-analysis/analyze/${id}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setDeletionAnalysisData(data.analysis)
      } else {
        const data = await res.json()
        setDeletionAnalysisData({ error: data.error || 'Failed to analyze deletion' })
      }
    } catch (err) {
      setDeletionAnalysisData({ error: 'Network error - could not analyze deletion' })
    } finally {
      setAnalyzingDeletion(false)
    }
  }

  const toggleRecommendation = (index: number) => {
    setSelectedRecommendations(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index); else next.add(index)
      return next
    })
  }

  const handleApplyRecommendations = async () => {
    if (!deletionAnalysisData || !deletionAnalysisData.recommendations) return
    try {
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settings = await settingsRes.json()
      const recommendations = JSON.parse(deletionAnalysisData.recommendations)
      const selectedRecs = Array.from(selectedRecommendations).map(i => recommendations[i]).filter(Boolean)
      const current = settings.specialInstructions || ''
      const newInstructions = selectedRecs.join('\n')
      const separator = current.trim() ? '\n\n' : ''
      const updated = current.trim() + separator + newInstructions
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialInstructions: updated }),
      })
      setShowDeletionAnalysis(false)
      setSnackbar({ open: true, message: `Applied ${selectedRecs.length} recommendation(s) to Special Instructions for AI Generation`, severity: 'success' })
    } catch {
      setSnackbar({ open: true, message: 'Failed to apply recommendations', severity: 'warning' })
    }
  }

  const handleReassign = (id: string) => {
    setReassigningId(id)
    setReassignAccountId('')
    setShowReassignDialog(true)
  }

  const confirmReassign = async () => {
    if (!reassigningId || !reassignAccountId) return
    try {
      const res = await fetch(`/api/opportunities/${reassigningId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: reassignAccountId }),
      })
      if (res.ok) {
        await fetchOpportunities()
        setSnackbar({ open: true, message: 'Opportunity reassigned successfully', severity: 'success' })
        setShowReassignDialog(false)
      } else {
        setSnackbar({ open: true, message: 'Failed to reassign opportunity', severity: 'warning' })
      }
    } catch {
      setSnackbar({ open: true, message: 'Network error', severity: 'warning' })
    }
  }

  const handleConfirmSingleDismiss = async () => {
    if (!dismissingId || !singleDismissReason.trim()) return
    try {
      const res = await fetch(`/api/opportunities/${dismissingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed', dismissReason: singleDismissReason.trim() }),
      })
      if (res.ok) {
        setSnackbar({ open: true, message: 'Opportunity dismissed & logged', severity: 'info' })
      } else {
        const data = await res.json()
        setSnackbar({ open: true, message: data.error || 'Failed to dismiss', severity: 'warning' })
      }
      setShowSingleDismissDialog(false)
      setDismissingId(null)
      setSingleDismissReason('')
      fetchOpportunities()
    } catch {
      setSnackbar({ open: true, message: 'Failed to dismiss', severity: 'warning' })
    }
  }

  const handleUpdateDraft = async (id: string, newDraft: string) => {
    try {
      await fetch(`/api/opportunities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiDraftReply: newDraft }),
      })
      fetchOpportunities()
    } catch (err) {
      console.error('Failed to update draft:', err)
    }
  }

  // Filtering
  const clientFilteredOpps = clientFilter === 'all' ? opportunities : opportunities.filter(o => o.clientId === clientFilter)
  const filteredOpportunities = clientFilteredOpps.filter(o => {
    // Date filtering - use relevant timestamp based on status
    const relevantDate = (() => {
      if (statusFilter === 'published' && o.publishedAt) return new Date(o.publishedAt)
      if (statusFilter === 'deleted_by_mod' && o.deletedAt) return new Date(o.deletedAt)
      return new Date(o.createdAt)
    })()

    if (dateStart && relevantDate < new Date(dateStart)) return false
    if (dateEnd && relevantDate > new Date(dateEnd + 'T23:59:59')) return false

    // Status filtering
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (scoreFilter === '<0.5' && o.relevanceScore > 0.5) return false
    if (scoreFilter !== 'any' && scoreFilter !== '<0.5' && o.relevanceScore < parseFloat(scoreFilter)) return false
    const hasRealAiScore = !!o.aiRelevanceNote && !o.aiRelevanceNote.includes('AI scoring unavailable')
    if (aiScoreFilter === 'has_ai' && !hasRealAiScore) return false
    if (aiScoreFilter === 'no_ai' && hasRealAiScore) return false
    if (showPileOnOnly) {
      if (o.opportunityType !== 'pile_on') return false
      if (o.pileOnEligibleAt && new Date(o.pileOnEligibleAt) > new Date()) return false
    }
    return true
  })

  // Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const selectAll = () => {
    if (selectedIds.size === filteredOpportunities.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOpportunities.map(o => o.id)))
    }
  }

  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) return
    try {
      await fetch('/api/opportunities/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: 'publish' }),
      })
      setSnackbar({ open: true, message: `${selectedIds.size} opportunities marked as published`, severity: 'success' })
      setSelectedIds(new Set())
      fetchOpportunities()
    } catch {
      setSnackbar({ open: true, message: 'Bulk publish failed', severity: 'warning' })
    }
  }

  const handleBulkDismiss = async () => {
    if (selectedIds.size === 0 || !dismissReason.trim()) return
    try {
      const res = await fetch('/api/opportunities/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: 'dismiss', dismissReason: dismissReason.trim() }),
      })
      if (res.ok) {
        setSnackbar({ open: true, message: `${selectedIds.size} opportunities dismissed & logged`, severity: 'info' })
      } else {
        const data = await res.json()
        setSnackbar({ open: true, message: data.error || 'Bulk dismiss failed', severity: 'warning' })
      }
      setSelectedIds(new Set())
      setShowDismissDialog(false)
      setDismissReason('')
      fetchOpportunities()
    } catch {
      setSnackbar({ open: true, message: 'Bulk dismiss failed', severity: 'warning' })
    }
  }

  const handleBulkAssign = async () => {
    const unassignedSelected = Array.from(selectedIds).filter(id => {
      const opp = opportunities.find(o => o.id === id)
      return opp && !opp.account
    })
    if (unassignedSelected.length === 0) {
      setSnackbar({ open: true, message: 'No unassigned opportunities selected', severity: 'warning' })
      return
    }
    try {
      const res = await fetch('/api/opportunities/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityIds: unassignedSelected }),
      })
      if (res.ok) {
        const data = await res.json()
        setSnackbar({ open: true, message: `Assigned ${data.assigned} of ${unassignedSelected.length} opportunities`, severity: 'success' })
        setSelectedIds(new Set())
        fetchOpportunities()
      } else {
        const data = await res.json()
        setSnackbar({ open: true, message: data.error || 'Bulk assign failed', severity: 'warning' })
      }
    } catch {
      setSnackbar({ open: true, message: 'Bulk assign failed', severity: 'warning' })
    }
  }

  const handleAutoAssignAll = async () => {
    try {
      const res = await fetch('/api/opportunities/auto-assign-all', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setSnackbar({ open: true, message: `Auto-assigned ${data.assigned} opportunities`, severity: 'success' })
        fetchOpportunities()
      } else {
        const data = await res.json()
        setSnackbar({ open: true, message: data.error || 'Auto-assign failed', severity: 'warning' })
      }
    } catch {
      setSnackbar({ open: true, message: 'Auto-assign failed', severity: 'warning' })
    }
  }

  // Reset visible count and selection when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setSelectedIds(new Set())
  }, [clientFilter, statusFilter, scoreFilter, aiScoreFilter, dateStart, dateEnd, showPileOnOnly])

  const visibleOpportunities = useMemo(() => filteredOpportunities.slice(0, visibleCount), [filteredOpportunities, visibleCount])
  const hasMore = visibleCount < filteredOpportunities.length

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) setVisibleCount(prev => prev + PAGE_SIZE) },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore])

  const countByStatus = (s: StatusFilter) => clientFilteredOpps.filter(o => o.status === s).length
  const newCount = countByStatus('new')
  const publishedCount = countByStatus('published')
  const unverifiedCount = countByStatus('unverified')
  const deletedCount = countByStatus('deleted_by_mod')
  const allCount = clientFilteredOpps.length

  // ── STATUS TOGGLE BUTTON HELPER ──
  const StatusBtn = ({ value, label, count, color }: { value: StatusFilter; label: string; count: number; color?: string }) => (
    <button
      onClick={() => setStatusFilter(value)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium whitespace-nowrap border transition-colors ${
        statusFilter === value
          ? 'bg-orange-500 text-white border-orange-500'
          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      } first:rounded-l-lg last:rounded-r-lg -ml-px first:ml-0`}
    >
      {label} <CountBadge count={count} active={statusFilter === value} color={color} />
    </button>
  )

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 md:mb-6">Opportunities</h1>

      {/* AI Scoring Alert Banner */}
      {aiScoringAlert && !aiScoringAlert.dismissed && (
        <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <AlertCircleIcon size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">
              AI Scoring Issues Detected
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {aiScoringAlert.failures} failures out of {aiScoringAlert.failures + aiScoringAlert.successes} attempts 
              ({aiScoringAlert.failureRate.toFixed(1)}% failure rate). This may prevent opportunities from being created.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAlertDetails(true)}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
            >
              View Details
            </button>
            <button
              onClick={() => {
                const dismissed = { ...aiScoringAlert, dismissed: true }
                setAiScoringAlert(dismissed)
                try {
                  localStorage.setItem('aiScoringAlerts', JSON.stringify([dismissed]))
                } catch {}
              }}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Pipeline Status Banner */}
      <div className={`mb-3 px-3 py-2 flex items-center gap-3 flex-wrap border ${
        pipelineStatus?.running
          ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
          : 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
      }`}>
        {pipelineStatus?.running ? (
          <>
            <Spinner className="w-4 h-4 text-blue-500" />
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13px] font-semibold text-blue-500">
                Search running — {pipelineStatus.phase}
                {pipelineStatus.opportunitiesCreated > 0 ? ` (${pipelineStatus.opportunitiesCreated} found)` : ''}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{pipelineStatus.progress}</p>
            </div>
            <button
              onClick={handleStopSearch}
              disabled={stoppingSearch}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md disabled:opacity-60 whitespace-nowrap"
            >
              {stoppingSearch ? <Spinner className="w-3.5 h-3.5" /> : <SquareIcon size={14} />}
              {stoppingSearch ? 'Stopping...' : 'Stop Search'}
            </button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                {pipelineStatus?.lastCompletedAt
                  ? `Last search: ${getTimeAgo(new Date(pipelineStatus.lastCompletedAt))} (${new Date(pipelineStatus.lastCompletedAt).toLocaleString()}${pipelineStatus.lastResult
                      ? ` — ${pipelineStatus.lastResult.summary.opportunitiesCreated} new, ${pipelineStatus.lastResult.summary.threadsDiscovered} threads, ${pipelineStatus.lastResult.summary.aiCalls} AI calls, ${pipelineStatus.lastResult.summary.skipped?.heuristic || 0} pre-filtered, ${(pipelineStatus.lastResult.summary.durationMs / 1000).toFixed(0)}s`
                      : ''})`
                  : 'No search run yet'}
              </p>
            </div>
            {userRole === 'admin' && (
              <button
                onClick={handleTriggerSearch}
                disabled={triggeringSearch}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md disabled:opacity-60"
              >
                {triggeringSearch ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCwIcon size={14} />}
                Run Search
              </button>
            )}
          </>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-b-0 rounded-t-xl overflow-hidden shadow-lg">
        {/* Row 1: Client + Status */}
        <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800">
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="min-w-[140px] text-[13px] px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Clients</option>
            {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="overflow-x-auto">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="inline-flex">
              <TabsList>
                <TabsTrigger value="new">New ({newCount})</TabsTrigger>
                <TabsTrigger value="published">Published ({publishedCount})</TabsTrigger>
                <TabsTrigger value="unverified">Unverified ({unverifiedCount})</TabsTrigger>
                <TabsTrigger value="deleted_by_mod">Deleted ({deletedCount})</TabsTrigger>
                <TabsTrigger value="all">All ({allCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Row 2: Score + AI filter */}
        <div className="px-3 sm:px-4 py-2 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontalIcon size={13} className="text-slate-500" />
            <span className="text-xs text-slate-500 whitespace-nowrap">Score:</span>
            <div className="inline-flex">
              {scoreFilterOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setScoreFilter(opt.value)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md transition-colors ${
                    scoreFilter === opt.value
                      ? 'bg-orange-500/10 text-orange-500 border-orange-500/40'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.value !== 'any' && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: opt.color }} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-[18px] bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <BrainIcon size={13} className="text-slate-500" />
            <span className="text-xs text-slate-500 whitespace-nowrap">AI:</span>
            <div className="inline-flex">
              {(['all', 'has_ai', 'no_ai'] as AiScoreFilter[]).map(val => (
                <button
                  key={val}
                  onClick={() => setAiScoreFilter(val)}
                  className={`px-2 py-0.5 text-[11px] border -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md transition-colors ${
                    aiScoreFilter === val
                      ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/40'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {val === 'all' ? 'All' : val === 'has_ai' ? 'AI Scored' : 'No AI'}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-[18px] bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => setShowPileOnOnly(!showPileOnOnly)}
            className={`h-6 px-2 text-[11px] font-semibold rounded-full border cursor-pointer transition-colors ${
              showPileOnOnly
                ? 'bg-purple-500/15 text-purple-500 border-purple-500'
                : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-purple-500/10 hover:border-purple-500 hover:text-purple-500'
            }`}
          >
            Pile-On
          </button>
        </div>

        {/* Row 3: Date presets + pickers */}
        <div className="px-3 sm:px-4 py-2 flex items-center gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800">
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-2 py-0.5 rounded-[5px] text-xs font-medium border select-none cursor-pointer transition-all ${
                activePreset === p.key
                  ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/5'
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-px h-[18px] bg-slate-200 dark:bg-slate-700" />
            <input
              type="date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              max={dateEnd}
              className="w-[135px] text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
            />
            <span className="text-xs text-slate-400">–</span>
            <input
              type="date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              min={dateStart}
              max={today}
              className="w-[135px] text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-3 sm:px-5 py-2.5 mb-4 md:mb-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-t border-t-slate-200 dark:border-t-slate-800 rounded-b-xl flex items-center gap-4 sm:gap-6 flex-wrap shadow-lg">
        {filteredOpportunities.length > 0 && (
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === filteredOpportunities.length}
              ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredOpportunities.length }}
              onChange={selectAll}
              className="w-4 h-4 rounded accent-orange-500"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap" onClick={selectAll}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all (${filteredOpportunities.length})`}
            </span>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 ml-1" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <TrendingUpIcon size={13} className="text-orange-500" />
          <span className="text-[13px] text-slate-500 dark:text-slate-400">
            New today: <strong className="text-orange-500">{newCount}</strong>
          </span>
        </div>
        <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
        <div className="flex items-center gap-2">
          <CheckCircleIcon size={13} className="text-emerald-500" />
          <span className="text-[13px] text-slate-500 dark:text-slate-400">
            Published: <strong className="text-emerald-500">{publishedCount}</strong>
          </span>
        </div>
        {unverifiedCount > 0 && (
          <>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <AlertCircleIcon size={13} className="text-amber-500" />
              <span className="text-[13px] text-slate-500 dark:text-slate-400">
                Unverified: <strong className="text-amber-500">{unverifiedCount}</strong>
              </span>
            </div>
          </>
        )}
        {scoreFilter !== 'any' && (
          <>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <SlidersHorizontalIcon size={12} className="text-orange-500" />
              <span className="text-[13px] text-slate-500 dark:text-slate-400">
                Score filter: <strong className="text-orange-500">{scoreFilter}+</strong> · showing <strong className="text-slate-900 dark:text-slate-100">{filteredOpportunities.length}</strong> results
              </span>
            </div>
          </>
        )}
      </div>

      {/* Bulk action bar — fixed bottom bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-white/[.97] dark:bg-slate-900/[.97] rounded-xl border border-slate-200 dark:border-slate-700 z-[1300] backdrop-blur-lg shadow-lg max-w-[calc(100vw-32px)] md:max-w-[600px]">
          <input
            type="checkbox"
            checked={selectedIds.size === filteredOpportunities.length}
            ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredOpportunities.length }}
            onChange={selectAll}
            className="w-4 h-4 rounded accent-orange-500"
          />
          <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <button onClick={handleBulkAssign} className="px-3 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md whitespace-nowrap">Auto-Assign</button>
          <button onClick={handleBulkPublish} className="px-3 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-md whitespace-nowrap">Mark Published</button>
          <button onClick={() => setShowDismissDialog(true)} className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md whitespace-nowrap">Dismiss Selected</button>
        </div>
      )}

      {/* Opportunity Cards */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {visibleOpportunities.map(opp => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            expanded={expandedCards.has(opp.id)}
            verifying={verifyingCards.has(opp.id)}
            selected={selectedIds.has(opp.id)}
            onToggleSelect={() => toggleSelect(opp.id)}
            onToggleExpand={() => toggleExpand(opp.id)}
            onMarkPublished={() => handleMarkPublished(opp.id)}
            onManualVerify={permalink => handleManualVerify(opp.id, permalink)}
            onDismiss={() => handleDismiss(opp.id)}
            onUpdateDraft={text => handleUpdateDraft(opp.id, text)}
            onPileOn={() => handlePileOn(opp.id, opp.title, opp.threadUrl)}
            onPreview={() => setPreviewOpp(opp)}
            onReassign={() => handleReassign(opp.id)}
            onAssignAccount={accountId => handleAssignAccount(opp.id, accountId)}
            onAnalyzeDeletion={() => handleAnalyzeDeletion(opp.id)}
            analyzingDeletion={analyzingDeletion}
            availableAccounts={accountList}
          />
        ))}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-px" />
        {hasMore && (
          <div className="text-center py-4">
            <Spinner className="text-orange-500" />
          </div>
        )}
        {filteredOpportunities.length > 0 && (
          <p className="text-center text-xs text-slate-400 py-2">
            Showing {visibleOpportunities.length} of {filteredOpportunities.length} opportunities
          </p>
        )}
        {filteredOpportunities.length === 0 && opportunities.length === 0 && (
          <div className="text-center py-12 px-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-[40px] mb-3">{clientList.length === 0 ? '🏢' : '🔍'}</div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {clientList.length === 0 ? 'No clients configured yet' : 'No opportunities found'}
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-[420px] mx-auto leading-relaxed">
              {clientList.length === 0
                ? 'Add a client first — go to the Clients page and enter a website URL. The AI will auto-detect keywords and set up everything for you.'
                : 'Run a search to discover Reddit threads that match your clients. Opportunities will appear here once the pipeline finds relevant threads. Reddit accounts are optional — opportunities will show as "Unassigned" until accounts are added.'}
            </p>
          </div>
        )}
        {filteredOpportunities.length === 0 && opportunities.length > 0 && (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No opportunities match the current filters.</p>
          </div>
        )}
      </div>

      {/* Snackbar / Toast */}
      {snackbar.open && (
        <div className="fixed bottom-6 right-6 z-[1400] animate-in slide-in-from-bottom-4">
          <Alert
            variant={snackbar.severity === 'success' ? 'success' : snackbar.severity === 'info' ? 'info' : 'warning'}
            className="shadow-lg border border-slate-200 dark:border-slate-700"
          >
            {snackbar.message}
          </Alert>
        </div>
      )}

      {/* Thread Preview Dialog */}
      <Dialog open={!!previewOpp} onOpenChange={open => { if (!open) setPreviewOpp(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          {previewOpp && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#ff4500]/10 text-[#ff4500] border border-[#ff4500]/15">
                    {previewOpp.subreddit}
                  </span>
                  <span className="text-xs text-slate-500">{previewOpp.age}</span>
                  <span className="flex-1" />
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                    previewOpp.relevanceScore >= 0.7 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    Score: {Math.round(previewOpp.relevanceScore * 100)}%
                  </span>
                </div>
                <DialogTitle className="text-[17px] font-bold leading-snug">{previewOpp.title}</DialogTitle>
                {previewOpp.aiRelevanceNote && (() => {
                  let parsed: any = null
                  try { parsed = JSON.parse(previewOpp.aiRelevanceNote) } catch { parsed = { note: previewOpp.aiRelevanceNote } }
                  const note = parsed?.note || previewOpp.aiRelevanceNote
                  return (
                    <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 dark:border-indigo-500/20">
                      <SparklesIcon size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[13px] text-indigo-600 dark:text-indigo-400 leading-relaxed font-medium">{note}</p>
                    </div>
                  )
                })()}
              </DialogHeader>
              <DialogBody>
                {previewOpp.snippet && (
                  <div className="mb-4">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-1">Post Body</h4>
                    <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{previewOpp.snippet}</p>
                  </div>
                )}
                {previewOpp.topComments && (
                  <div className="mb-4">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-1">Top Comments</h4>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                      {previewOpp.topComments.split('\n\n').map((comment, i) => (
                        <p key={i} className={`text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed ${i < previewOpp.topComments.split('\n\n').length - 1 ? 'mb-3' : ''}`}>
                          {comment}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {previewOpp.draftReply && (
                  <div>
                    <h4 className="text-[11px] font-bold text-orange-500 uppercase mb-1">AI Draft Reply</h4>
                    <div className="bg-orange-500/5 border border-orange-500/15 rounded-lg p-4">
                      <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{previewOpp.draftReply}</p>
                    </div>
                  </div>
                )}
              </DialogBody>
              <DialogFooter>
                {previewOpp.threadUrl && (
                  <Button variant="ghost" size="sm" onClick={() => window.open(previewOpp!.threadUrl, '_blank')}>
                    Open on Reddit
                  </Button>
                )}
                <span className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => setPreviewOpp(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Dismiss Reason Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={open => { if (!open) { setShowDismissDialog(false); setDismissReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss {selectedIds.size} Opportunit{selectedIds.size === 1 ? 'y' : 'ies'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-3">
              A reason is required — it trains the model to show more relevant results.
            </p>
            <textarea
              value={dismissReason}
              onChange={e => setDismissReason(e.target.value)}
              rows={3}
              placeholder="e.g. Off-topic, wrong industry, not seeking recommendations..."
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none text-sm"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setShowDismissDialog(false); setDismissReason('') }}>Cancel</Button>
            <Button variant="danger" size="sm" disabled={!dismissReason.trim()} onClick={handleBulkDismiss}>
              Dismiss {selectedIds.size} Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Opportunity Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={open => { if (!open) { setShowReassignDialog(false); setReassigningId(null); setReassignAccountId('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Opportunity</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-3">
              Select a different Reddit account to assign this opportunity to.
            </p>
            <select
              value={reassignAccountId}
              onChange={e => setReassignAccountId(e.target.value)}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="" disabled>Select an account...</option>
              {accountList.map(acc => <option key={acc.id} value={acc.id}>u/{acc.username} ({acc.status})</option>)}
            </select>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setShowReassignDialog(false); setReassigningId(null); setReassignAccountId('') }}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!reassignAccountId} onClick={confirmReassign}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Dismiss Reason Dialog */}
      <Dialog open={showSingleDismissDialog} onOpenChange={open => { if (!open) { setShowSingleDismissDialog(false); setDismissingId(null); setSingleDismissReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Opportunity</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-3">
              A reason is required — it trains the model to show more relevant results.
            </p>
            <textarea
              value={singleDismissReason}
              onChange={e => setSingleDismissReason(e.target.value)}
              rows={3}
              placeholder="e.g. Off-topic, wrong industry, not seeking recommendations..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none text-sm"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setShowSingleDismissDialog(false); setDismissingId(null); setSingleDismissReason('') }}>Cancel</Button>
            <Button variant="danger" size="sm" disabled={!singleDismissReason.trim()} onClick={handleConfirmSingleDismiss}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Published - Permalink Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={open => { if (!open) { setShowPublishDialog(false); setPublishingId(null); setPublishPermalink('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Published</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-3">
              Enter the comment permalink from Reddit to verify and mark this opportunity as published.
            </p>
            <textarea
              value={publishPermalink}
              onChange={e => setPublishPermalink(e.target.value)}
              rows={2}
              placeholder="https://www.reddit.com/r/subreddit/comments/abc123/comment/xyz456/"
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none text-sm"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setShowPublishDialog(false); setPublishingId(null); setPublishPermalink('') }}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!publishPermalink.trim()} onClick={handleConfirmPublish}>Verify & Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pile-On Dialog */}
      {pileOnOppId && (
        <PileOnDialog
          open={showPileOnDialog}
          onClose={() => { setShowPileOnDialog(false); setPileOnOppId(null); setPileOnOppTitle(''); setPileOnThreadUrl('') }}
          opportunityId={pileOnOppId}
          opportunityTitle={pileOnOppTitle}
          threadUrl={pileOnThreadUrl}
          onSuccess={handlePileOnSuccess}
        />
      )}

      {/* AI Scoring Alert Details Modal */}
      <Dialog open={showAlertDetails} onOpenChange={setShowAlertDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Scoring Failure Details</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {aiScoringAlert && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Statistics</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {aiScoringAlert.failures} failures, {aiScoringAlert.successes} successes
                    ({aiScoringAlert.failureRate.toFixed(1)}% failure rate)
                  </p>
                </div>
                {aiScoringAlert.sampleErrors && aiScoringAlert.sampleErrors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Sample Errors</p>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      {aiScoringAlert.sampleErrors.map((err, i) => (
                        <li key={i} className="font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded text-[11px] break-all">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Troubleshooting</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                    <li>Check AI model configuration in Settings</li>
                    <li>Verify Anthropic API key is valid</li>
                    <li>Review AI search context for overly complex instructions</li>
                    <li>Check backend logs for full error details</li>
                    <li>Consider lowering the relevance threshold if it's too strict</li>
                  </ul>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowAlertDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Analysis Modal */}
      <DeletionAnalysisModal
        open={showDeletionAnalysis}
        onClose={() => setShowDeletionAnalysis(false)}
        loading={analyzingDeletion}
        data={deletionAnalysisData}
        selectedRecommendations={selectedRecommendations}
        onToggleRecommendation={toggleRecommendation}
        onApply={handleApplyRecommendations}
      />
    </div>
  )
}

// ── Opportunity Card ──────────────────────────────────────────────────────────
interface OpportunityCardProps {
  opportunity: Opportunity
  expanded: boolean
  verifying: boolean
  selected: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
  onMarkPublished: () => void
  onManualVerify: (permalink: string) => void
  onDismiss: () => void
  onUpdateDraft: (text: string) => void
  onPileOn: () => void
  onPreview: () => void
  onReassign: () => void
  onAssignAccount: (accountId: string) => void
  onAnalyzeDeletion: () => void
  analyzingDeletion: boolean
  availableAccounts: { id: string; username: string; status: string }[]
}

function OpportunityCard({
  opportunity: opp,
  expanded,
  verifying,
  selected,
  onToggleSelect,
  onToggleExpand,
  onMarkPublished,
  onManualVerify,
  onDismiss,
  onUpdateDraft,
  onPileOn,
  onPreview,
  onReassign,
  onAssignAccount,
  onAnalyzeDeletion,
  analyzingDeletion,
  availableAccounts,
}: OpportunityCardProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedDraft, setCopiedDraft] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(opp.draftReply)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [permalinkInput, setPermalinkInput] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiPrompt, setShowAiPrompt] = useState(false)

  const scoreColor = opp.relevanceScore >= 0.85 ? '#10b981' : opp.relevanceScore >= 0.7 ? '#f59e0b' : '#ef4444'
  const { postsToday, maxPostsPerDay, citationPct } = opp.accountStats
  const postRatio = maxPostsPerDay > 0 ? postsToday / maxPostsPerDay : 0
  const postBarColor = postRatio >= 1 ? '#ef4444' : postRatio >= 0.5 ? '#f59e0b' : '#10b981'
  const citationBarColor = citationPct <= 25 ? '#10b981' : citationPct <= 40 ? '#f59e0b' : '#ef4444'

  const isPublished = opp.status === 'published'
  const isUnverified = opp.status === 'unverified'
  const isNew = opp.status === 'new'
  const isDeleted = opp.status === 'deleted_by_mod'
  const isPileOn = opp.opportunityType === 'pile_on'
  const hasDraft = Boolean(editText?.trim() || opp.draftReply?.trim())

  const handleCopy = async () => {
    const success = await copyToClipboard(opp.accountPassword)
    if (success) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }
  const handleCopyDraft = async () => {
    const textToCopy = editText || opp.draftReply || ''
    if (textToCopy) {
      const success = await copyToClipboard(textToCopy)
      if (success) { setCopiedDraft(true); setTimeout(() => setCopiedDraft(false), 2000) }
    }
  }

  const handleAiAction = async (action: string) => {
    setAiLoading(action)
    setAiError(null)
    try {
      const res = await fetch(`/api/opportunities/${opp.id}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(aiPrompt.trim() ? { userPrompt: aiPrompt.trim() } : {}) }),
      })
      const data = await res.json()
      if (res.ok && data.aiDraftReply) {
        setEditText(data.aiDraftReply)
        onUpdateDraft(data.aiDraftReply)
        setAiPrompt('')
        setShowAiPrompt(false)
        if (!isEditing) setIsEditing(true)
      } else {
        setAiError(data.error || data.details || 'Rewrite returned empty result')
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setAiLoading(null)
    }
  }

  const handleSaveDraft = () => { onUpdateDraft(editText); setIsEditing(false) }
  const handleCancelEdit = () => { setEditText(opp.draftReply); setIsEditing(false) }

  // Status-based card styling
  const borderLeftColor = isPileOn ? '#a855f7' : isDeleted ? '#ef4444' : isPublished ? '#10b981' : isUnverified ? '#f59e0b' : isNew ? '#3b82f6' : 'transparent'
  const borderColor = isPileOn ? 'rgba(168,85,247,0.3)' : isDeleted ? 'rgba(239,68,68,0.3)' : isPublished ? 'rgba(16,185,129,0.3)' : isUnverified ? 'rgba(245,158,11,0.3)' : ''
  const bgColor = isPileOn ? 'rgba(168,85,247,0.03)' : isDeleted ? 'rgba(239,68,68,0.04)' : isPublished ? 'rgba(16,185,129,0.04)' : isUnverified ? 'rgba(245,158,11,0.04)' : ''

  return (
    <div
      className="rounded-lg overflow-hidden bg-white border border-slate-200 shadow-lg dark:bg-slate-800 dark:border-slate-700 transition-all hover:opacity-100"
      style={{
        borderLeft: `4px solid ${borderLeftColor}`,
        borderLeftWidth: '4px',
        borderLeftColor: borderLeftColor,
        backgroundColor: bgColor || undefined,
      }}
    >
      {/* Main Row */}
      <div className="flex flex-col sm:flex-row items-start p-3 sm:p-5 gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 w-4 h-4 rounded flex-shrink-0 accent-orange-500"
        />

        {/* Left Content */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ff4500]/10 border border-[#ff4500]/15 flex-shrink-0 relative group cursor-help">
              <RedditIcon size={11} variant="color" />
              <span className="text-[11px] font-semibold text-[#FF4500] leading-none">Reddit</span>
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">Source: Reddit</div>
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 h-5">
              {opp.subreddit}
            </span>
            {opp.discoveredVia === 'comment_search' && (
              <span className="inline-flex items-center h-5 px-1.5 text-[11px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/25 rounded">Found via comment</span>
            )}
            {opp.discoveredVia === 'thread_search' && (
              <span className="inline-flex items-center h-5 px-1.5 text-[11px] font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded">Thread match</span>
            )}
            {isNew && (
              <span className="inline-flex items-center h-[22px] px-1.5 text-[11px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded">● New</span>
            )}
            {isPileOn && (
              <span className="inline-flex items-center h-[22px] px-1.5 text-[11px] font-bold bg-purple-500/15 text-purple-500 border border-purple-500/35 rounded">PILE-ON</span>
            )}
            {isPublished && (
              <>
                <span className="inline-flex items-center h-[22px] px-1.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/35 rounded">✓ Published</span>
                {opp.publishedAt && (
                  <span className="inline-flex items-center h-5 px-1.5 text-[10px] font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded">
                    Published {getTimeAgo(new Date(opp.publishedAt))}
                  </span>
                )}
                {opp.permalinkUrl && (
                  <a
                    href={opp.permalinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-blue-500 border border-blue-500/30 rounded hover:bg-blue-500/10 no-underline relative group"
                  >
                    <ExternalLinkIcon size={12} /> View Comment
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">View published comment on Reddit</div>
                  </a>
                )}
                <button
                  onClick={onPileOn}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-purple-500 border border-purple-500/30 rounded hover:bg-purple-500/10 relative group"
                >
                  <MessageSquareIcon size={12} /> Pile On
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">Add pile-on comment from secondary account</div>
                </button>
              </>
            )}
            {isUnverified && (
              <span className="inline-flex items-center h-[22px] px-1.5 text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/35 rounded">⚠ Unverified</span>
            )}
            {isDeleted && (
              <>
                <span className="inline-flex items-center h-[22px] px-1.5 text-[11px] font-bold bg-red-500/15 text-red-500 border border-red-500/35 rounded">✕ Deleted</span>
                <button
                  onClick={onAnalyzeDeletion}
                  disabled={analyzingDeletion}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-orange-500 border border-orange-500/30 rounded hover:bg-orange-500/10 disabled:opacity-50 relative group"
                >
                  {analyzingDeletion ? <Spinner className="w-3 h-3" /> : <AlertCircleIcon size={12} />}
                  {analyzingDeletion ? 'Analyzing...' : 'Analyze'}
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">AI analyzes why this was deleted to improve future comments</div>
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/opportunities/${opp.id}/restore`, { method: 'POST' })
                      if (res.ok) { window.location.reload() } else {
                        const data = await res.json()
                        alert(data.error || 'Failed to restore opportunity')
                      }
                    } catch { alert('Network error - could not restore opportunity') }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-500 border border-emerald-500/30 rounded hover:bg-emerald-500/10 relative group"
                >
                  <RefreshCwIcon size={12} /> Restore
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">Restore this opportunity to Published status</div>
                </button>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={onPreview}
            className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 cursor-pointer hover:text-orange-500 hover:underline"
          >
            {opp.title}
          </h3>

          {/* AI Relevance Note */}
          {opp.aiRelevanceNote && (() => {
            let parsed: any = null
            try { parsed = JSON.parse(opp.aiRelevanceNote) } catch { parsed = { note: opp.aiRelevanceNote } }
            const note = parsed?.note || opp.aiRelevanceNote
            return (
              <div className="flex items-start gap-2 mt-1.5 mb-1.5 px-3 py-2 rounded-lg bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 dark:border-indigo-500/20">
                <SparklesIcon size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed font-medium">{note}</p>
              </div>
            )
          })()}

          {/* Snippet */}
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-2 leading-relaxed">{opp.snippet}</p>

          {/* Stats row */}
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-slate-500 dark:text-slate-400">↑ {opp.upvotes}</span>
            <span className="text-[13px] text-slate-500 dark:text-slate-400">💬 {opp.comments}</span>
            <span className="text-[13px] text-slate-500 dark:text-slate-400">{opp.age}</span>
            {isPublished && opp.permalinkUrl && (
              <a
                href={opp.permalinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-emerald-500 no-underline hover:underline relative group"
              >
                <ExternalLinkIcon size={11} /> View comment
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">View published comment on Reddit</div>
              </a>
            )}
          </div>
        </div>

        {/* Right Section - Score + Client */}
        <div className="flex sm:flex-col items-center sm:items-end flex-wrap sm:flex-nowrap gap-3 sm:gap-2 flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
          {/* Score circle with tooltip */}
          <div className="relative group">
            <div
              className="w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-help"
              style={{ borderColor: scoreColor, backgroundColor: `${scoreColor}15` }}
            >
              <span className="text-[11px] font-bold" style={{ color: scoreColor }}>{opp.relevanceScore.toFixed(2)}</span>
            </div>
            {/* Tooltip */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[calc(100%+8px)] w-[280px] p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200">
              <p className="text-[12px] font-semibold mb-1 text-slate-900 dark:text-slate-100">AI Relevance Score: {opp.relevanceScore.toFixed(2)}</p>
              {(() => {
                let factors: { subredditRelevance?: number; topicMatch?: number; intent?: number; naturalFit?: number } | null = null
                let note = ''
                try {
                  const parsed = JSON.parse(opp.aiRelevanceNote || '{}')
                  factors = parsed.factors || null
                  note = parsed.note || opp.aiRelevanceNote || ''
                } catch { note = opp.aiRelevanceNote || '' }
                const fmtPct = (v?: number) => v != null ? `${Math.round(v * 100)}%` : '—'
                const fmtColor = (v?: number) => !v ? '#64748b' : v >= 0.7 ? '#10b981' : v >= 0.4 ? '#f59e0b' : '#ef4444'
                return (
                  <>
                    {factors ? (
                      <div className="flex flex-col gap-0.5 mb-1">
                        {[
                          { label: 'Subreddit Relevance', val: factors.subredditRelevance, weight: '30%' },
                          { label: 'Topic Match', val: factors.topicMatch, weight: '30%' },
                          { label: 'Intent Signal', val: factors.intent, weight: '25%' },
                          { label: 'Natural Fit', val: factors.naturalFit, weight: '15%' },
                        ].map((f) => (
                          <div key={f.label} className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{f.label} ({f.weight})</span>
                            <span className="text-[11px] font-semibold" style={{ color: fmtColor(f.val) }}>{fmtPct(f.val)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.25 mb-1">
                        <p className="text-[10px] text-emerald-500">● 0.85–1.0 Strong</p>
                        <p className="text-[10px] text-amber-500">● 0.70–0.84 Moderate</p>
                        <p className="text-[10px] text-red-500">● Below 0.70 Weak</p>
                      </div>
                    )}
                    {note && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed italic">{note}</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
          {/* Client badge */}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 h-5">
            {opp.client}
          </span>
        </div>
      </div>

      {/* ── AI Draft Reply (collapsible) ── */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-3 sm:px-5 py-3">
        <div className={`flex items-center justify-between cursor-pointer ${expanded ? 'mb-3' : ''}`} onClick={onToggleExpand}>
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">AI Draft Reply</span>
          {expanded ? <ChevronUpIcon size={14} className="text-slate-500" /> : <ChevronDownIcon size={14} className="text-slate-500" />}
        </div>

        {expanded && (
          <>
            {/* No draft — generate empty state */}
            {!hasDraft && !isEditing && (
              <div className="text-center py-6">
                <SparklesIcon size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">No AI draft yet</p>
                <p className="text-xs text-slate-400 mb-4 max-w-[280px] mx-auto">
                  Generate a contextual reply draft using AI based on this thread and the assigned client.
                </p>
                <div className="max-w-[400px] mx-auto mb-3">
                  <textarea
                    placeholder="Optional: Add instructions for the AI (e.g. focus on pricing, mention specific feature...)"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-orange-500 focus:outline-none mb-2"
                  />
                </div>
                <button
                  disabled={aiLoading !== null}
                  onClick={() => handleAiAction('generate')}
                  className="inline-flex items-center gap-1.5 px-6 py-1.5 bg-orange-500 text-white text-[13px] font-medium rounded-md hover:bg-orange-600 disabled:opacity-70"
                >
                  {aiLoading === 'generate' ? <Spinner className="w-3.5 h-3.5" /> : <SparklesIcon size={14} />}
                  {aiLoading === 'generate' ? 'Generating...' : 'Generate Draft'}
                </button>
                {aiError && <p className="text-[11px] text-red-500 mt-2">{aiError}</p>}
              </div>
            )}

            {/* Editing / rewriting state */}
            {isEditing && (
              <div className="mb-4">
                {/* AI Toolbar */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <div className="flex items-center gap-1 mr-1">
                    <SparklesIcon size={12} className="text-orange-500" />
                    <span className="text-[11px] font-semibold text-orange-500">AI:</span>
                  </div>
                  {[
                    { key: 'regenerate', label: 'Regenerate', icon: <RefreshCwIcon size={12} /> },
                    { key: 'shorter', label: 'Shorter', icon: <AlignLeftIcon size={12} /> },
                    { key: 'casual', label: 'Casual', icon: <MessageSquareIcon size={12} /> },
                    { key: 'formal', label: 'Formal', icon: <BriefcaseIcon size={12} /> },
                  ].map(action => (
                    <button
                      key={action.key}
                      disabled={aiLoading !== null}
                      onClick={() => handleAiAction(action.key)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/5 disabled:opacity-50"
                    >
                      {aiLoading === action.key ? <Spinner className="w-2.5 h-2.5" /> : action.icon}
                      {aiLoading === action.key ? 'Working...' : action.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAiPrompt(!showAiPrompt)}
                    className={`px-2 py-0.5 text-[11px] rounded ${
                      showAiPrompt
                        ? 'bg-orange-500 text-white'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-orange-500 hover:text-orange-500'
                    }`}
                  >
                    {showAiPrompt ? 'Hide prompt' : 'Custom prompt'}
                  </button>
                </div>

                {/* Collapsible AI prompt */}
                {showAiPrompt && (
                  <div className="mb-3 flex gap-2 items-end">
                    <textarea
                      placeholder="Tell the AI what to change... (e.g. 'Focus on the pricing advantage', 'Mention we have a free trial')"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      rows={2}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && aiPrompt.trim()) {
                          e.preventDefault()
                          handleAiAction('regenerate')
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      disabled={!aiPrompt.trim() || aiLoading !== null}
                      onClick={() => handleAiAction('regenerate')}
                      className="px-4 py-2 bg-orange-500 text-white text-[11px] font-medium rounded-md hover:bg-orange-600 disabled:opacity-50 flex-shrink-0"
                    >
                      {aiLoading ? 'Working...' : 'Apply'}
                    </button>
                  </div>
                )}

                {aiError && <p className="text-[11px] text-red-500 mb-2">{aiError}</p>}

                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm leading-relaxed focus:border-orange-500 focus:outline-none mb-3"
                />

                <div className="flex gap-2 items-center">
                  <button onClick={handleSaveDraft} className="px-3 py-1 bg-orange-500 text-white text-[13px] font-medium rounded-md hover:bg-orange-600">Save Draft</button>
                  <button onClick={handleCancelEdit} className="px-3 py-1 border border-slate-200 dark:border-slate-700 text-slate-500 text-[13px] rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                  <button
                    onClick={handleCopyDraft}
                    className={`p-1 rounded ${copiedDraft ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'} relative group`}
                  >
                    {copiedDraft ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">{copiedDraft ? 'Copied!' : 'Copy draft'}</div>
                  </button>
                  <span className="text-[11px] text-slate-400 ml-1">{editText.length} chars</span>
                </div>
              </div>
            )}

            {/* Read-only draft view */}
            {hasDraft && !isEditing && (
              <div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{opp.draftReply}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => { setEditText(opp.draftReply); setIsEditing(true) }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 border border-slate-200 dark:border-slate-700 text-slate-500 text-[13px] rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <EditIcon size={13} /> Edit Draft
                  </button>
                  <button
                    onClick={async () => {
                      const textToCopy = opp.draftReply || editText || ''
                      if (textToCopy) {
                        const success = await copyToClipboard(textToCopy)
                        if (success) { setCopiedDraft(true); setTimeout(() => setCopiedDraft(false), 2000) }
                      }
                    }}
                    className={`p-1 rounded ${copiedDraft ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'} relative group`}
                  >
                    {copiedDraft ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">{copiedDraft ? 'Copied! Paste in Reddit markdown mode' : 'Copy draft (use Reddit markdown mode for links)'}</div>
                  </button>
                  <span className="text-[11px] text-slate-500 italic">Use markdown mode in Reddit for links</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Action Bar (below AI draft) ── */}
      <div
        className="border-t border-slate-200 dark:border-slate-700 px-3 sm:px-5 py-2 flex flex-col gap-2"
        style={{
          backgroundColor: isPublished ? 'rgba(16,185,129,0.03)' : isUnverified ? 'rgba(245,158,11,0.03)' : undefined,
        }}
      >
        {/* Row 1: Account info + Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Account assignment or badge */}
          {!opp.account || opp.account === 'Unassigned' ? (
            <select
              value=""
              onChange={e => onAssignAccount(e.target.value)}
              className="min-w-[150px] h-7 text-xs px-2 rounded border-2 border-orange-500 bg-white dark:bg-slate-800 text-orange-500 font-semibold focus:outline-none"
            >
              <option value="" disabled>Assign Account...</option>
              {availableAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.username} ({account.status})
                </option>
              ))}
            </select>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/5 border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: opp.accountActive ? '#10b981' : '#64748b' }} />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{opp.account}</span>
              <span className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap" style={{ letterSpacing: showPassword ? 'normal' : '0.06em' }}>
                {showPassword ? opp.accountPassword : '••••••••'}
              </span>
              <button onClick={() => setShowPassword(v => !v)} className="p-0.5 text-slate-400 hover:text-slate-600 relative group">
                {showPassword ? <EyeOffIcon size={12} /> : <EyeIcon size={12} />}
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">{showPassword ? 'Hide password' : 'Reveal password'}</div>
              </button>
              <button onClick={handleCopy} className={`p-0.5 ${copied ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'} relative group`}>
                {copied ? <CheckIcon size={12} /> : <ClipboardIcon size={12} />}
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">{copied ? 'Copied!' : 'Copy password'}</div>
              </button>
            </div>
          )}

          {/* Posts today */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-500/5 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">Posts</span>
            <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: postBarColor }}>{postsToday}/{maxPostsPerDay}</span>
            <div className="w-8 h-0.5 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded" style={{ width: `${Math.min(postRatio * 100, 100)}%`, backgroundColor: postBarColor }} />
            </div>
          </div>

          {/* Citation ratio */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-500/5 border border-slate-200 dark:border-slate-700 relative group cursor-help">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">Cite</span>
            <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: citationBarColor }}>{citationPct}%</span>
            <div className="w-8 h-0.5 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
              <div className="absolute left-[25%] top-[-1px] bottom-[-1px] w-px bg-slate-400 dark:bg-slate-600 z-10" />
              <div className="h-full rounded" style={{ width: `${Math.min(citationPct, 100)}%`, backgroundColor: citationBarColor }} />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-20">Target: keep citation posts below 25% of total. Above 40% risks account standing.</div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          {isNew && (
            <button
              onClick={onMarkPublished}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-[13px] font-medium rounded-md hover:bg-emerald-600 disabled:bg-emerald-300 disabled:text-white"
            >
              {verifying ? <Spinner className="w-3 h-3" /> : <CheckIcon size={13} />}
              {verifying ? 'Verifying...' : 'Mark as Published'}
            </button>
          )}

          {isPublished && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircleIcon size={13} className="text-emerald-500" />
              <span className="text-[13px] font-semibold text-emerald-500">Published & Verified</span>
              {opp.permalinkUrl && (
                <a href={opp.permalinkUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-emerald-500 hover:text-emerald-600">
                  <ExternalLinkIcon size={12} />
                </a>
              )}
            </div>
          )}

          {!isPublished && (
            <>
              <button
                onClick={onReassign}
                className="inline-flex items-center gap-1 px-2 py-1 text-[13px] text-blue-500 border border-blue-500/30 rounded-md hover:bg-blue-500/10"
              >
                <UserIcon size={13} /> Reassign
              </button>
              <button
                onClick={onDismiss}
                className="inline-flex items-center gap-1 px-2 py-1 text-[13px] text-red-500 border border-red-500/30 rounded-md hover:bg-red-500/10"
              >
                <XIcon size={13} /> Dismiss
              </button>
            </>
          )}
        </div>

        {/* Row 2: Unverified — retry + manual permalink */}
        {isUnverified && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onMarkPublished}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-[13px] text-amber-500 border border-amber-500/40 rounded-md hover:bg-amber-500/5"
            >
              {verifying ? <Spinner className="w-3 h-3" /> : <RefreshCwIcon size={13} />}
              {verifying ? 'Checking...' : 'Retry Auto-Verify'}
            </button>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[160px] sm:min-w-[280px]">
                <LinkIcon size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Paste Reddit comment permalink…"
                  value={permalinkInput}
                  onChange={e => setPermalinkInput(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-[13px] border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                onClick={() => { onManualVerify(permalinkInput); setPermalinkInput('') }}
                disabled={!permalinkInput.trim() || verifying}
                className="px-3 py-1.5 bg-amber-500 text-white text-[13px] font-medium rounded-md hover:bg-amber-600 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 whitespace-nowrap"
              >
                Submit Permalink
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
