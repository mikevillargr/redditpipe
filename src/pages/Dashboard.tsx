import React, { useState } from 'react'
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
  useTheme,
} from '@mui/material'
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
} from 'lucide-react'
import { RedditIcon } from '../components/RedditIcon'
type StatusFilter = 'all' | 'new' | 'published' | 'unverified' | 'dismissed'
interface AccountStats {
  postsToday: number
  maxPostsPerDay: number
  citationPct: number
}
interface Opportunity {
  id: string
  subreddit: string
  title: string
  snippet: string
  upvotes: number
  comments: number
  age: string
  relevanceScore: number
  client: string
  account: string
  accountPassword: string
  accountActive: boolean
  accountStats: AccountStats
  draftReply: string
  status: StatusFilter
  platform: 'reddit'
  permalinkUrl?: string
}
const initialOpportunities: Opportunity[] = [
  {
    id: '1',
    subreddit: 'r/legaladvice',
    title:
      'Got into a car accident last week, other driver ran red light — what are my options?',
    snippet:
      'I was driving through an intersection when another car ran the red light and T-boned me. Police report filed, other driver admitted fault at scene but now insurance is disputing...',
    upvotes: 247,
    comments: 89,
    age: '2h ago',
    relevanceScore: 0.92,
    client: 'Harmon Law',
    account: 'u/legal_helper_99',
    accountPassword: 'L3gal#Helper99',
    accountActive: true,
    accountStats: {
      postsToday: 3,
      maxPostsPerDay: 3,
      citationPct: 50,
    },
    draftReply:
      "That's a tough situation, but you're actually in a strong position here. Since there's a police report and the driver admitted fault at the scene, your attorney can use that as leverage. I'd recommend consulting with a personal injury lawyer before accepting any settlement — insurance companies often lowball initial offers significantly. Harmon Law Group offers free consultations for exactly this type of case, and most PI attorneys work on contingency so there's no upfront cost.",
    status: 'unverified',
    platform: 'reddit',
  },
  {
    id: '2',
    subreddit: 'r/fitness',
    title:
      'Looking for a gym program that actually works for busy professionals — 3x/week max',
    snippet:
      "I work 60+ hour weeks and can only realistically get to the gym 3 times. I've tried a bunch of programs but always fall off. What actually works for people with limited time?",
    upvotes: 47,
    comments: 23,
    age: '4h ago',
    relevanceScore: 0.85,
    client: 'Gymijet',
    account: 'u/fitness_mike',
    accountPassword: 'p@ssw0rd_mike',
    accountActive: true,
    accountStats: {
      postsToday: 1,
      maxPostsPerDay: 3,
      citationPct: 25,
    },
    draftReply:
      "Honestly, 3x/week is plenty if you're doing it right. I'd look into a push/pull/legs split or a full-body routine — both work great for limited schedules. The key is progressive overload and consistency over intensity. tbh I've seen better results from people training 3x with focus than 5x going through the motions. If your gym uses Gymijet for scheduling, you can also set recurring time blocks so it's locked in like a meeting. What's your current fitness level and main goal?",
    status: 'new',
    platform: 'reddit',
  },
  {
    id: '3',
    subreddit: 'r/restaurants',
    title:
      'Our reservation system is a nightmare — any recommendations for small restaurant owners?',
    snippet:
      "Running a 40-seat Italian place and our current system (paper + phone) is causing double bookings and we're losing customers. What do other small restaurant owners use?",
    upvotes: 31,
    comments: 44,
    age: '6h ago',
    relevanceScore: 0.78,
    client: 'TableFlow',
    account: 'u/resto_advisor',
    accountPassword: 'R3st0!Adv1sor',
    accountActive: false,
    accountStats: {
      postsToday: 1,
      maxPostsPerDay: 2,
      citationPct: 14,
    },
    draftReply:
      "fwiw I've helped a few small restaurants navigate this exact problem. For a 40-seat place, you don't need anything overly complex. OpenTable and Resy are popular but pricey — there are leaner options that work just as well for independent spots. TableFlow is one worth looking at; it's built specifically for independent restaurants and has a free trial. The main thing is getting something with a waitlist feature and two-way SMS confirmations, which cuts no-shows dramatically.",
    status: 'published',
    platform: 'reddit',
    permalinkUrl:
      'https://reddit.com/r/restaurants/comments/abc123/our_reservation_system/xyz456',
  },
  {
    id: '4',
    subreddit: 'r/startups',
    title:
      "We're burning $40k/month on AWS — is this normal for a 50k DAU SaaS?",
    snippet:
      "Our infrastructure costs have ballooned and our CTO says it's normal but it feels high. We're running on EC2 with RDS, no real optimization done yet. Anyone been through this?",
    upvotes: 312,
    comments: 156,
    age: '1h ago',
    relevanceScore: 0.88,
    client: 'CloudOptimize',
    account: 'u/tech_insights_dev',
    accountPassword: 'T3ch$Dev2024',
    accountActive: true,
    accountStats: {
      postsToday: 2,
      maxPostsPerDay: 4,
      citationPct: 25,
    },
    draftReply:
      "That does sound high for 50k DAU, but it depends heavily on your architecture. A few quick wins: Reserved Instances vs on-demand can cut EC2 costs 30-40% immediately. RDS is often over-provisioned — check if you're actually using the instance size you're paying for. Also look at data transfer costs, which are often the hidden killer. CloudOptimize does free infrastructure audits if you want an outside set of eyes — have you done a Cost Explorer breakdown to see where the spend is concentrated?",
    status: 'new',
    platform: 'reddit',
  },
  {
    id: '5',
    subreddit: 'r/ecommerce',
    title:
      'Shopify vs WooCommerce for a 500 SKU store — making the switch, need advice',
    snippet:
      'Currently on WooCommerce, constantly dealing with plugin conflicts and slow load times. Considering Shopify but worried about the migration and ongoing costs at scale.',
    upvotes: 89,
    comments: 67,
    age: '3h ago',
    relevanceScore: 0.71,
    client: 'MigrateCart',
    account: 'u/ecom_strategist',
    accountPassword: 'Ec0m#Strat99',
    accountActive: true,
    accountStats: {
      postsToday: 0,
      maxPostsPerDay: 3,
      citationPct: 60,
    },
    draftReply:
      "Been through this migration a few times. For 500 SKUs, Shopify is generally the right call if your WooCommerce pain is plugin-related — you're trading flexibility for reliability. The cost difference at scale is real but so is the dev time you'll save. MigrateCart specializes in exactly this — WooCommerce to Shopify — and handles URL structure, metafield mapping, and app equivalents so you don't lose SEO equity. What's your current monthly WooCommerce hosting + maintenance cost?",
    status: 'new',
    platform: 'reddit',
  },
]
type ScoreFilter = 'any' | '0.7' | '0.85' | '0.9'
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
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>(initialOpportunities)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('any')
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
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
  const [verifyingCards, setVerifyingCards] = useState<Set<string>>(new Set())
  const [expandedCards, setExpandedCards] = useState<Set<string>>(
    new Set(['1', '2', '3']),
  )
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
    setVerifyingCards((prev) => new Set(prev).add(id))
    setTimeout(() => {
      const verified = Math.random() < 0.7
      const newStatus: StatusFilter = verified ? 'published' : 'unverified'
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status: newStatus,
              }
            : o,
        ),
      )
      setVerifyingCards((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
      setSnackbar({
        open: true,
        message: verified
          ? 'Published ✓ Comment verified on Reddit'
          : 'Unverified — comment not found on Reddit',
        severity: verified ? 'success' : 'warning',
      })
    }, 1500)
  }
  const handleManualVerify = (id: string, permalink: string) => {
    if (!permalink.trim()) return
    setVerifyingCards((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status: 'published',
                permalinkUrl: permalink.trim(),
              }
            : o,
        ),
      )
      setVerifyingCards((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
      setSnackbar({
        open: true,
        message: 'Permalink saved — marked as Published ✓',
        severity: 'success',
      })
    }, 800)
  }
  const handleDismiss = (id: string) => {
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status: 'dismissed',
            }
          : o,
      ),
    )
    setSnackbar({
      open: true,
      message: 'Opportunity dismissed',
      severity: 'info',
    })
  }
  const handleUpdateDraft = (id: string, newDraft: string) => {
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              draftReply: newDraft,
            }
          : o,
      ),
    )
  }
  const clientFilteredOpps =
    clientFilter === 'all'
      ? opportunities
      : opportunities.filter((o) => o.client === clientFilter)
  const filteredOpportunities = clientFilteredOpps.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (scoreFilter !== 'any' && o.relevanceScore < parseFloat(scoreFilter))
      return false
    return true
  })
  const countByStatus = (s: StatusFilter) =>
    clientFilteredOpps.filter((o) => o.status === s).length
  const newCount = countByStatus('new')
  const publishedCount = countByStatus('published')
  const unverifiedCount = countByStatus('unverified')
  const dismissedCount = countByStatus('dismissed')
  const allCount = clientFilteredOpps.length
  const clients = Array.from(new Set(initialOpportunities.map((o) => o.client)))
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
            {clients.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
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
              <ToggleButton value="all">
                All{' '}
                <CountBadge count={allCount} active={statusFilter === 'all'} />
              </ToggleButton>
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
              <ToggleButton value="dismissed">
                Dismissed{' '}
                <CountBadge
                  count={dismissedCount}
                  active={statusFilter === 'dismissed'}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Row 2: Score + Date */}
        <Box
          sx={{
            px: {
              xs: 1.5,
              sm: 2,
            },
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <SlidersHorizontalIcon size={13} color="#64748b" />
            <Typography
              sx={{
                fontSize: '13px',
                color: 'text.secondary',
                whiteSpace: 'nowrap',
              }}
            >
              Min score:
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
                  fontSize: '12px',
                  px: 1.25,
                  py: 0.4,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(249,115,22,0.12)',
                    color: '#f97316',
                    borderColor: 'rgba(249,115,22,0.4)',
                  },
                  '&:hover': {
                    bgcolor: isDark ? '#1e293b' : '#f1f5f9',
                  },
                },
              }}
            >
              {scoreFilterOptions.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.value !== 'any' && (
                    <Box
                      component="span"
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: opt.color,
                        mr: 0.5,
                        display: 'inline-block',
                      }}
                    />
                  )}
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              flexWrap: 'wrap',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
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
                    bgcolor:
                      activePreset === p.key
                        ? 'rgba(249,115,22,0.1)'
                        : 'transparent',
                    color:
                      activePreset === p.key ? '#f97316' : 'text.secondary',
                    transition: 'all 0.1s ease',
                    userSelect: 'none',
                    '&:hover': {
                      borderColor: '#f97316',
                      color: '#f97316',
                      bgcolor: 'rgba(249,115,22,0.06)',
                    },
                  }}
                >
                  {p.label}
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: {
                  xs: 'none',
                  sm: 'flex',
                },
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  width: '1px',
                  height: 18,
                  bgcolor: isDark ? '#334155' : '#e2e8f0',
                }}
              />
              <TextField
                type="date"
                size="small"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                inputProps={{
                  max: dateEnd,
                }}
                sx={{
                  width: 140,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '13px',
                    '& fieldset': {
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: isDark ? '#475569' : '#cbd5e1',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#f97316',
                    },
                  },
                  '& input': {
                    color: 'text.primary',
                    py: 0.65,
                    px: 1.25,
                  },
                  '& input::-webkit-calendar-picker-indicator': {
                    filter: isDark ? 'invert(0.5)' : 'none',
                    cursor: 'pointer',
                  },
                }}
              />
              <Typography
                sx={{
                  fontSize: '13px',
                  color: 'text.disabled',
                }}
              >
                –
              </Typography>
              <TextField
                type="date"
                size="small"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                inputProps={{
                  min: dateStart,
                  max: today,
                }}
                sx={{
                  width: 140,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '13px',
                    '& fieldset': {
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: isDark ? '#475569' : '#cbd5e1',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#f97316',
                    },
                  },
                  '& input': {
                    color: 'text.primary',
                    py: 0.65,
                    px: 1.25,
                  },
                  '& input::-webkit-calendar-picker-indicator': {
                    filter: isDark ? 'invert(0.5)' : 'none',
                    cursor: 'pointer',
                  },
                }}
              />
            </Box>
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

      {/* Opportunity Cards */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: {
            xs: 1.5,
            sm: 2,
          },
        }}
      >
        {filteredOpportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            expanded={expandedCards.has(opp.id)}
            verifying={verifyingCards.has(opp.id)}
            onToggleExpand={() => toggleExpand(opp.id)}
            onMarkPublished={() => handleMarkPublished(opp.id)}
            onManualVerify={(permalink) =>
              handleManualVerify(opp.id, permalink)
            }
            onDismiss={() => handleDismiss(opp.id)}
            onUpdateDraft={(text) => handleUpdateDraft(opp.id, text)}
          />
        ))}
        {filteredOpportunities.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Typography
              sx={{
                fontSize: '14px',
              }}
            >
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
    </Box>
  )
}
// ── AI rewrite helpers ────────────────────────────────────────────────────────
function simulateAiRewrite(original: string, action: string): string {
  if (action === 'shorter') {
    const sentences = original.split('. ')
    return (
      sentences
        .slice(0, Math.max(2, Math.ceil(sentences.length * 0.6)))
        .join('. ') + (original.endsWith('.') ? '.' : '')
    )
  }
  if (action === 'casual') {
    return (
      original
        .replace(/I would recommend/g, "I'd recommend")
        .replace(/you are/g, "you're")
        .replace(/it is/g, "it's")
        .replace(/That does sound/g, 'Yeah, that sounds') + ' Hope that helps!'
    )
  }
  if (action === 'formal') {
    return (
      original
        .replace(/tbh/g, 'To be honest,')
        .replace(/fwiw/g, 'For what it is worth,')
        .replace(/Yeah,/g, '')
        .replace(/Hope that helps!/g, '')
        .trim() +
      ' Please do not hesitate to reach out if you have further questions.'
    )
  }
  return (
    "Based on the context you've shared, " +
    original.charAt(0).toLowerCase() +
    original.slice(1)
  )
}
// ── Opportunity Card ──────────────────────────────────────────────────────────
interface OpportunityCardProps {
  opportunity: Opportunity
  expanded: boolean
  verifying: boolean
  onToggleExpand: () => void
  onMarkPublished: () => void
  onManualVerify: (permalink: string) => void
  onDismiss: () => void
  onUpdateDraft: (text: string) => void
}
function OpportunityCard({
  opportunity: opp,
  expanded,
  verifying,
  onToggleExpand,
  onMarkPublished,
  onManualVerify,
  onDismiss,
  onUpdateDraft,
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
  const isDismissed = opp.status === 'dismissed'
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
  const handleAiAction = (action: string) => {
    setAiLoading(action)
    setTimeout(() => {
      setEditText(simulateAiRewrite(editText, action))
      setAiLoading(null)
    }, 1200)
  }
  const handleSaveDraft = () => {
    onUpdateDraft(editText)
    setIsEditing(false)
  }
  const handleCancelEdit = () => {
    setEditText(opp.draftReply)
    setIsEditing(false)
  }
  const aiActions = [
    {
      key: 'regenerate',
      label: 'Regenerate',
      icon: <RefreshCwIcon size={12} />,
    },
    {
      key: 'shorter',
      label: 'Make shorter',
      icon: <AlignLeftIcon size={12} />,
    },
    {
      key: 'casual',
      label: 'More casual',
      icon: <MessageSquareIcon size={12} />,
    },
    {
      key: 'formal',
      label: 'More formal',
      icon: <BriefcaseIcon size={12} />,
    },
  ]
  const cardBorder = isPublished
    ? '1px solid rgba(16,185,129,0.35)'
    : isUnverified
      ? '1px solid rgba(245,158,11,0.35)'
      : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: cardBorder,
        transition: 'all 0.15s ease',
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
              {isPublished && (
                <Chip
                  label="✓ Published"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '11px',
                    fontWeight: 600,
                    bgcolor: 'rgba(16,185,129,0.1)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)',
                  }}
                />
              )}
              {isUnverified && (
                <Chip
                  label="⚠ Unverified"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '11px',
                    fontWeight: 600,
                    bgcolor: 'rgba(245,158,11,0.1)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                />
              )}
              {isDismissed && (
                <Chip
                  label="Dismissed"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '11px',
                    fontWeight: 600,
                    bgcolor: isDark ? '#1e293b' : '#f1f5f9',
                    color: 'text.disabled',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  }}
                />
              )}
            </Box>
            <Typography
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
                },
              }}
            >
              {opp.title}
            </Typography>
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
              title={
                <Box
                  sx={{
                    p: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  >
                    AI Relevance Score
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      lineHeight: 1.5,
                    }}
                  >
                    How closely this thread matches the client's keywords,
                    scored 0–1.
                  </Typography>
                  <Box
                    sx={{
                      mt: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.25,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '10px',
                        color: '#10b981',
                      }}
                    >
                      ● 0.85–1.0 Strong
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '10px',
                        color: '#f59e0b',
                      }}
                    >
                      ● 0.70–0.84 Moderate
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '10px',
                        color: '#ef4444',
                      }}
                    >
                      ● Below 0.70 Weak
                    </Typography>
                  </Box>
                </Box>
              }
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

            {/* Account + Password */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: {
                  xs: 'flex-start',
                  sm: 'flex-end',
                },
                gap: 0.3,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: opp.accountActive ? '#10b981' : '#64748b',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '12px',
                    color: 'text.secondary',
                  }}
                >
                  {opp.account}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: 'text.disabled',
                    fontFamily: 'monospace',
                    letterSpacing: showPassword ? 'normal' : '0.06em',
                  }}
                >
                  {showPassword ? opp.accountPassword : '••••••••••'}
                </Typography>
                <Tooltip
                  title={showPassword ? 'Hide' : 'Reveal'}
                  arrow
                  placement="top"
                >
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword((v) => !v)}
                    sx={{
                      p: 0.25,
                      color: 'text.disabled',
                      '&:hover': {
                        color: 'text.secondary',
                      },
                    }}
                  >
                    {showPassword ? (
                      <EyeOffIcon size={11} />
                    ) : (
                      <EyeIcon size={11} />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title={copied ? 'Copied!' : 'Copy password'}
                  arrow
                  placement="top"
                >
                  <IconButton
                    size="small"
                    onClick={handleCopy}
                    sx={{
                      p: 0.25,
                      color: copied ? '#10b981' : 'text.disabled',
                      '&:hover': {
                        color: copied ? '#10b981' : 'text.secondary',
                      },
                    }}
                  >
                    {copied ? (
                      <CheckIcon size={11} />
                    ) : (
                      <ClipboardIcon size={11} />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Account Stats */}
            <Box
              sx={{
                width: {
                  xs: '100%',
                  sm: 132,
                },
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.3,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: 'text.secondary',
                    }}
                  >
                    Posts today
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: postBarColor,
                    }}
                  >
                    {postsToday}/{maxPostsPerDay}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(postRatio * 100, 100)}
                  sx={{
                    height: 3,
                    borderRadius: 2,
                    bgcolor: isDark ? '#1e293b' : '#e2e8f0',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: postBarColor,
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.3,
                  }}
                >
                  <Tooltip
                    title="Target: keep citation posts below 25% of total. Above 40% risks account standing."
                    arrow
                    placement="left"
                  >
                    <Typography
                      sx={{
                        fontSize: '11px',
                        color: 'text.secondary',
                        cursor: 'help',
                        borderBottom: '1px dashed',
                        borderColor: 'text.disabled',
                      }}
                    >
                      Citation ratio
                    </Typography>
                  </Tooltip>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: citationBarColor,
                    }}
                  >
                    {citationPct}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    position: 'relative',
                    height: 3,
                    borderRadius: 2,
                    bgcolor: isDark ? '#1e293b' : '#e2e8f0',
                    overflow: 'visible',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '25%',
                      top: -1,
                      bottom: -1,
                      width: '1.5px',
                      bgcolor: isDark ? '#475569' : '#94a3b8',
                      zIndex: 1,
                      borderRadius: 1,
                    }}
                  />
                  <Box
                    sx={{
                      height: '100%',
                      width: `${Math.min(citationPct, 100)}%`,
                      bgcolor: citationBarColor,
                      borderRadius: 2,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Persistent Action Bar (always visible) ── */}
        <Box
          sx={{
            borderTop: `1px solid ${draftBorder}`,
            px: {
              xs: 1.5,
              sm: 2.5,
            },
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            bgcolor: isPublished
              ? 'rgba(16,185,129,0.03)'
              : isUnverified
                ? 'rgba(245,158,11,0.03)'
                : 'transparent',
          }}
        >
          {/* New: Mark as Published */}
          {isNew && (
            <Button
              variant="contained"
              size="small"
              startIcon={
                verifying ? (
                  <CircularProgress
                    size={12}
                    sx={{
                      color: '#fff',
                    }}
                  />
                ) : (
                  <CheckIcon size={13} />
                )
              }
              onClick={onMarkPublished}
              disabled={verifying}
              sx={{
                bgcolor: '#10b981',
                color: '#fff',
                fontSize: '13px',
                '&:hover': {
                  bgcolor: '#059669',
                },
                '&:disabled': {
                  bgcolor: '#6ee7b7',
                  color: '#fff',
                },
              }}
            >
              {verifying ? 'Verifying...' : 'Mark as Published'}
            </Button>
          )}

          {/* Published: verified badge + view link */}
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
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#10b981',
                }}
              >
                Published & Verified
              </Typography>
              {opp.permalinkUrl && (
                <Box
                  component="a"
                  href={opp.permalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    ml: 0.5,
                    color: '#10b981',
                    '&:hover': {
                      color: '#059669',
                    },
                  }}
                >
                  <ExternalLinkIcon size={12} />
                </Box>
              )}
            </Box>
          )}

          {/* Unverified: retry + manual permalink input */}
          {isUnverified && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                flex: 1,
              }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  verifying ? (
                    <CircularProgress
                      size={11}
                      sx={{
                        color: '#f59e0b',
                      }}
                    />
                  ) : (
                    <RefreshCwIcon size={13} />
                  )
                }
                onClick={onMarkPublished}
                disabled={verifying}
                sx={{
                  borderColor: 'rgba(245,158,11,0.4)',
                  color: '#f59e0b',
                  fontSize: '13px',
                  '&:hover': {
                    borderColor: '#f59e0b',
                    bgcolor: 'rgba(245,158,11,0.06)',
                  },
                }}
              >
                {verifying ? 'Checking...' : 'Retry Auto-Verify'}
              </Button>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  flex: 1,
                  minWidth: 0,
                }}
              >
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
                    minWidth: {
                      xs: 160,
                      sm: 280,
                    },
                    '& .MuiOutlinedInput-root': {
                      fontSize: '13px',
                      '& fieldset': {
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#f59e0b',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#f59e0b',
                      },
                    },
                    '& input': {
                      color: 'text.primary',
                      py: 0.65,
                    },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    onManualVerify(permalinkInput)
                    setPermalinkInput('')
                  }}
                  disabled={!permalinkInput.trim() || verifying}
                  sx={{
                    bgcolor: '#f59e0b',
                    color: '#fff',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      bgcolor: '#d97706',
                    },
                    '&:disabled': {
                      bgcolor: isDark ? '#334155' : '#e2e8f0',
                    },
                  }}
                >
                  Submit Permalink
                </Button>
              </Box>
            </Box>
          )}

          {/* Spacer */}
          <Box
            sx={{
              flex: 1,
            }}
          />

          {/* Dismiss — always available for non-dismissed */}
          {!isDismissed && !isPublished && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<XIcon size={13} />}
              onClick={onDismiss}
              sx={{
                borderColor: 'rgba(239,68,68,0.3)',
                color: '#ef4444',
                fontSize: '13px',
                '&:hover': {
                  borderColor: '#ef4444',
                  bgcolor: 'rgba(239,68,68,0.08)',
                },
              }}
            >
              Dismiss
            </Button>
          )}
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
            {isEditing ? (
              <Box
                sx={{
                  mb: 2,
                }}
              >
                {/* AI Toolbar */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    mb: 1.5,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mr: 0.5,
                    }}
                  >
                    <SparklesIcon size={12} color="#f97316" />
                    <Typography
                      sx={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#f97316',
                      }}
                    >
                      AI assist:
                    </Typography>
                  </Box>
                  {aiActions.map((action) => (
                    <Button
                      key={action.key}
                      size="small"
                      variant="outlined"
                      startIcon={
                        aiLoading === action.key ? (
                          <CircularProgress
                            size={10}
                            sx={{
                              color: '#f97316',
                            }}
                          />
                        ) : (
                          action.icon
                        )
                      }
                      disabled={aiLoading !== null}
                      onClick={() => handleAiAction(action.key)}
                      sx={{
                        fontSize: '11px',
                        py: 0.25,
                        px: 1,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: '#f97316',
                          color: '#f97316',
                          bgcolor: 'rgba(249,115,22,0.06)',
                        },
                        '&:disabled': {
                          opacity: 0.5,
                        },
                      }}
                    >
                      {aiLoading === action.key ? 'Rewriting...' : action.label}
                    </Button>
                  ))}
                </Box>

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
                      '& fieldset': {
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#f97316',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#f97316',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      color: 'text.primary',
                    },
                  }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveDraft}
                    sx={{
                      bgcolor: '#f97316',
                      color: '#fff',
                      fontSize: '13px',
                      '&:hover': {
                        bgcolor: '#ea6c0a',
                      },
                    }}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCancelEdit}
                    sx={{
                      borderColor: 'divider',
                      color: 'text.secondary',
                      fontSize: '13px',
                      '&:hover': {
                        borderColor: '#475569',
                        bgcolor: draftBg,
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Tooltip
                    title={copiedDraft ? 'Copied!' : 'Copy draft'}
                    arrow
                    placement="top"
                  >
                    <IconButton
                      size="small"
                      onClick={handleCopyDraft}
                      sx={{
                        color: copiedDraft ? '#10b981' : 'text.disabled',
                        '&:hover': {
                          color: copiedDraft ? '#10b981' : 'text.secondary',
                        },
                      }}
                    >
                      {copiedDraft ? (
                        <CheckIcon size={14} />
                      ) : (
                        <ClipboardIcon size={14} />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: 'text.disabled',
                      ml: 0.5,
                    }}
                  >
                    {editText.length} chars
                  </Typography>
                </Box>
              </Box>
            ) : (
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
                  <Typography
                    sx={{
                      fontSize: '14px',
                      color: 'text.secondary',
                      lineHeight: 1.7,
                    }}
                  >
                    {opp.draftReply}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon size={13} />}
                    onClick={() => {
                      setEditText(opp.draftReply)
                      setIsEditing(true)
                    }}
                    sx={{
                      borderColor: 'divider',
                      color: 'text.secondary',
                      fontSize: '13px',
                      '&:hover': {
                        borderColor: '#475569',
                        bgcolor: draftBg,
                      },
                    }}
                  >
                    Edit Draft
                  </Button>
                  <Tooltip
                    title={copiedDraft ? 'Copied!' : 'Copy draft'}
                    arrow
                    placement="top"
                  >
                    <IconButton
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(opp.draftReply)
                        setCopiedDraft(true)
                        setTimeout(() => setCopiedDraft(false), 2000)
                      }}
                      sx={{
                        color: copiedDraft ? '#10b981' : 'text.disabled',
                        '&:hover': {
                          color: copiedDraft ? '#10b981' : 'text.secondary',
                        },
                      }}
                    >
                      {copiedDraft ? (
                        <CheckIcon size={14} />
                      ) : (
                        <ClipboardIcon size={14} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  )
}
