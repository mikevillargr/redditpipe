import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  IconButton,
  Button,
  Collapse,
  Tooltip,
  Snackbar,
  Alert,
  LinearProgress,
  CircularProgress,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  useTheme,
} from '@mui/material'
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
  AlertCircleIcon,
  SquareIcon,
  BrainIcon,
} from 'lucide-react'
import { RedditIcon } from '../components/RedditIcon'
type StatusFilter = 'all' | 'new' | 'published' | 'unverified'
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
const scoreFilterOptions: {
  value: ScoreFilter
  label: string
  color: string
}[] = [
  {
    value: 'any',
    label: 'Any score',
    color: '#64748b',
  },
  {
    value: '<0.5',
    label: '≤0.5',
    color: '#ef4444',
  },
  {
    value: '0.7',
    label: '0.7+',
    color: '#f59e0b',
  },
  {
    value: '0.85',
    label: '0.85+',
    color: '#10b981',
  },
  {
    value: '0.9',
    label: '0.9+ Strong',
    color: '#10b981',
  },
]
function CountBadge({
  count,
  active,
  color,
}: {
  count: number
  active: boolean
  color?: string
}) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        borderRadius: '9px',
        px: 0.5,
        bgcolor: active
          ? 'rgba(255,255,255,0.25)'
          : color
            ? `${color}20`
            : '#e2e8f0',
        color: active ? '#fff' : (color ?? '#64748b'),
        fontSize: '10px',
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {count}
    </Box>
  )
}
export function Dashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [clientList, setClientList] = useState<{ id: string; name: string }[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('new')
  const [clientFilter, setClientFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('any')
  const [aiScoreFilter, setAiScoreFilter] = useState<AiScoreFilter>('all')
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [dateStart, setDateStart] = useState(sevenDaysAgo)
  const [dateEnd, setDateEnd] = useState(today)
  const applyPreset = (preset: string) => {
    const end = new Date().toISOString().split('T')[0]
    let start = end
    if (preset === '7d')
      start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    else if (preset === '30d')
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    else if (preset === '1y')
      start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    setDateStart(start)
    setDateEnd(end)
  }
  const activePreset = (() => {
    const diffDays = Math.round(
      (new Date(dateEnd).getTime() - new Date(dateStart).getTime()) /
        (1000 * 60 * 60 * 24),
    )
    if (dateEnd === today && dateStart === today) return 'today'
    if (dateEnd === today && diffDays === 7) return '7d'
    if (dateEnd === today && diffDays === 30) return '30d'
    if (dateEnd === today && diffDays === 365) return '1y'
    return null
  })()
  const presets = [
    {
      key: 'today',
      label: 'Today',
    },
    {
      key: '7d',
      label: '7d',
    },
    {
      key: '30d',
      label: '30d',
    },
    {
      key: '1y',
      label: '1y',
    },
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
          const totalWeek = (acct?.organicPostsWeek ?? 0) + (acct?.citationPostsWeek ?? 0)
          const citPct = totalWeek > 0 ? Math.round(((acct?.citationPostsWeek ?? 0) / totalWeek) * 100) : 0
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

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDismissDialog, setShowDismissDialog] = useState(false)
  const [dismissReason, setDismissReason] = useState('')
  // Single dismiss
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [showSingleDismissDialog, setShowSingleDismissDialog] = useState(false)
  const [singleDismissReason, setSingleDismissReason] = useState('')
  // Mark published permalink dialog
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishPermalink, setPublishPermalink] = useState('')
  // Pile-on dialog
  const [pileOnOppId, setPileOnOppId] = useState<string | null>(null)
  const [pileOnOppTitle, setPileOnOppTitle] = useState('')
  const [showPileOnDialog, setShowPileOnDialog] = useState(false)
  // Thread preview
  const [previewOpp, setPreviewOpp] = useState<Opportunity | null>(null)
  // Lazy load / infinite scroll
  const PAGE_SIZE = 15
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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
        durationMs: number
        errors: number
      }
    } | null
  }
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusData | null>(null)
  const [triggeringSearch, setTriggeringSearch] = useState(false)

  const prevCreatedRef = useRef(0)
  const fetchPipelineStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/search/status')
      if (res.ok) {
        const data = await res.json()
        setPipelineStatus(data)
        // Refresh opportunities when new ones appear during the run
        if (data.running && data.opportunitiesCreated > prevCreatedRef.current) {
          prevCreatedRef.current = data.opportunitiesCreated
          fetchOpportunities()
        }
        // Refresh when pipeline finishes
        if (!data.running && prevCreatedRef.current > 0) {
          prevCreatedRef.current = 0
          fetchOpportunities()
        }
        // Also refresh if pipeline just completed (first load after completion)
        if (data.lastCompletedAt && !data.running) {
          fetchOpportunities()
        }
      }
    } catch { /* ignore */ }
  }, [fetchOpportunities])

  useEffect(() => {
    fetchPipelineStatus()
    // Poll every 3s while running, 30s otherwise
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
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'warning'
  }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const subBg = isDark ? '#0f172a' : '#f8fafc'
  const subBorder = isDark ? '#1e293b' : '#e2e8f0'
  const toggleBtnSx = {
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    color: 'text.secondary',
    fontSize: '13px',
    px: {
      xs: 1,
      sm: 1.5,
    },
    py: 0.5,
    textTransform: 'none',
    gap: 0.75,
    whiteSpace: 'nowrap',
    '&.Mui-selected': {
      bgcolor: '#f97316',
      color: '#fff',
      borderColor: '#f97316',
      '&:hover': {
        bgcolor: '#ea6c0a',
      },
    },
    '&:hover': {
      bgcolor: isDark ? '#1e293b' : '#f1f5f9',
    },
  }
  const selectSx = {
    fontSize: '13px',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? '#334155' : '#e2e8f0',
    },
  }
  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
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
  const handlePileOn = (id: string, title: string) => {
    setPileOnOppId(id)
    setPileOnOppTitle(title)
    setShowPileOnDialog(true)
  }
  const handlePileOnSuccess = () => {
    setSnackbar({ open: true, message: 'Pile-on comment published successfully ✓', severity: 'success' })
    fetchOpportunities()
  }
  const handleManualVerify = async (id: string, permalink: string) => {
    if (!permalink.trim()) return
    setVerifyingCards((prev) => new Set(prev).add(id))
    try {
      await fetch(`/api/opportunities/${id}/manual-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permalinkUrl: permalink.trim() }),
      })
      setVerifyingCards((prev) => { const n = new Set(prev); n.delete(id); return n })
      setSnackbar({ open: true, message: 'Permalink saved — marked as Published ✓', severity: 'success' })
      fetchOpportunities()
    } catch {
      setVerifyingCards((prev) => { const n = new Set(prev); n.delete(id); return n })
      setSnackbar({ open: true, message: 'Manual verification failed', severity: 'warning' })
    }
  }
  const handleDismiss = (id: string) => {
    setDismissingId(id)
    setSingleDismissReason('')
    setShowSingleDismissDialog(true)
  }
  const handleConfirmSingleDismiss = async () => {
    if (!dismissingId || !singleDismissReason.trim()) return
    try {
      const res = await fetch(`/api/opportunities/${dismissingId}`, {
        method: 'PUT',
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

  // Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  const selectAll = () => {
    if (selectedIds.size === filteredOpportunities.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOpportunities.map((o) => o.id)))
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
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'dismiss',
          dismissReason: dismissReason.trim(),
        }),
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

  const clientFilteredOpps =
    clientFilter === 'all'
      ? opportunities
      : opportunities.filter((o) => o.clientId === clientFilter)
  const filteredOpportunities = clientFilteredOpps.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (scoreFilter === '<0.5' && o.relevanceScore > 0.5) return false
    if (scoreFilter !== 'any' && scoreFilter !== '<0.5' && o.relevanceScore < parseFloat(scoreFilter))
      return false
    const hasRealAiScore = !!o.aiRelevanceNote && !o.aiRelevanceNote.includes('AI scoring unavailable')
    if (aiScoreFilter === 'has_ai' && !hasRealAiScore) return false
    if (aiScoreFilter === 'no_ai' && hasRealAiScore) return false
    return true
  })

  // Reset visible count and selection when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setSelectedIds(new Set())
  }, [clientFilter, statusFilter, scoreFilter, aiScoreFilter, dateStart, dateEnd])

  const visibleOpportunities = useMemo(
    () => filteredOpportunities.slice(0, visibleCount),
    [filteredOpportunities, visibleCount],
  )
  const hasMore = visibleCount < filteredOpportunities.length

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => prev + PAGE_SIZE)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore])

  const countByStatus = (s: StatusFilter) =>
    clientFilteredOpps.filter((o) => o.status === s).length
  const newCount = countByStatus('new')
  const publishedCount = countByStatus('published')
  const unverifiedCount = countByStatus('unverified')
  const allCount = clientFilteredOpps.length
  // clients are fetched from API
  return (
    <Box
      sx={{
        p: {
          xs: 1.5,
          sm: 2,
          md: 3,
        },
        maxWidth: 1200,
        mx: 'auto',
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          mb: {
            xs: 2,
            md: 3,
          },
          fontSize: '20px',
        }}
      >
        Opportunities
      </Typography>

      {/* Pipeline Status Banner */}
      <Paper
        sx={{
          mb: 2,
          p: 1.5,
          bgcolor: pipelineStatus?.running
            ? (isDark ? '#1e3a5f' : '#eff6ff')
            : (isDark ? '#0f172a' : '#f8fafc'),
          border: `1px solid ${pipelineStatus?.running ? '#3b82f6' : (isDark ? '#1e293b' : '#e2e8f0')}`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        {pipelineStatus?.running ? (
          <>
            <CircularProgress size={16} sx={{ color: '#3b82f6' }} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>
                Search running — {pipelineStatus.phase}
                {pipelineStatus.opportunitiesCreated > 0
                  ? ` (${pipelineStatus.opportunitiesCreated} found)`
                  : ''}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                {pipelineStatus.progress}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              onClick={handleStopSearch}
              disabled={stoppingSearch}
              startIcon={stoppingSearch ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SquareIcon size={14} />}
              sx={{ fontSize: '12px', textTransform: 'none', bgcolor: '#ef4444', color: '#fff', '&:hover': { bgcolor: '#dc2626' }, whiteSpace: 'nowrap' }}
            >
              {stoppingSearch ? 'Stopping...' : 'Stop Search'}
            </Button>
          </>
        ) : (
          <>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                {pipelineStatus?.lastCompletedAt
                  ? `Last search: ${getTimeAgo(new Date(pipelineStatus.lastCompletedAt))} (${new Date(pipelineStatus.lastCompletedAt).toLocaleString()}${pipelineStatus.lastResult
                      ? ` — ${pipelineStatus.lastResult.summary.opportunitiesCreated} new, ${pipelineStatus.lastResult.summary.threadsDiscovered} threads, ${pipelineStatus.lastResult.summary.aiCalls} AI calls, ${pipelineStatus.lastResult.summary.skipped?.heuristic || 0} pre-filtered, ${(pipelineStatus.lastResult.summary.durationMs / 1000).toFixed(0)}s`
                      : ''})`
                  : 'No search run yet'}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={handleTriggerSearch}
              disabled={triggeringSearch}
              startIcon={triggeringSearch ? <CircularProgress size={14} /> : <RefreshCwIcon size={14} />}
              sx={{ fontSize: '12px', textTransform: 'none', borderColor: isDark ? '#334155' : '#e2e8f0' }}
            >
              Run Search
            </Button>
          </>
        )}
      </Paper>

      {/* Filter Bar */}
      <Paper
        sx={{
          mb: 0,
          bgcolor: 'background.paper',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          overflow: 'hidden',
        }}
      >
        {/* Row 1: Client + Status */}
        <Box
          sx={{
            p: {
              xs: 1.5,
              sm: 2,
            },
            display: 'flex',
            alignItems: 'center',
            gap: {
              xs: 1,
              sm: 2,
            },
            flexWrap: 'wrap',
            borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
          }}
        >
          <Select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            size="small"
            sx={{
              minWidth: 140,
              ...selectSx,
            }}
          >
            <MenuItem value="all">All Clients</MenuItem>
            {clientList.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
          <Box
            sx={{
              overflowX: 'auto',
            }}
          >
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_, val) => val && setStatusFilter(val)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': toggleBtnSx,
              }}
            >
              <ToggleButton value="new">
                New{' '}
                <CountBadge
                  count={newCount}
                  active={statusFilter === 'new'}
                  color="#f97316"
                />
              </ToggleButton>
              <ToggleButton value="published">
                Published{' '}
                <CountBadge
                  count={publishedCount}
                  active={statusFilter === 'published'}
                  color="#10b981"
                />
              </ToggleButton>
              <ToggleButton value="unverified">
                Unverified{' '}
                <CountBadge
                  count={unverifiedCount}
                  active={statusFilter === 'unverified'}
                  color="#f59e0b"
                />
              </ToggleButton>
              <ToggleButton value="all">
                All{' '}
                <CountBadge count={allCount} active={statusFilter === 'all'} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Row 2: Score + AI filter */}
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <SlidersHorizontalIcon size={13} color="#64748b" />
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Score:
            </Typography>
            <ToggleButtonGroup
              value={scoreFilter}
              exclusive
              onChange={(_, val) => val && setScoreFilter(val)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  color: 'text.secondary',
                  fontSize: '11px',
                  px: 1,
                  py: 0.3,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(249,115,22,0.12)',
                    color: '#f97316',
                    borderColor: 'rgba(249,115,22,0.4)',
                  },
                  '&:hover': { bgcolor: isDark ? '#1e293b' : '#f1f5f9' },
                },
              }}
            >
              {scoreFilterOptions.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.value !== 'any' && (
                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: opt.color, mr: 0.5, display: 'inline-block' }} />
                  )}
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ width: '1px', height: 18, bgcolor: isDark ? '#334155' : '#e2e8f0' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <BrainIcon size={13} color="#64748b" />
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              AI:
            </Typography>
            <ToggleButtonGroup
              value={aiScoreFilter}
              exclusive
              onChange={(_, val) => val && setAiScoreFilter(val)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  color: 'text.secondary',
                  fontSize: '11px',
                  px: 1,
                  py: 0.3,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(99,102,241,0.12)',
                    color: '#6366f1',
                    borderColor: 'rgba(99,102,241,0.4)',
                  },
                  '&:hover': { bgcolor: isDark ? '#1e293b' : '#f1f5f9' },
                },
              }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="has_ai">AI Scored</ToggleButton>
              <ToggleButton value="no_ai">No AI</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Row 3: Date presets + pickers */}
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            borderTop: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
          }}
        >
          {presets.map((p) => (
            <Box
              key={p.key}
              onClick={() => applyPreset(p.key)}
              sx={{
                px: 1,
                py: 0.3,
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                border: `1px solid ${activePreset === p.key ? '#f97316' : isDark ? '#334155' : '#e2e8f0'}`,
                bgcolor: activePreset === p.key ? 'rgba(249,115,22,0.1)' : 'transparent',
                color: activePreset === p.key ? '#f97316' : 'text.secondary',
                transition: 'all 0.1s ease',
                userSelect: 'none',
                '&:hover': { borderColor: '#f97316', color: '#f97316', bgcolor: 'rgba(249,115,22,0.06)' },
              }}
            >
              {p.label}
            </Box>
          ))}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: '1px', height: 18, bgcolor: isDark ? '#334155' : '#e2e8f0' }} />
            <TextField
              type="date"
              size="small"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              inputProps={{ max: dateEnd }}
              sx={{
                width: 135,
                '& .MuiOutlinedInput-root': {
                  fontSize: '12px',
                  '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                  '&:hover fieldset': { borderColor: isDark ? '#475569' : '#cbd5e1' },
                  '&.Mui-focused fieldset': { borderColor: '#f97316' },
                },
                '& input': { color: 'text.primary', py: 0.5, px: 1 },
                '& input::-webkit-calendar-picker-indicator': { filter: isDark ? 'invert(0.5)' : 'none', cursor: 'pointer' },
              }}
            />
            <Typography sx={{ fontSize: '12px', color: 'text.disabled' }}>–</Typography>
            <TextField
              type="date"
              size="small"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              inputProps={{ min: dateStart, max: today }}
              sx={{
                width: 135,
                '& .MuiOutlinedInput-root': {
                  fontSize: '12px',
                  '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                  '&:hover fieldset': { borderColor: isDark ? '#475569' : '#cbd5e1' },
                  '&.Mui-focused fieldset': { borderColor: '#f97316' },
                },
                '& input': { color: 'text.primary', py: 0.5, px: 1 },
                '& input::-webkit-calendar-picker-indicator': { filter: isDark ? 'invert(0.5)' : 'none', cursor: 'pointer' },
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Stats Bar */}
      <Paper
        sx={{
          px: {
            xs: 1.5,
            sm: 2.5,
          },
          py: 1.25,
          mb: {
            xs: 2,
            md: 3,
          },
          bgcolor: subBg,
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderTop: `1px solid ${subBorder}`,
          borderRadius: '0 0 12px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: {
            xs: 2,
            sm: 3,
          },
          flexWrap: 'wrap',
        }}
      >
        {filteredOpportunities.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Checkbox
              checked={selectedIds.size > 0 && selectedIds.size === filteredOpportunities.length}
              indeterminate={selectedIds.size > 0 && selectedIds.size < filteredOpportunities.length}
              onChange={selectAll}
              size="small"
              sx={{ p: 0.25, color: '#94a3b8', '&.Mui-checked': { color: '#f97316' }, '&.MuiCheckbox-indeterminate': { color: '#f97316' } }}
            />
            <Typography
              sx={{ fontSize: '12px', color: 'text.secondary', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              onClick={selectAll}
            >
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all (${filteredOpportunities.length})`}
            </Typography>
            <Box sx={{ width: '1px', height: 14, bgcolor: subBorder, ml: 0.5 }} />
          </Box>
        )}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <TrendingUpIcon size={13} color="#f97316" />
          <Typography
            sx={{
              fontSize: '13px',
              color: 'text.secondary',
            }}
          >
            New today:{' '}
            <Typography
              component="span"
              sx={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#f97316',
              }}
            >
              {newCount}
            </Typography>
          </Typography>
        </Box>
        <Box
          sx={{
            width: '1px',
            height: 14,
            bgcolor: subBorder,
            display: {
              xs: 'none',
              sm: 'block',
            },
          }}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CheckCircleIcon size={13} color="#10b981" />
          <Typography
            sx={{
              fontSize: '13px',
              color: 'text.secondary',
            }}
          >
            Published:{' '}
            <Typography
              component="span"
              sx={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#10b981',
              }}
            >
              {publishedCount}
            </Typography>
          </Typography>
        </Box>
        {unverifiedCount > 0 && (
          <>
            <Box
              sx={{
                width: '1px',
                height: 14,
                bgcolor: subBorder,
                display: {
                  xs: 'none',
                  sm: 'block',
                },
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <AlertCircleIcon size={13} color="#f59e0b" />
              <Typography
                sx={{
                  fontSize: '13px',
                  color: 'text.secondary',
                }}
              >
                Unverified:{' '}
                <Typography
                  component="span"
                  sx={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#f59e0b',
                  }}
                >
                  {unverifiedCount}
                </Typography>
              </Typography>
            </Box>
          </>
        )}
        {scoreFilter !== 'any' && (
          <>
            <Box
              sx={{
                width: '1px',
                height: 14,
                bgcolor: subBorder,
                display: {
                  xs: 'none',
                  sm: 'block',
                },
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <SlidersHorizontalIcon size={12} color="#f97316" />
              <Typography
                sx={{
                  fontSize: '13px',
                  color: 'text.secondary',
                }}
              >
                Score filter:{' '}
                <Typography
                  component="span"
                  sx={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#f97316',
                  }}
                >
                  {scoreFilter}+
                </Typography>{' '}
                · showing{' '}
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    fontSize: '13px',
                  }}
                >
                  {filteredOpportunities.length}
                </Typography>{' '}
                results
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* Bulk action bar — fixed bottom bar (Gmail/Figma-style) */}
      {selectedIds.size > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 3,
            py: 1.5,
            bgcolor: isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            zIndex: 1300,
            backdropFilter: 'blur(16px)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(51,65,85,0.5)'
              : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(226,232,240,0.8)',
            maxWidth: { xs: 'calc(100vw - 32px)', md: 600 },
          }}
        >
          <Checkbox
            checked={selectedIds.size === filteredOpportunities.length}
            indeterminate={selectedIds.size > 0 && selectedIds.size < filteredOpportunities.length}
            onChange={selectAll}
            size="small"
            sx={{ color: '#f97316', '&.Mui-checked': { color: '#f97316' }, '&.MuiCheckbox-indeterminate': { color: '#f97316' } }}
          />
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap' }}>
            {selectedIds.size} selected
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            variant="contained"
            onClick={handleBulkPublish}
            sx={{ fontSize: '12px', bgcolor: '#22c55e', color: '#fff', '&:hover': { bgcolor: '#16a34a' }, whiteSpace: 'nowrap' }}
          >
            Mark Published
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => setShowDismissDialog(true)}
            sx={{ fontSize: '12px', bgcolor: '#ef4444', color: '#fff', '&:hover': { bgcolor: '#dc2626' }, whiteSpace: 'nowrap' }}
          >
            Dismiss Selected
          </Button>
        </Box>
      )}

      {/* Opportunity Cards */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {visibleOpportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            expanded={expandedCards.has(opp.id)}
            verifying={verifyingCards.has(opp.id)}
            selected={selectedIds.has(opp.id)}
            onToggleSelect={() => toggleSelect(opp.id)}
            onToggleExpand={() => toggleExpand(opp.id)}
            onMarkPublished={() => handleMarkPublished(opp.id)}
            onManualVerify={(permalink) =>
              handleManualVerify(opp.id, permalink)
            }
            onDismiss={() => handleDismiss(opp.id)}
            onUpdateDraft={(text) => handleUpdateDraft(opp.id, text)}
            onPileOn={() => handlePileOn(opp.id, opp.title)}
            onPreview={() => setPreviewOpp(opp)}
          />
        ))}

        {/* Infinite scroll sentinel */}
        <Box ref={sentinelRef} sx={{ height: 1 }} />
        {hasMore && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CircularProgress size={24} sx={{ color: '#f97316' }} />
          </Box>
        )}
        {filteredOpportunities.length > 0 && (
          <Typography sx={{ textAlign: 'center', fontSize: '12px', color: 'text.disabled', py: 1 }}>
            Showing {visibleOpportunities.length} of {filteredOpportunities.length} opportunities
          </Typography>
        )}
        {filteredOpportunities.length === 0 && opportunities.length === 0 && (
          <Paper
            sx={{
              textAlign: 'center',
              py: 6,
              px: 3,
              bgcolor: isDark ? '#0f172a' : '#f8fafc',
              border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
              borderRadius: '12px',
            }}
          >
            <Box sx={{ fontSize: 40, mb: 1.5 }}>
              {clientList.length === 0 ? '🏢' : '🔍'}
            </Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'text.primary', mb: 1 }}>
              {clientList.length === 0
                ? 'No clients configured yet'
                : 'No opportunities found'}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: 'text.secondary', maxWidth: 420, mx: 'auto', lineHeight: 1.6 }}>
              {clientList.length === 0
                ? 'Add a client first — go to the Clients page and enter a website URL. The AI will auto-detect keywords and set up everything for you.'
                : 'Run a search to discover Reddit threads that match your clients. Opportunities will appear here once the pipeline finds relevant threads. Reddit accounts are optional — opportunities will show as "Unassigned" until accounts are added.'}
            </Typography>
          </Paper>
        )}
        {filteredOpportunities.length === 0 && opportunities.length > 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Typography sx={{ fontSize: '14px' }}>
              No opportunities match the current filters.
            </Typography>
          </Box>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar((s) => ({
            ...s,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Thread Preview Modal */}
      <Dialog
        open={!!previewOpp}
        onClose={() => setPreviewOpp(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '12px',
            maxHeight: '80vh',
          },
        }}
      >
        {previewOpp && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  label={previewOpp.subreddit}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,69,0,0.08)', color: '#ff4500', border: '1px solid rgba(255,69,0,0.15)', fontWeight: 600, fontSize: '12px' }}
                />
                <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>{previewOpp.age}</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip
                  label={`Score: ${Math.round(previewOpp.relevanceScore * 100)}%`}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '12px', bgcolor: previewOpp.relevanceScore >= 0.7 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: previewOpp.relevanceScore >= 0.7 ? '#10b981' : '#f59e0b' }}
                />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '17px', color: 'text.primary', lineHeight: 1.4 }}>
                {previewOpp.title}
              </Typography>
              {previewOpp.aiRelevanceNote && (() => {
                let parsed: { note?: string; factors?: { subredditRelevance?: number; topicMatch?: number; intent?: number; naturalFit?: number } } | null = null
                try { parsed = JSON.parse(previewOpp.aiRelevanceNote) } catch { parsed = { note: previewOpp.aiRelevanceNote } }
                const note = parsed?.note || previewOpp.aiRelevanceNote
                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      mt: 1,
                      px: 1.5,
                      py: 1,
                      borderRadius: '8px',
                      bgcolor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                      border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
                    }}
                  >
                    <SparklesIcon size={14} style={{ color: '#6366f1', marginTop: 2, flexShrink: 0 }} />
                    <Typography
                      sx={{
                        fontSize: '13px',
                        color: isDark ? '#a5b4fc' : '#4f46e5',
                        lineHeight: 1.5,
                        fontWeight: 500,
                      }}
                    >
                      {note}
                    </Typography>
                  </Box>
                )
              })()}
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              {previewOpp.snippet && (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 0.5 }}>
                    Post Body
                  </Typography>
                  <Typography sx={{ fontSize: '14px', color: 'text.primary', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {previewOpp.snippet}
                  </Typography>
                </Box>
              )}
              {previewOpp.topComments && (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 0.5 }}>
                    Top Comments
                  </Typography>
                  <Box sx={{ bgcolor: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, borderRadius: '8px', p: 2 }}>
                    {previewOpp.topComments.split('\n\n').map((comment, i) => (
                      <Typography key={i} sx={{ fontSize: '13px', color: 'text.secondary', lineHeight: 1.6, mb: i < previewOpp.topComments.split('\n\n').length - 1 ? 1.5 : 0 }}>
                        {comment}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
              {previewOpp.draftReply && (
                <Box>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', mb: 0.5 }}>
                    AI Draft Reply
                  </Typography>
                  <Box sx={{ bgcolor: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: '8px', p: 2 }}>
                    <Typography sx={{ fontSize: '14px', color: 'text.primary', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {previewOpp.draftReply}
                    </Typography>
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              {previewOpp.threadUrl && (
                <Button
                  size="small"
                  onClick={() => window.open(previewOpp.threadUrl, '_blank')}
                  sx={{ color: '#f97316', fontSize: '13px', textTransform: 'none' }}
                >
                  Open on Reddit
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                onClick={() => setPreviewOpp(null)}
                sx={{ color: 'text.secondary', fontSize: '13px', textTransform: 'none' }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Bulk Dismiss Reason Dialog */}
      <Dialog
        open={showDismissDialog}
        onClose={() => { setShowDismissDialog(false); setDismissReason('') }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '12px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '17px' }}>
          Dismiss {selectedIds.size} Opportunit{selectedIds.size === 1 ? 'y' : 'ies'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 2 }}>
            A reason is required — it trains the model to show more relevant results.
          </Typography>
          <TextField
            label="Reason"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            size="small"
            placeholder="e.g. Off-topic, wrong industry, not seeking recommendations..."
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                '&.Mui-focused fieldset': { borderColor: '#f97316' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            size="small"
            onClick={() => { setShowDismissDialog(false); setDismissReason('') }}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!dismissReason.trim()}
            onClick={handleBulkDismiss}
            sx={{ bgcolor: '#ef4444', textTransform: 'none', '&:hover': { bgcolor: '#dc2626' } }}
          >
            Dismiss {selectedIds.size} Selected
          </Button>
        </DialogActions>
      </Dialog>

      {/* Single Dismiss Reason Dialog */}
      <Dialog
        open={showSingleDismissDialog}
        onClose={() => { setShowSingleDismissDialog(false); setDismissingId(null); setSingleDismissReason('') }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '12px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '17px' }}>
          Dismiss Opportunity
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 2 }}>
            A reason is required — it trains the model to show more relevant results.
          </Typography>
          <TextField
            label="Reason"
            value={singleDismissReason}
            onChange={(e) => setSingleDismissReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            size="small"
            placeholder="e.g. Off-topic, wrong industry, not seeking recommendations..."
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                '&.Mui-focused fieldset': { borderColor: '#f97316' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            size="small"
            onClick={() => { setShowSingleDismissDialog(false); setDismissingId(null); setSingleDismissReason('') }}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!singleDismissReason.trim()}
            onClick={handleConfirmSingleDismiss}
            sx={{ bgcolor: '#ef4444', textTransform: 'none', '&:hover': { bgcolor: '#dc2626' } }}
          >
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark as Published - Permalink Dialog */}
      <Dialog
        open={showPublishDialog}
        onClose={() => { setShowPublishDialog(false); setPublishingId(null); setPublishPermalink('') }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid #334155',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '17px' }}>
          Mark as Published
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 2 }}>
            Enter the comment permalink from Reddit to verify and mark this opportunity as published.
          </Typography>
          <TextField
            label="Comment Permalink"
            value={publishPermalink}
            onChange={(e) => setPublishPermalink(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="https://www.reddit.com/r/subreddit/comments/abc123/comment/xyz456/"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#334155' },
                '&.Mui-focused fieldset': { borderColor: '#10b981' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            size="small"
            onClick={() => { setShowPublishDialog(false); setPublishingId(null); setPublishPermalink('') }}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!publishPermalink.trim()}
            onClick={handleConfirmPublish}
            sx={{ bgcolor: '#10b981', textTransform: 'none', '&:hover': { bgcolor: '#059669' } }}
          >
            Verify & Publish
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pile-On Dialog */}
      {pileOnOppId && (
        <PileOnDialog
          open={showPileOnDialog}
          onClose={() => {
            setShowPileOnDialog(false)
            setPileOnOppId(null)
            setPileOnOppTitle('')
          }}
          opportunityId={pileOnOppId}
          opportunityTitle={pileOnOppTitle}
          onSuccess={handlePileOnSuccess}
        />
      )}
    </Box>
  )
}
// ── AI rewrite helpers ────────────────────────────────────────────────────────
// AI rewrite is now handled via API
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
}: OpportunityCardProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedDraft, setCopiedDraft] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(opp.draftReply)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [permalinkInput, setPermalinkInput] = useState('')
  const scoreColor =
    opp.relevanceScore >= 0.85
      ? '#10b981'
      : opp.relevanceScore >= 0.7
        ? '#f59e0b'
        : '#ef4444'
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const draftBg = isDark ? '#0f172a' : '#f8fafc'
  const draftBorder = isDark ? '#1e293b' : '#e2e8f0'
  const { postsToday, maxPostsPerDay, citationPct } = opp.accountStats
  const postRatio = maxPostsPerDay > 0 ? postsToday / maxPostsPerDay : 0
  const postBarColor =
    postRatio >= 1 ? '#ef4444' : postRatio >= 0.5 ? '#f59e0b' : '#10b981'
  const citationBarColor =
    citationPct <= 25 ? '#10b981' : citationPct <= 40 ? '#f59e0b' : '#ef4444'
  const isPublished = opp.status === 'published'
  const isUnverified = opp.status === 'unverified'
  const isNew = opp.status === 'new'
  const handleCopy = () => {
    navigator.clipboard.writeText(opp.accountPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const handleCopyDraft = () => {
    navigator.clipboard.writeText(editText)
    setCopiedDraft(true)
    setTimeout(() => setCopiedDraft(false), 2000)
  }
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiPrompt, setShowAiPrompt] = useState(false)
  const hasDraft = Boolean(editText?.trim() || opp.draftReply?.trim())
  const handleAiAction = async (action: string) => {
    setAiLoading(action)
    setAiError(null)
    try {
      const res = await fetch(`/api/opportunities/${opp.id}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(aiPrompt.trim() ? { userPrompt: aiPrompt.trim() } : {}),
        }),
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
        console.error('AI rewrite error:', data)
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error')
      console.error('AI rewrite failed:', err)
    } finally {
      setAiLoading(null)
    }
  }
  const handleSaveDraft = () => {
    onUpdateDraft(editText)
    setIsEditing(false)
  }
  const handleCancelEdit = () => {
    setEditText(opp.draftReply)
    setIsEditing(false)
  }
  const statusConfig = isPublished
    ? { borderLeft: '4px solid #10b981', border: '1px solid rgba(16,185,129,0.3)', bg: isDark ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.03)', opacity: 1 }
    : isUnverified
      ? { borderLeft: '4px solid #f59e0b', border: '1px solid rgba(245,158,11,0.3)', bg: isDark ? 'rgba(245,158,11,0.04)' : 'rgba(245,158,11,0.03)', opacity: 1 }
      : isNew
          ? { borderLeft: '4px solid #3b82f6', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, bg: 'background.paper', opacity: 1 }
          : { borderLeft: '4px solid transparent', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, bg: 'background.paper', opacity: 1 }
  return (
    <Card
      sx={{
        bgcolor: statusConfig.bg,
        border: statusConfig.border,
        borderLeft: statusConfig.borderLeft,
        opacity: statusConfig.opacity,
        transition: 'all 0.15s ease',
        '&:hover': { opacity: 1 },
      }}
    >
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
        {/* Main Row */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
            alignItems: 'flex-start',
            p: {
              xs: 1.5,
              sm: 2.5,
            },
            gap: 2,
          }}
        >
          {/* Checkbox */}
          <Checkbox
            checked={selected}
            onChange={onToggleSelect}
            size="small"
            sx={{
              mt: 0.5,
              flexShrink: 0,
              color: isDark ? '#475569' : '#cbd5e1',
              '&.Mui-checked': { color: '#f97316' },
            }}
          />
          {/* Left Content */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.75,
                flexWrap: 'wrap',
              }}
            >
              <Tooltip title="Source: Reddit" arrow placement="top">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: '4px',
                    bgcolor: 'rgba(255, 69, 0, 0.08)',
                    border: '1px solid rgba(255, 69, 0, 0.15)',
                    cursor: 'default',
                    flexShrink: 0,
                  }}
                >
                  <RedditIcon size={11} variant="color" />
                  <Typography
                    sx={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#FF4500',
                      lineHeight: 1,
                    }}
                  >
                    Reddit
                  </Typography>
                </Box>
              </Tooltip>
              <Chip
                label={opp.subreddit}
                size="small"
                sx={{
                  bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                  color: 'text.secondary',
                  fontSize: '12px',
                  fontWeight: 500,
                  height: 20,
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}
              />
              {opp.discoveredVia === 'comment_search' && (
                <Chip
                  label="Found via comment"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '11px',
                    fontWeight: 600,
                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                />
              )}
              {opp.discoveredVia === 'thread_search' && (
                <Chip
                  label="Thread match"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '11px',
                    fontWeight: 500,
                    bgcolor: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                    color: 'text.secondary',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  }}
                />
              )}
              {isNew && (
                <Chip
                  label="● New"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '11px',
                    fontWeight: 700,
                    bgcolor: 'rgba(59,130,246,0.12)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59,130,246,0.3)',
                  }}
                />
              )}
              {isPublished && (
                <>
                  <Chip
                    label="✓ Published"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '11px',
                      fontWeight: 700,
                      bgcolor: 'rgba(16,185,129,0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.35)',
                    }}
                  />
                  {opp.permalinkUrl && (
                    <Tooltip title="View published comment on Reddit" arrow>
                      <Chip
                        label="View Comment"
                        size="small"
                        icon={<ExternalLinkIcon size={12} />}
                        component="a"
                        href={opp.permalinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        clickable
                        sx={{
                          height: 22,
                          fontSize: '11px',
                          fontWeight: 600,
                          bgcolor: 'rgba(59,130,246,0.1)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.3)',
                          '&:hover': { bgcolor: 'rgba(59,130,246,0.15)' },
                          textDecoration: 'none',
                        }}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="Add pile-on comment from secondary account" arrow>
                    <Chip
                      label="Pile On"
                      size="small"
                      onClick={onPileOn}
                      clickable
                      sx={{
                        height: 22,
                        fontSize: '11px',
                        fontWeight: 600,
                        bgcolor: 'rgba(168,85,247,0.1)',
                        color: '#a855f7',
                        border: '1px solid rgba(168,85,247,0.3)',
                        '&:hover': { bgcolor: 'rgba(168,85,247,0.15)' },
                      }}
                    />
                  </Tooltip>
                </>
              )}
              {isUnverified && (
                <Chip
                  label="⚠ Unverified"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '11px',
                    fontWeight: 700,
                    bgcolor: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245,158,11,0.35)',
                  }}
                />
              )}
            </Box>
            <Typography
              onClick={onPreview}
              sx={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'text.primary',
                mb: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                cursor: 'pointer',
                '&:hover': {
                  color: '#f97316',
                  textDecoration: 'underline',
                },
              }}
            >
              {opp.title}
            </Typography>
            {opp.aiRelevanceNote && (() => {
              let parsed: { note?: string; factors?: { subredditRelevance?: number; topicMatch?: number; intent?: number; naturalFit?: number } } | null = null
              try { parsed = JSON.parse(opp.aiRelevanceNote) } catch { parsed = { note: opp.aiRelevanceNote } }
              const note = parsed?.note || opp.aiRelevanceNote
              return (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    mt: 0.75,
                    mb: 0.75,
                    px: 1.5,
                    py: 1,
                    borderRadius: '8px',
                    bgcolor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                    border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
                  }}
                >
                  <SparklesIcon size={14} style={{ color: '#6366f1', marginTop: 2, flexShrink: 0 }} />
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: isDark ? '#a5b4fc' : '#4f46e5',
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    {note}
                  </Typography>
                </Box>
              )
            })()}
            <Typography
              sx={{
                fontSize: '13px',
                color: 'text.secondary',
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.6,
              }}
            >
              {opp.snippet}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: '13px',
                  color: 'text.secondary',
                }}
              >
                ↑ {opp.upvotes}
              </Typography>
              <Typography
                sx={{
                  fontSize: '13px',
                  color: 'text.secondary',
                }}
              >
                💬 {opp.comments}
              </Typography>
              <Typography
                sx={{
                  fontSize: '13px',
                  color: 'text.secondary',
                }}
              >
                {opp.age}
              </Typography>
              {isPublished && opp.permalinkUrl && (
                <Tooltip title="View published comment on Reddit" arrow>
                  <Box
                    component="a"
                    href={opp.permalinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: '#10b981',
                      fontSize: '12px',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    <ExternalLinkIcon size={11} />
                    View comment
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Right Section */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: {
                xs: 'row',
                sm: 'column',
              },
              alignItems: {
                xs: 'center',
                sm: 'flex-end',
              },
              flexWrap: {
                xs: 'wrap',
                sm: 'nowrap',
              },
              gap: {
                xs: 1.5,
                sm: 1,
              },
              flexShrink: 0,
              width: {
                xs: '100%',
                sm: 'auto',
              },
              pt: {
                xs: 1,
                sm: 0,
              },
              borderTop: {
                xs: `1px solid ${draftBorder}`,
                sm: 'none',
              },
            }}
          >
            {/* Score */}
            <Tooltip
              title={(() => {
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
                  <Box sx={{ p: 0.5, maxWidth: 280 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                      AI Relevance Score: {opp.relevanceScore}
                    </Typography>
                    {factors ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                        {[
                          { label: 'Subreddit Relevance', val: factors.subredditRelevance, weight: '30%' },
                          { label: 'Topic Match', val: factors.topicMatch, weight: '30%' },
                          { label: 'Intent Signal', val: factors.intent, weight: '25%' },
                          { label: 'Natural Fit', val: factors.naturalFit, weight: '15%' },
                        ].map((f) => (
                          <Box key={f.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>{f.label} ({f.weight})</Typography>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: fmtColor(f.val) }}>{fmtPct(f.val)}</Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 1 }}>
                        <Typography sx={{ fontSize: '10px', color: '#10b981' }}>● 0.85–1.0 Strong</Typography>
                        <Typography sx={{ fontSize: '10px', color: '#f59e0b' }}>● 0.70–0.84 Moderate</Typography>
                        <Typography sx={{ fontSize: '10px', color: '#ef4444' }}>● Below 0.70 Weak</Typography>
                      </Box>
                    )}
                    {note && (
                      <Typography sx={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4, fontStyle: 'italic' }}>
                        {note}
                      </Typography>
                    )}
                  </Box>
                )
              })()}
              arrow
              placement="left"
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: `2px solid ${scoreColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${scoreColor}15`,
                  cursor: 'help',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: scoreColor,
                  }}
                >
                  {opp.relevanceScore}
                </Typography>
              </Box>
            </Tooltip>

            {/* Client */}
            <Chip
              label={opp.client}
              size="small"
              sx={{
                bgcolor: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                fontSize: '12px',
                fontWeight: 600,
                height: 20,
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            />

            {/* Account Stats moved to action bar */}
          </Box>
        </Box>

        {/* ── AI Draft Reply (collapsible) ── */}
        <Box
          sx={{
            borderTop: `1px solid ${draftBorder}`,
            px: {
              xs: 1.5,
              sm: 2.5,
            },
            py: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: expanded ? 1.5 : 0,
            }}
            onClick={onToggleExpand}
          >
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'text.secondary',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              AI Draft Reply
            </Typography>
            {expanded ? (
              <ChevronUpIcon size={14} color="#64748b" />
            ) : (
              <ChevronDownIcon size={14} color="#64748b" />
            )}
          </Box>

          <Collapse in={expanded}>
            {/* No draft — generate empty state */}
            {!hasDraft && !isEditing && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <SparklesIcon size={28} color={isDark ? '#475569' : '#cbd5e1'} style={{ marginBottom: 8 }} />
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                  No AI draft yet
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'text.disabled', mb: 2, maxWidth: 280, mx: 'auto' }}>
                  Generate a contextual reply draft using AI based on this thread and the assigned client.
                </Typography>

                {/* AI prompt input for generation */}
                <Box sx={{ maxWidth: 400, mx: 'auto', mb: 1.5 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Optional: Add instructions for the AI (e.g. focus on pricing, mention specific feature...)"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    multiline
                    maxRows={3}
                    sx={{
                      mb: 1,
                      '& .MuiOutlinedInput-root': {
                        fontSize: '12px',
                        bgcolor: isDark ? '#0f172a' : '#f8fafc',
                        '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                        '&:hover fieldset': { borderColor: '#f97316' },
                        '&.Mui-focused fieldset': { borderColor: '#f97316' },
                      },
                      '& .MuiOutlinedInput-input': { color: 'text.primary' },
                    }}
                  />
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  disabled={aiLoading !== null}
                  startIcon={aiLoading === 'generate' ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SparklesIcon size={14} />}
                  onClick={() => handleAiAction('generate')}
                  sx={{
                    bgcolor: '#f97316',
                    color: '#fff',
                    fontSize: '13px',
                    px: 3,
                    py: 0.75,
                    '&:hover': { bgcolor: '#ea6c0a' },
                    '&:disabled': { bgcolor: '#f97316', opacity: 0.7, color: '#fff' },
                  }}
                >
                  {aiLoading === 'generate' ? 'Generating...' : 'Generate Draft'}
                </Button>
                {aiError && (
                  <Typography sx={{ fontSize: '11px', color: '#ef4444', mt: 1 }}>
                    {aiError}
                  </Typography>
                )}
              </Box>
            )}

            {/* Editing / rewriting state */}
            {isEditing && (
              <Box sx={{ mb: 2 }}>
                {/* AI Toolbar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
                    <SparklesIcon size={12} color="#f97316" />
                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#f97316' }}>AI:</Typography>
                  </Box>
                  {[
                    { key: 'regenerate', label: 'Regenerate', icon: <RefreshCwIcon size={12} /> },
                    { key: 'shorter', label: 'Shorter', icon: <AlignLeftIcon size={12} /> },
                    { key: 'casual', label: 'Casual', icon: <MessageSquareIcon size={12} /> },
                    { key: 'formal', label: 'Formal', icon: <BriefcaseIcon size={12} /> },
                  ].map((action) => (
                    <Button
                      key={action.key}
                      size="small"
                      variant="outlined"
                      startIcon={aiLoading === action.key ? <CircularProgress size={10} sx={{ color: '#f97316' }} /> : action.icon}
                      disabled={aiLoading !== null}
                      onClick={() => handleAiAction(action.key)}
                      sx={{
                        fontSize: '11px',
                        py: 0.25,
                        px: 1,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        color: 'text.secondary',
                        '&:hover': { borderColor: '#f97316', color: '#f97316', bgcolor: 'rgba(249,115,22,0.06)' },
                        '&:disabled': { opacity: 0.5 },
                      }}
                    >
                      {aiLoading === action.key ? 'Working...' : action.label}
                    </Button>
                  ))}
                  <Button
                    size="small"
                    variant={showAiPrompt ? 'contained' : 'outlined'}
                    onClick={() => setShowAiPrompt(!showAiPrompt)}
                    sx={{
                      fontSize: '11px',
                      py: 0.25,
                      px: 1,
                      minWidth: 0,
                      ...(showAiPrompt
                        ? { bgcolor: '#f97316', color: '#fff', '&:hover': { bgcolor: '#ea6c0a' } }
                        : { borderColor: isDark ? '#334155' : '#e2e8f0', color: 'text.secondary', '&:hover': { borderColor: '#f97316', color: '#f97316' } }),
                    }}
                  >
                    {showAiPrompt ? 'Hide prompt' : 'Custom prompt'}
                  </Button>
                </Box>

                {/* Collapsible AI prompt */}
                <Collapse in={showAiPrompt}>
                  <Box sx={{ mb: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Tell the AI what to change... (e.g. 'Focus on the pricing advantage', 'Mention we have a free trial')"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      multiline
                      maxRows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && aiPrompt.trim()) {
                          e.preventDefault()
                          handleAiAction('regenerate')
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          fontSize: '12px',
                          bgcolor: isDark ? '#0f172a' : '#f8fafc',
                          '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                          '&:hover fieldset': { borderColor: '#f97316' },
                          '&.Mui-focused fieldset': { borderColor: '#f97316' },
                        },
                        '& .MuiOutlinedInput-input': { color: 'text.primary' },
                      }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!aiPrompt.trim() || aiLoading !== null}
                      onClick={() => handleAiAction('regenerate')}
                      sx={{
                        bgcolor: '#f97316',
                        color: '#fff',
                        fontSize: '11px',
                        px: 2,
                        flexShrink: 0,
                        minWidth: 0,
                        '&:hover': { bgcolor: '#ea6c0a' },
                        '&:disabled': { opacity: 0.5 },
                      }}
                    >
                      {aiLoading ? 'Working...' : 'Apply'}
                    </Button>
                  </Box>
                </Collapse>

                {aiError && (
                  <Typography sx={{ fontSize: '11px', color: '#ef4444', mb: 1 }}>
                    {aiError}
                  </Typography>
                )}

                <TextField
                  multiline
                  fullWidth
                  minRows={4}
                  maxRows={10}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  sx={{
                    mb: 1.5,
                    '& .MuiOutlinedInput-root': {
                      fontSize: '14px',
                      lineHeight: 1.7,
                      bgcolor: draftBg,
                      '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                      '&:hover fieldset': { borderColor: '#f97316' },
                      '&.Mui-focused fieldset': { borderColor: '#f97316' },
                    },
                    '& .MuiOutlinedInput-input': { color: 'text.primary' },
                  }}
                />

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveDraft}
                    sx={{ bgcolor: '#f97316', color: '#fff', fontSize: '13px', '&:hover': { bgcolor: '#ea6c0a' } }}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCancelEdit}
                    sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: '13px', '&:hover': { borderColor: '#475569', bgcolor: draftBg } }}
                  >
                    Cancel
                  </Button>
                  <Tooltip title={copiedDraft ? 'Copied!' : 'Copy draft'} arrow placement="top">
                    <IconButton
                      size="small"
                      onClick={handleCopyDraft}
                      sx={{ color: copiedDraft ? '#10b981' : 'text.disabled', '&:hover': { color: copiedDraft ? '#10b981' : 'text.secondary' } }}
                    >
                      {copiedDraft ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
                    </IconButton>
                  </Tooltip>
                  <Typography sx={{ fontSize: '11px', color: 'text.disabled', ml: 0.5 }}>
                    {editText.length} chars
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Read-only draft view */}
            {hasDraft && !isEditing && (
              <Box>
                <Box
                  sx={{
                    bgcolor: draftBg,
                    border: `1px solid ${draftBorder}`,
                    borderRadius: '8px',
                    p: 2,
                    mb: 1.5,
                  }}
                >
                  <Typography sx={{ fontSize: '14px', color: 'text.secondary', lineHeight: 1.7 }}>
                    {opp.draftReply}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon size={13} />}
                    onClick={() => {
                      setEditText(opp.draftReply)
                      setIsEditing(true)
                    }}
                    sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: '13px', '&:hover': { borderColor: '#475569', bgcolor: draftBg } }}
                  >
                    Edit Draft
                  </Button>
                  <Tooltip title={copiedDraft ? 'Copied!' : 'Copy draft'} arrow placement="top">
                    <IconButton
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(opp.draftReply)
                        setCopiedDraft(true)
                        setTimeout(() => setCopiedDraft(false), 2000)
                      }}
                      sx={{ color: copiedDraft ? '#10b981' : 'text.disabled', '&:hover': { color: copiedDraft ? '#10b981' : 'text.secondary' } }}
                    >
                      {copiedDraft ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </Collapse>
        </Box>

        {/* ── Action Bar (below AI draft) ── */}
        <Box
          sx={{
            borderTop: `1px solid ${draftBorder}`,
            px: { xs: 1.5, sm: 2.5 },
            py: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            bgcolor: isPublished
              ? 'rgba(16,185,129,0.03)'
              : isUnverified
                ? 'rgba(245,158,11,0.03)'
                : 'transparent',
          }}
        >
          {/* Row 1: Account info + Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Account badge with password */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                borderRadius: '6px',
                bgcolor: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.06)',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: opp.accountActive ? '#10b981' : '#64748b',
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {opp.account}
              </Typography>
              <Box
                sx={{
                  width: '1px',
                  height: 14,
                  bgcolor: isDark ? '#334155' : '#e2e8f0',
                  mx: 0.25,
                }}
              />
              <Typography
                sx={{
                  fontSize: '11px',
                  color: 'text.disabled',
                  fontFamily: 'monospace',
                  letterSpacing: showPassword ? 'normal' : '0.06em',
                  whiteSpace: 'nowrap',
                }}
              >
                {showPassword ? opp.accountPassword : '••••••••'}
              </Typography>
              <Tooltip title={showPassword ? 'Hide password' : 'Reveal password'} arrow placement="top">
                <IconButton
                  size="small"
                  onClick={() => setShowPassword((v) => !v)}
                  sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
                >
                  {showPassword ? <EyeOffIcon size={12} /> : <EyeIcon size={12} />}
                </IconButton>
              </Tooltip>
              <Tooltip title={copied ? 'Copied!' : 'Copy password'} arrow placement="top">
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  sx={{ p: 0.25, color: copied ? '#10b981' : 'text.disabled', '&:hover': { color: copied ? '#10b981' : 'text.secondary' } }}
                >
                  {copied ? <CheckIcon size={12} /> : <ClipboardIcon size={12} />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Posts today */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: '6px',
                bgcolor: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.06)',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              }}
            >
              <Typography sx={{ fontSize: '11px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                Posts
              </Typography>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: postBarColor, whiteSpace: 'nowrap' }}>
                {postsToday}/{maxPostsPerDay}
              </Typography>
              <Box sx={{ width: 32, height: 3, borderRadius: 2, bgcolor: isDark ? '#1e293b' : '#e2e8f0', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${Math.min(postRatio * 100, 100)}%`, bgcolor: postBarColor, borderRadius: 2 }} />
              </Box>
            </Box>

            {/* Citation ratio */}
            <Tooltip title="Target: keep citation posts below 25% of total. Above 40% risks account standing." arrow placement="top">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: '6px',
                  bgcolor: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.06)',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  cursor: 'help',
                }}
              >
                <Typography sx={{ fontSize: '11px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  Cite
                </Typography>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: citationBarColor, whiteSpace: 'nowrap' }}>
                  {citationPct}%
                </Typography>
                <Box sx={{ width: 32, height: 3, borderRadius: 2, bgcolor: isDark ? '#1e293b' : '#e2e8f0', overflow: 'hidden', position: 'relative' }}>
                  <Box sx={{ position: 'absolute', left: '25%', top: -1, bottom: -1, width: '1px', bgcolor: isDark ? '#475569' : '#94a3b8', zIndex: 1 }} />
                  <Box sx={{ height: '100%', width: `${Math.min(citationPct, 100)}%`, bgcolor: citationBarColor, borderRadius: 2 }} />
                </Box>
              </Box>
            </Tooltip>

            {/* Spacer */}
            <Box sx={{ flex: 1 }} />

            {/* Action buttons */}
            {isNew && (
              <Button
                variant="contained"
                size="small"
                startIcon={verifying ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <CheckIcon size={13} />}
                onClick={onMarkPublished}
                disabled={verifying}
                sx={{
                  bgcolor: '#10b981',
                  color: '#fff',
                  fontSize: '13px',
                  '&:hover': { bgcolor: '#059669' },
                  '&:disabled': { bgcolor: '#6ee7b7', color: '#fff' },
                }}
              >
                {verifying ? 'Verifying...' : 'Mark as Published'}
              </Button>
            )}

            {isPublished && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '6px',
                  bgcolor: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <CheckCircleIcon size={13} color="#10b981" />
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                  Published & Verified
                </Typography>
                {opp.permalinkUrl && (
                  <Box
                    component="a"
                    href={opp.permalinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', ml: 0.5, color: '#10b981', '&:hover': { color: '#059669' } }}
                  >
                    <ExternalLinkIcon size={12} />
                  </Box>
                )}
              </Box>
            )}

            {!isPublished && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<XIcon size={13} />}
                onClick={onDismiss}
                sx={{
                  borderColor: 'rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  fontSize: '13px',
                  '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' },
                }}
              >
                Dismiss
              </Button>
            )}
          </Box>

          {/* Row 2: Unverified — retry + manual permalink (full width when present) */}
          {isUnverified && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={verifying ? <CircularProgress size={11} sx={{ color: '#f59e0b' }} /> : <RefreshCwIcon size={13} />}
                onClick={onMarkPublished}
                disabled={verifying}
                sx={{
                  borderColor: 'rgba(245,158,11,0.4)',
                  color: '#f59e0b',
                  fontSize: '13px',
                  '&:hover': { borderColor: '#f59e0b', bgcolor: 'rgba(245,158,11,0.06)' },
                }}
              >
                {verifying ? 'Checking...' : 'Retry Auto-Verify'}
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
                <TextField
                  size="small"
                  placeholder="Paste Reddit comment permalink…"
                  value={permalinkInput}
                  onChange={(e) => setPermalinkInput(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon size={13} color="#64748b" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: 1,
                    minWidth: { xs: 160, sm: 280 },
                    '& .MuiOutlinedInput-root': {
                      fontSize: '13px',
                      '& fieldset': { borderColor: isDark ? '#334155' : '#e2e8f0' },
                      '&:hover fieldset': { borderColor: '#f59e0b' },
                      '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
                    },
                    '& input': { color: 'text.primary', py: 0.65 },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => { onManualVerify(permalinkInput); setPermalinkInput('') }}
                  disabled={!permalinkInput.trim() || verifying}
                  sx={{
                    bgcolor: '#f59e0b',
                    color: '#fff',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: '#d97706' },
                    '&:disabled': { bgcolor: isDark ? '#334155' : '#e2e8f0' },
                  }}
                >
                  Submit Permalink
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
