import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  IconButton,
  Alert,
  Divider,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material'
import {
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  SaveIcon,
  Trash2Icon,
  AlertTriangleIcon,
} from 'lucide-react'
type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error'
interface SectionCardProps {
  title: string
  children: React.ReactNode
}
function SectionCard({ title, children }: SectionCardProps) {
  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid #334155',
        borderRadius: '12px',
        mb: 3,
      }}
    >
      <CardContent
        sx={{
          p: 3,
        }}
      >
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'text.primary',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 2.5,
            pb: 2,
            borderBottom: '1px solid #1e293b',
          }}
        >
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  )
}
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#334155',
      },
      '&:hover fieldset': {
        borderColor: '#475569',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#f97316',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#64748b',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#f97316',
    },
  }
  return (
    <TextField
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      size="small"
      placeholder={placeholder}
      sx={inputSx}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={() => setShow(!show)}
              sx={{
                color: '#64748b',
                '&:hover': {
                  color: '#94a3b8',
                },
              }}
            >
              {show ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}
function ConnectionTestButton({
  onTest,
  status,
}: {
  onTest: () => void
  status: ConnectionStatus
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Button
        variant="outlined"
        size="small"
        onClick={onTest}
        disabled={status === 'testing'}
        sx={{
          borderColor: '#334155',
          color: '#94a3b8',
          '&:hover': {
            borderColor: '#475569',
            bgcolor: '#0f172a',
          },
          '&:disabled': {
            borderColor: '#1e293b',
            color: '#475569',
          },
        }}
      >
        {status === 'testing' ? 'Testing...' : 'Test Connection'}
      </Button>
      {status === 'success' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <CheckCircleIcon size={14} color="#10b981" />
          <Typography
            sx={{
              fontSize: '12px',
              color: '#10b981',
            }}
          >
            Connected
          </Typography>
        </Box>
      )}
      {status === 'error' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <XCircleIcon size={14} color="#ef4444" />
          <Typography
            sx={{
              fontSize: '12px',
              color: '#ef4444',
            }}
          >
            Connection failed
          </Typography>
        </Box>
      )}
    </Box>
  )
}
const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#334155',
    },
    '&:hover fieldset': {
      borderColor: '#475569',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#f97316',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#64748b',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#f97316',
  },
}
export function Settings() {
  // Reddit API
  const [redditApiMode, setRedditApiMode] = useState<'public_json' | 'oauth'>('public_json')
  const [redditClientId, setRedditClientId] = useState('')
  const [redditClientSecret, setRedditClientSecret] = useState('')
  const [redditUsername, setRedditUsername] = useState('')
  const [redditPassword, setRedditPassword] = useState('')
  const [redditStatus, setRedditStatus] = useState<ConnectionStatus>('idle')
  // AI
  const [anthropicKey, setAnthropicKey] = useState('')
  const [aiStatus, setAiStatus] = useState<ConnectionStatus>('idle')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewResponse, setPreviewResponse] = useState('')
  const [previewError, setPreviewError] = useState('')
  // Search
  const [searchBreadth, setSearchBreadth] = useState('balanced')
  const [searchFrequency, setSearchFrequency] = useState('once_daily')
  const [searchScheduleTimes, setSearchScheduleTimes] = useState('09:00')
  const [searchTimezone, setSearchTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [maxResults, setMaxResults] = useState(10)
  const [maxAge, setMaxAge] = useState(2)
  // Pipeline limits
  const [maxAiCandidatesPerClient, setMaxAiCandidatesPerClient] = useState(25)
  const [maxAiCallsTotal, setMaxAiCallsTotal] = useState(200)
  const [maxOppsPerClient, setMaxOppsPerClient] = useState(20)
  const [maxOppsTotal, setMaxOppsTotal] = useState(50)
  // AI tuning
  const [relevanceThreshold, setRelevanceThreshold] = useState(0.4)
  const [aiSearchContext, setAiSearchContext] = useState('')
  const [aiModelScoring, setAiModelScoring] = useState('claude-haiku-4-5-20251001')
  const [aiModelReplies, setAiModelReplies] = useState('claude-sonnet-4-20250514')
  const [aiModelDetection, setAiModelDetection] = useState('claude-sonnet-4-20250514')
  // Pile-on settings
  const [pileOnEnabled, setPileOnEnabled] = useState(false)
  const [pileOnAutoCreate, setPileOnAutoCreate] = useState(true)
  const [pileOnMaxPerPrimary, setPileOnMaxPerPrimary] = useState(2)
  const [pileOnDelayMinHours, setPileOnDelayMinHours] = useState(2)
  const [pileOnDelayMaxHours, setPileOnDelayMaxHours] = useState(6)
  const [pileOnMaxPerOpportunity, setPileOnMaxPerOpportunity] = useState(2)
  const [pileOnCooldownDays, setPileOnCooldownDays] = useState(14)
  const [showRunConfirm, setShowRunConfirm] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [searchRunning, setSearchRunning] = useState(false)
  const [searchResult, setSearchResult] = useState<string | null>(null)
  const [nukeStep, setNukeStep] = useState(0)
  const [nukeConfirmText, setNukeConfirmText] = useState('')
  const [nukeLoading, setNukeLoading] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setRedditApiMode(data.redditApiMode === 'oauth' ? 'oauth' : 'public_json')
        setRedditClientId(data.redditClientId || '')
        setRedditClientSecret(data.redditClientSecret || '')
        setRedditUsername(data.redditUsername || '')
        setRedditPassword(data.redditPassword || '')
        setAnthropicKey(data.anthropicApiKey || '')
        setSpecialInstructions(data.specialInstructions || '')
        setSearchFrequency(data.searchFrequency || 'once_daily')
        setSearchScheduleTimes(data.searchScheduleTimes || '09:00')
        setSearchTimezone(data.searchTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
        setMaxResults(data.maxResultsPerKeyword ?? 10)
        setMaxAge(data.threadMaxAgeDays ?? 2)
        setMaxAiCandidatesPerClient(data.maxAiCandidatesPerClient ?? 25)
        setMaxAiCallsTotal(data.maxAiCallsTotal ?? 200)
        setMaxOppsPerClient(data.maxOppsPerClient ?? 20)
        setMaxOppsTotal(data.maxOppsTotal ?? 50)
        setRelevanceThreshold(data.relevanceThreshold ?? 0.4)
        setAiSearchContext(data.aiSearchContext || '')
        setAiModelScoring(data.aiModelScoring || 'claude-haiku-4-5-20251001')
        setAiModelReplies(data.aiModelReplies || 'claude-sonnet-4-20250514')
        setAiModelDetection(data.aiModelDetection || 'claude-sonnet-4-20250514')
        setSearchBreadth(data.searchBreadth || 'balanced')
        setPileOnEnabled(data.pileOnEnabled ?? false)
        setPileOnAutoCreate(data.pileOnAutoCreate ?? true)
        setPileOnMaxPerPrimary(data.pileOnMaxPerPrimary ?? 2)
        setPileOnDelayMinHours(data.pileOnDelayMinHours ?? 2)
        setPileOnDelayMaxHours(data.pileOnDelayMaxHours ?? 6)
        setPileOnMaxPerOpportunity(data.pileOnMaxPerOpportunity ?? 2)
        setPileOnCooldownDays(data.pileOnCooldownDays ?? 14)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleTestReddit = async () => {
    setRedditStatus('testing')
    try {
      const res = await fetch('/api/settings/test-reddit', { method: 'POST' })
      const data = await res.json()
      setRedditStatus(data.success ? 'success' : 'error')
    } catch {
      setRedditStatus('error')
    }
  }

  const handleTestAi = async () => {
    setAiStatus('testing')
    try {
      const res = await fetch('/api/settings/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: anthropicKey }),
      })
      const data = await res.json()
      setAiStatus(data.success ? 'success' : 'error')
    } catch {
      setAiStatus('error')
    }
  }

  const handleRunSearch = async () => {
    if (!showRunConfirm) {
      setShowRunConfirm(true)
      setTimeout(() => setShowRunConfirm(false), 3000)
      return
    }
    setShowRunConfirm(false)
    setSearchRunning(true)
    setSearchResult(null)
    try {
      const res = await fetch('/api/search/run', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setSearchResult(`Error: ${data.error}`)
        setSearchRunning(false)
      } else {
        setSearchResult('Search started — check Dashboard for live progress')
        setSearchRunning(false)
      }
    } catch (err) {
      setSearchResult(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setSearchRunning(false)
    }
  }

  const handleNukeOpportunities = async () => {
    setNukeLoading(true)
    try {
      const res = await fetch('/api/opportunities/all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_ALL_OPPORTUNITIES' }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Deleted ${data.deleted} opportunities and ${data.dismissalsCleared} dismissal logs.`)
      } else {
        alert('Failed to clear opportunities')
      }
    } catch {
      alert('Network error')
    } finally {
      setNukeLoading(false)
      setNukeStep(0)
      setNukeConfirmText('')
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    try {
      const payload: Record<string, unknown> = {
        redditApiMode,
        searchFrequency,
        searchScheduleTimes,
        searchTimezone,
        searchBreadth,
        maxResultsPerKeyword: maxResults,
        threadMaxAgeDays: maxAge,
        maxAiCandidatesPerClient,
        maxAiCallsTotal,
        maxOppsPerClient,
        maxOppsTotal,
        relevanceThreshold,
        aiSearchContext: aiSearchContext.trim() || null,
        aiModelScoring,
        aiModelReplies,
        aiModelDetection,
        pileOnEnabled,
        pileOnAutoCreate,
        pileOnMaxPerPrimary,
        pileOnDelayMinHours,
        pileOnDelayMaxHours,
        pileOnMaxPerOpportunity,
        pileOnCooldownDays,
        specialInstructions,
      }
      // Only include non-masked values
      if (!redditClientId.startsWith('****')) payload.redditClientId = redditClientId
      if (!redditClientSecret.startsWith('****')) payload.redditClientSecret = redditClientSecret
      if (!redditPassword.startsWith('****')) payload.redditPassword = redditPassword
      if (!anthropicKey.startsWith('****')) payload.anthropicApiKey = anthropicKey
      payload.redditUsername = redditUsername

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSaved(true)
        setSaveError(null)
        setTimeout(() => setSaved(false), 2500)
        loadSettings()
      } else {
        const errData = await res.json().catch(() => null)
        setSaveError(errData?.error || `Save failed (${res.status})`)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      setSaveError(err instanceof Error ? err.message : 'Network error')
    }
  }
  return (
    <Box
      sx={{
        p: {
          xs: 1.5,
          sm: 2,
          md: 3,
        },
        maxWidth: 720,
        mx: 'auto',
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          mb: 3,
        }}
      >
        Settings
      </Typography>

      {/* Reddit API */}
      <SectionCard title="Reddit API">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 1 }}>
              API Mode
            </Typography>
            <ToggleButtonGroup
              value={redditApiMode}
              exclusive
              onChange={(_, val) => val && setRedditApiMode(val)}
              size="small"
              fullWidth
              sx={{
                overflow: 'visible',
                '& .MuiToggleButton-root': {
                  color: '#64748b',
                  borderColor: '#334155',
                  fontSize: '13px',
                  fontWeight: 500,
                  py: 0.75,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(249, 115, 22, 0.1)',
                    color: '#f97316',
                    borderColor: '#f97316',
                    zIndex: 1,
                    '&:hover': {
                      bgcolor: 'rgba(249, 115, 22, 0.15)',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="public_json">Public JSON (no API key)</ToggleButton>
              <ToggleButton value="oauth">OAuth API</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {redditApiMode === 'public_json' && (
            <Alert
              severity="info"
              sx={{
                bgcolor: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: '#94a3b8',
                fontSize: '12px',
                '& .MuiAlert-icon': { color: '#3b82f6' },
              }}
            >
              Using public Reddit JSON endpoints. Rate limited to ~10 requests/minute.
              Apply for OAuth access at reddit.com/prefs/apps for higher limits.
            </Alert>
          )}

          {redditApiMode === 'oauth' && (
            <>
              <TextField
                label="Client ID"
                value={redditClientId}
                onChange={(e) => setRedditClientId(e.target.value)}
                fullWidth
                size="small"
                sx={inputSx}
              />
              <PasswordField
                label="Client Secret"
                value={redditClientSecret}
                onChange={setRedditClientSecret}
              />
              <TextField
                label="Username"
                value={redditUsername}
                onChange={(e) => setRedditUsername(e.target.value)}
                fullWidth
                size="small"
                placeholder="your_reddit_username"
                sx={inputSx}
              />
              <PasswordField
                label="Password"
                value={redditPassword}
                onChange={setRedditPassword}
              />
              <ConnectionTestButton
                onTest={handleTestReddit}
                status={redditStatus}
              />
              <Typography
                sx={{
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                Create a Reddit app at{' '}
                <Typography
                  component="span"
                  sx={{
                    color: '#3b82f6',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  reddit.com/prefs/apps
                </Typography>{' '}
                (script type)
              </Typography>
            </>
          )}
        </Box>
      </SectionCard>

      {/* AI Configuration */}
      <SectionCard title="AI Configuration">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <PasswordField
            label="Anthropic API Key"
            value={anthropicKey}
            onChange={setAnthropicKey}
            placeholder="sk-ant-..."
          />
          <ConnectionTestButton
            onTest={handleTestAi}
            status={aiStatus}
          />
        </Box>
      </SectionCard>

      {/* Special Instructions */}
      <SectionCard title="Special Instructions for AI Generation">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: '13px', color: '#64748b', mb: 1 }}>
            Add custom instructions that will be appended to all AI generation prompts (replies, threads, rewrites).
            This does NOT affect scoring or filtering. Use this to fine-tune tone, style, or add specific requirements.
          </Typography>
          <TextField
            label="Special Instructions (Optional)"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            multiline
            rows={6}
            fullWidth
            placeholder="Example: Always use a friendly, conversational tone. Avoid technical jargon unless necessary. Keep responses concise and actionable."
            sx={inputSx}
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography sx={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', flex: 1 }}>
              💡 Tip: These instructions are added to the system prompt for generation tasks only. Leave empty if you don't need custom instructions.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={async () => {
                setPreviewDialogOpen(true)
                setPreviewLoading(true)
                setPreviewError('')
                setPreviewResponse('')
                try {
                  const res = await fetch('/api/settings/test-special-instructions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ specialInstructions }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    setPreviewResponse(data.response)
                  } else {
                    setPreviewError(data.error || 'Failed to generate preview')
                  }
                } catch (err) {
                  setPreviewError(err instanceof Error ? err.message : 'Network error')
                } finally {
                  setPreviewLoading(false)
                }
              }}
              sx={{
                borderColor: '#334155',
                color: '#94a3b8',
                textTransform: 'none',
                fontSize: '12px',
                '&:hover': {
                  borderColor: '#475569',
                  bgcolor: '#0f172a',
                },
              }}
            >
              Test Preview
            </Button>
          </Box>
        </Box>
      </SectionCard>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid #334155',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #334155' }}>
          Test Special Instructions
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: '13px', color: '#64748b', mb: 2 }}>
            Testing with sample scenario: "What's the best tool for managing social media content?" on r/Entrepreneur
          </Typography>

          {previewLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
              <CircularProgress size={20} />
              <Typography sx={{ fontSize: '13px', color: '#64748b' }}>
                Generating response with your special instructions...
              </Typography>
            </Box>
          )}

          {previewError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '12px' }}>
              {previewError}
            </Alert>
          )}

          {previewResponse && !previewLoading && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#f97316', mb: 1 }}>
                  AI-Generated Response:
                </Typography>
                <Box
                  sx={{
                    bgcolor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    p: 2,
                    fontSize: '13px',
                    color: '#e2e8f0',
                    maxHeight: '400px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {previewResponse}
                </Box>
              </Box>

              {specialInstructions && (
                <Alert severity="success" sx={{ fontSize: '12px' }}>
                  ✓ Response generated with your special instructions applied
                </Alert>
              )}

              {!specialInstructions && (
                <Alert severity="info" sx={{ fontSize: '12px' }}>
                  Response generated without special instructions (base prompt only)
                </Alert>
              )}
            </>
          )}

          {!previewLoading && !previewResponse && !previewError && (
            <Alert severity="info" sx={{ fontSize: '12px' }}>
              Click "Test Preview" to generate a sample response and see how your special instructions affect the output.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #334155', p: 2 }}>
          <Button
            onClick={() => setPreviewDialogOpen(false)}
            sx={{
              color: '#94a3b8',
              textTransform: 'none',
              '&:hover': {
                bgcolor: '#0f172a',
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search Settings */}
      <SectionCard title="Search Settings">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 1 }}>
              Search Schedule
            </Typography>
            <ToggleButtonGroup
              value={searchFrequency}
              exclusive
              onChange={(_, val) => val && setSearchFrequency(val)}
              size="small"
              fullWidth
              sx={{
                overflow: 'visible',
                '& .MuiToggleButton-root': {
                  color: '#64748b',
                  borderColor: '#334155',
                  fontSize: '13px',
                  fontWeight: 500,
                  py: 0.75,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(249, 115, 22, 0.1)',
                    color: '#f97316',
                    borderColor: '#f97316',
                    zIndex: 1,
                    '&:hover': {
                      bgcolor: 'rgba(249, 115, 22, 0.15)',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="once_daily">Once Daily</ToggleButton>
              <ToggleButton value="twice_daily">Twice Daily</ToggleButton>
              <ToggleButton value="manual">Manual Only</ToggleButton>
            </ToggleButtonGroup>
            <Typography sx={{ fontSize: '11px', color: '#64748b', mt: 0.75 }}>
              {searchFrequency === 'once_daily'
                ? 'One full digest per day. Conserves tokens and gives you a complete batch to work through.'
                : searchFrequency === 'twice_daily'
                  ? 'Two digests per day (morning + afternoon). Good for active teams who check in twice.'
                  : 'Searches only run when you click "Run Search Now" below.'}
            </Typography>
          </Box>

          {searchFrequency !== 'manual' && (
            <>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label={searchFrequency === 'twice_daily' ? 'Schedule Times (HH:MM)' : 'Schedule Time (HH:MM)'}
                  value={searchScheduleTimes}
                  onChange={(e) => setSearchScheduleTimes(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder={searchFrequency === 'twice_daily' ? '09:00, 17:00' : '09:00'}
                  sx={inputSx}
                />
                <FormControl size="small" sx={{ minWidth: 220, ...inputSx }}>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={searchTimezone}
                    onChange={(e) => setSearchTimezone(e.target.value)}
                    label="Timezone"
                  >
                    {[
                      'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
                      'America/Chicago', 'America/New_York', 'America/Sao_Paulo',
                      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
                      'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
                      'Asia/Shanghai', 'Asia/Manila', 'Asia/Tokyo', 'Asia/Seoul',
                      'Australia/Sydney', 'Pacific/Auckland', 'UTC',
                    ].map((tz: string) => (
                      <MenuItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Typography sx={{ fontSize: '11px', color: '#64748b', mt: -1.5 }}>
                {searchFrequency === 'twice_daily'
                  ? 'Two times in 24h format, e.g. "09:00, 17:00".'
                  : 'Time in 24h format, e.g. "09:00".'}
              </Typography>
            </>
          )}

          <Divider sx={{ borderColor: '#1e293b', my: 0.5 }} />

          <Box>
            <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 1 }}>
              Search Breadth
            </Typography>
            <ToggleButtonGroup
              value={searchBreadth}
              exclusive
              onChange={(_, val) => val && setSearchBreadth(val)}
              size="small"
              fullWidth
              sx={{
                overflow: 'visible',
                '& .MuiToggleButton-root': {
                  color: '#64748b',
                  borderColor: '#334155',
                  fontSize: '13px',
                  fontWeight: 500,
                  py: 0.75,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(249, 115, 22, 0.1)',
                    color: '#f97316',
                    borderColor: '#f97316',
                    zIndex: 1,
                    '&:hover': {
                      bgcolor: 'rgba(249, 115, 22, 0.15)',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="narrow">Narrow</ToggleButton>
              <ToggleButton value="balanced">Balanced</ToggleButton>
              <ToggleButton value="broad">Broad</ToggleButton>
            </ToggleButtonGroup>
            <Typography sx={{ fontSize: '11px', color: '#64748b', mt: 0.75 }}>
              {searchBreadth === 'narrow'
                ? 'Exact keyword phrases only. Fewer results but highly targeted.'
                : searchBreadth === 'broad'
                  ? 'Expands keywords into 2-word and 3-word sub-queries. More results, relies on AI scoring to filter noise.'
                  : 'Expands long keywords into 3-word sub-queries. Good balance of coverage and precision.'}
            </Typography>
          </Box>

          <TextField
            label="Max Results Per Keyword"
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
            fullWidth
            size="small"
            helperText="Max Reddit threads fetched per keyword. Higher = more threads but slower searches."
            inputProps={{
              min: 1,
              max: 100,
            }}
            sx={inputSx}
            FormHelperTextProps={{ sx: { fontSize: '10px', color: '#64748b', mt: 0.5 } }}
          />
          <TextField
            label="Thread Max Age (days)"
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
            fullWidth
            size="small"
            helperText="Ignore threads older than this. Older threads = less engagement. Recommended: 2-7 days."
            inputProps={{
              min: 1,
              max: 30,
            }}
            sx={inputSx}
            FormHelperTextProps={{ sx: { fontSize: '10px', color: '#64748b', mt: 0.5 } }}
          />

          <Divider sx={{ my: 2, borderColor: '#1e293b' }} />
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', mb: 1 }}>
            Pipeline Limits (Scalability)
          </Typography>
          <TextField
            label="Max AI Candidates Per Client"
            type="number"
            value={maxAiCandidatesPerClient}
            onChange={(e) => setMaxAiCandidatesPerClient(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
            fullWidth
            size="small"
            helperText="Max threads per client sent to AI for scoring. Higher = more AI calls."
            inputProps={{
              min: 1,
              max: 100,
            }}
            sx={inputSx}
            FormHelperTextProps={{ sx: { fontSize: '10px', color: '#64748b', mt: 0.5 } }}
          />
          <TextField
            label="Max AI Calls Total"
            type="number"
            value={maxAiCallsTotal}
            onChange={(e) => setMaxAiCallsTotal(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
            fullWidth
            size="small"
            helperText="Total AI calls per search run across all clients. Prevents runaway costs."
            inputProps={{
              min: 1,
              max: 1000,
            }}
            sx={inputSx}
            FormHelperTextProps={{ sx: { fontSize: '10px', color: '#64748b', mt: 0.5 } }}
          />
          <TextField
            label="Max Opps Per Client"
            type="number"
            value={maxOppsPerClient}
            onChange={(e) => setMaxOppsPerClient(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
            fullWidth
            size="small"
            helperText="Max opportunities created per client per run. Limits drip to avoid overwhelm."
            inputProps={{
              min: 1,
              max: 100,
            }}
            sx={inputSx}
            FormHelperTextProps={{ sx: { fontSize: '10px', color: '#64748b', mt: 0.5 } }}
          />
          <TextField
            label="Max Opps Total"
            type="number"
            value={maxOppsTotal}
            onChange={(e) => setMaxOppsTotal(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
            fullWidth
            size="small"
            helperText="Total opportunities per run across all clients. Final safety cap."
            inputProps={{
              min: 1,
              max: 500,
            }}
            sx={inputSx}
            FormHelperTextProps={{ sx: { fontSize: '10px', color: '#64748b', mt: 0.5 } }}
          />
          <Typography sx={{ fontSize: '11px', color: '#64748b', mt: -1.5 }}>
            Adjust these as you add more clients. Higher values = more AI cost and processing time.
          </Typography>

          <Tooltip
            title={
              showRunConfirm
                ? 'This will search for all active clients now. Click again to confirm.'
                : ''
            }
            open={showRunConfirm}
            arrow
            placement="top"
          >
            <Button
              variant="contained"
              fullWidth
              startIcon={<PlayIcon size={16} />}
              disabled={searchRunning}
              onClick={handleRunSearch}
              sx={{
                bgcolor: showRunConfirm ? '#f59e0b' : '#f97316',
                '&:hover': {
                  bgcolor: showRunConfirm ? '#d97706' : '#ea6c0a',
                },
                py: 1.25,
                fontSize: '14px',
              }}
            >
              {searchRunning ? 'Searching...' : showRunConfirm ? 'Click again to confirm' : 'Run Search Now'}
            </Button>
          </Tooltip>
          {showRunConfirm && (
            <Alert
              severity="warning"
              sx={{
                bgcolor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                fontSize: '12px',
              }}
            >
              This will search for all active clients now. Click the button
              again to confirm.
            </Alert>
          )}
          {searchResult && (
            <Alert
              severity={searchResult.startsWith('Error') || searchResult.startsWith('Search failed') ? 'error' : 'success'}
              sx={{
                bgcolor: searchResult.startsWith('Error') || searchResult.startsWith('Search failed')
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${searchResult.startsWith('Error') || searchResult.startsWith('Search failed') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                color: searchResult.startsWith('Error') || searchResult.startsWith('Search failed') ? '#ef4444' : '#10b981',
                fontSize: '12px',
              }}
            >
              {searchResult}
            </Alert>
          )}
        </Box>
      </SectionCard>

      {/* AI Search Tuning */}
      <SectionCard title="AI Search Tuning">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 0.5 }}>
              Relevance Threshold: <strong>{Math.round(relevanceThreshold * 100)}%</strong>
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#64748b', mb: 1 }}>
              Opportunities below this score will be automatically filtered out. Higher = stricter.
            </Typography>
            <Box sx={{ px: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: -0.5 }}>
                {[0, 25, 50, 75, 100].map((v) => (
                  <Typography key={v} sx={{ fontSize: '10px', color: '#64748b' }}>{v}%</Typography>
                ))}
              </Box>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={relevanceThreshold}
                onChange={(e) => setRelevanceThreshold(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#f97316' }}
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#1e293b', my: 0.5 }} />

          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI Models by Activity
          </Typography>
          <Typography sx={{ fontSize: '11px', color: '#64748b', mb: 0.5 }}>
            Choose cheaper models for high-volume tasks (scoring) and better models for quality tasks (replies). Prices: input/output per million tokens.
          </Typography>

          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Scoring Model (high volume)</InputLabel>
            <Select
              value={aiModelScoring}
              onChange={(e) => setAiModelScoring(e.target.value)}
              label="Scoring Model (high volume)"
            >
              <MenuItem value="claude-haiku-4-5-20251001">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Haiku 4.5</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#10b981', ml: 2 }}>$0.80/$4 · Recommended</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-20250514">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#f97316', ml: 2 }}>$3/$15</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-5-20250929">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4.5</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#3b82f6', ml: 2 }}>$3/$15</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-6">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4.6</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#6366f1', ml: 2 }}>$3/$15 · Latest</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-opus-4-20250514">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Opus 4</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#8b5cf6', ml: 2 }}>$15/$75</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-opus-4-6">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Opus 4.6</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#7c3aed', ml: 2 }}>$15/$75 · Most capable</Typography>
                </Box>
              </MenuItem>
            </Select>
            <Typography sx={{ fontSize: '11px', color: '#64748b', mt: 0.5 }}>
              Used for scoring every thread that passes heuristic pre-filter. Haiku recommended — 4x cheaper, fast.
            </Typography>
          </FormControl>

          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Reply Generation Model</InputLabel>
            <Select
              value={aiModelReplies}
              onChange={(e) => setAiModelReplies(e.target.value)}
              label="Reply Generation Model"
            >
              <MenuItem value="claude-haiku-4-5-20251001">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Haiku 4.5</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#10b981', ml: 2 }}>$0.80/$4 · Cheapest</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-20250514">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#f97316', ml: 2 }}>$3/$15 · Recommended</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-5-20250929">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4.5</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#3b82f6', ml: 2 }}>$3/$15</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-6">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4.6</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#6366f1', ml: 2 }}>$3/$15 · Latest</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-opus-4-20250514">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Opus 4</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#8b5cf6', ml: 2 }}>$15/$75</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-opus-4-6">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Opus 4.6</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#7c3aed', ml: 2 }}>$15/$75 · Most capable</Typography>
                </Box>
              </MenuItem>
            </Select>
            <Typography sx={{ fontSize: '11px', color: '#64748b', mt: 0.5 }}>
              Used for drafting and rewriting Reddit replies. Better models produce more natural-sounding text.
            </Typography>
          </FormControl>

          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Client Detection Model</InputLabel>
            <Select
              value={aiModelDetection}
              onChange={(e) => setAiModelDetection(e.target.value)}
              label="Client Detection Model"
            >
              <MenuItem value="claude-haiku-4-5-20251001">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Haiku 4.5</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#10b981', ml: 2 }}>$0.80/$4 · Cheapest</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-20250514">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#f97316', ml: 2 }}>$3/$15 · Recommended</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-5-20250929">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4.5</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#3b82f6', ml: 2 }}>$3/$15</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-sonnet-4-6">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Sonnet 4.6</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#6366f1', ml: 2 }}>$3/$15 · Latest</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-opus-4-20250514">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Opus 4</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#8b5cf6', ml: 2 }}>$15/$75</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="claude-opus-4-6">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Claude Opus 4.6</span>
                  <Typography component="span" sx={{ fontSize: '11px', color: '#7c3aed', ml: 2 }}>$15/$75 · Most capable</Typography>
                </Box>
              </MenuItem>
            </Select>
            <Typography sx={{ fontSize: '11px', color: '#64748b', mt: 0.5 }}>
              Used for auto-detecting client info from website URLs. Only runs when adding new clients.
            </Typography>
          </FormControl>

          <Divider sx={{ borderColor: '#1e293b', my: 0.5 }} />

          <TextField
            label="AI Scoring Instructions"
            value={aiSearchContext}
            onChange={(e) => setAiSearchContext(e.target.value)}
            fullWidth
            multiline
            rows={4}
            size="small"
            placeholder="e.g. We only target English-language B2B discussions. Ignore hiring posts, local community threads, educational tutorials, and posts from niche hobby subreddits unrelated to business services..."
            helperText="General rules injected into the AI scoring prompt. These apply across all clients to filter out irrelevant results. Use the Insights page to auto-apply learned patterns."
            sx={inputSx}
          />
        </Box>
      </SectionCard>

      {/* Pile-On Settings */}
      <SectionCard title="Pile-On Settings">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: '12px', color: '#64748b', mb: 1 }}>
            Configure automatic pile-on comment generation. When a primary comment is verified as published, the system can automatically create pile-on opportunities for secondary accounts to reinforce the message.
          </Typography>

          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Pile-On Feature</InputLabel>
            <Select
              value={pileOnEnabled ? 'enabled' : 'disabled'}
              onChange={(e) => setPileOnEnabled(e.target.value === 'enabled')}
              label="Pile-On Feature"
            >
              <MenuItem value="disabled">Disabled</MenuItem>
              <MenuItem value="enabled">Enabled</MenuItem>
            </Select>
            <Typography sx={{ fontSize: '11px', color: '#64748b', mt: 0.5 }}>
              Enable or disable the pile-on feature globally
            </Typography>
          </FormControl>

          {pileOnEnabled && (
            <>
              <FormControl size="small" fullWidth sx={inputSx}>
                <InputLabel>Auto-Create Pile-Ons</InputLabel>
                <Select
                  value={pileOnAutoCreate ? 'yes' : 'no'}
                  onChange={(e) => setPileOnAutoCreate(e.target.value === 'yes')}
                  label="Auto-Create Pile-Ons"
                >
                  <MenuItem value="no">No - Manual Only</MenuItem>
                  <MenuItem value="yes">Yes - Automatic</MenuItem>
                </Select>
                <Typography sx={{ fontSize: '11px', color: '#64748b', mt: 0.5 }}>
                  Automatically create pile-on opportunities when primary comments are verified
                </Typography>
              </FormControl>

              <TextField
                label="Max Pile-Ons Per Primary"
                type="number"
                value={pileOnMaxPerPrimary}
                onChange={(e) => setPileOnMaxPerPrimary(Number(e.target.value))}
                fullWidth
                size="small"
                inputProps={{ min: 1, max: 5 }}
                helperText="Number of pile-on opportunities to create per verified primary comment (1-5)"
                sx={inputSx}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Min Delay (hours)"
                  type="number"
                  value={pileOnDelayMinHours}
                  onChange={(e) => setPileOnDelayMinHours(Number(e.target.value))}
                  size="small"
                  inputProps={{ min: 1, max: 48 }}
                  helperText="Minimum hours before pile-on"
                  sx={inputSx}
                />
                <TextField
                  label="Max Delay (hours)"
                  type="number"
                  value={pileOnDelayMaxHours}
                  onChange={(e) => setPileOnDelayMaxHours(Number(e.target.value))}
                  size="small"
                  inputProps={{ min: 1, max: 72 }}
                  helperText="Maximum hours for pile-on"
                  sx={inputSx}
                />
              </Box>

              <TextField
                label="Max Pile-Ons Per Opportunity (Legacy)"
                type="number"
                value={pileOnMaxPerOpportunity}
                onChange={(e) => setPileOnMaxPerOpportunity(Number(e.target.value))}
                fullWidth
                size="small"
                inputProps={{ min: 1, max: 5 }}
                helperText="Legacy setting for manual pile-on button (1-5)"
                sx={inputSx}
              />

              <TextField
                label="Cooldown Period (days)"
                type="number"
                value={pileOnCooldownDays}
                onChange={(e) => setPileOnCooldownDays(Number(e.target.value))}
                fullWidth
                size="small"
                inputProps={{ min: 1, max: 90 }}
                helperText="Days before same accounts can interact again (prevents suspicious patterns)"
                sx={inputSx}
              />
            </>
          )}
        </Box>
      </SectionCard>

      {/* Save Error */}
      {saveError && (
        <Alert
          severity="error"
          onClose={() => setSaveError(null)}
          sx={{
            mb: 1,
            bgcolor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '13px',
          }}
        >
          {saveError}
        </Alert>
      )}

      {/* Save Button */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        startIcon={<SaveIcon size={18} />}
        onClick={handleSave}
        sx={{
          bgcolor: saved ? '#10b981' : '#f97316',
          '&:hover': {
            bgcolor: saved ? '#059669' : '#ea6c0a',
          },
          py: 1.5,
          fontSize: '15px',
          fontWeight: 600,
          transition: 'background-color 0.2s',
          borderRadius: '10px',
        }}
      >
        {saved ? '✓ Settings Saved' : 'Save Settings'}
      </Button>

      {/* Danger Zone */}
      <Card
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          mb: 3,
          mt: 1,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#ef4444',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 2.5,
              pb: 2,
              borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AlertTriangleIcon size={14} /> Danger Zone
          </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>
                Clear All Opportunities
              </Typography>
              <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                Permanently delete all opportunities and dismissal logs. This cannot be undone.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2Icon size={14} />}
              onClick={() => setNukeStep(1)}
              sx={{
                fontSize: '12px',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                borderColor: '#ef4444',
                color: '#ef4444',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: '#dc2626' },
              }}
            >
              Clear All
            </Button>
          </Box>
        </Box>
        </CardContent>
      </Card>

      {/* Double-confirm dialog — Step 1 */}
      <Dialog open={nukeStep === 1} onClose={() => setNukeStep(0)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444' }}>
          <AlertTriangleIcon size={20} /> Clear All Opportunities?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '14px', color: 'text.secondary', mb: 1 }}>
            This will permanently delete <strong>all opportunities</strong> and <strong>all dismissal logs</strong> from the database.
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
            This action is irreversible.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNukeStep(0)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => setNukeStep(2)}
            sx={{ textTransform: 'none' }}
          >
            Yes, I'm Sure
          </Button>
        </DialogActions>
      </Dialog>

      {/* Double-confirm dialog — Step 2 (final) */}
      <Dialog open={nukeStep === 2} onClose={() => setNukeStep(0)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444' }}>
          <AlertTriangleIcon size={20} /> Final Confirmation
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '14px', color: 'text.secondary', mb: 2 }}>
            Type <strong>DELETE</strong> below to confirm you want to permanently erase all opportunities.
          </Typography>
          <TextField
            value={nukeConfirmText}
            onChange={(e) => setNukeConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            fullWidth
            size="small"
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#ef4444' },
                '&:hover fieldset': { borderColor: '#dc2626' },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setNukeStep(0); setNukeConfirmText('') }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={nukeConfirmText !== 'DELETE' || nukeLoading}
            onClick={handleNukeOpportunities}
            sx={{ textTransform: 'none' }}
          >
            {nukeLoading ? 'Deleting...' : 'Permanently Delete All'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
