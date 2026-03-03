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
  Autocomplete,
  Chip,
} from '@mui/material'
import {
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  SaveIcon,
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
  // Search
  const [searchFrequency, setSearchFrequency] = useState('daily')
  const [searchTimezone, setSearchTimezone] = useState('UTC')
  const [searchTimes, setSearchTimes] = useState<string[]>(['09:00'])
  const [maxResults, setMaxResults] = useState(10)
  const [maxAge, setMaxAge] = useState(2)
  // AI tuning
  const [relevanceThreshold, setRelevanceThreshold] = useState(0.4)
  const [aiSearchContext, setAiSearchContext] = useState('')
  const [aiModel, setAiModel] = useState('claude-sonnet-4-20250514')
  const [showRunConfirm, setShowRunConfirm] = useState(false)
  const [saved, setSaved] = useState(false)
  const [searchRunning, setSearchRunning] = useState(false)
  const [searchResult, setSearchResult] = useState<string | null>(null)

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
        setSearchFrequency(data.searchFrequency || 'daily')
        setSearchTimezone(data.searchTimezone || 'UTC')
        setSearchTimes(
          data.searchTimes
            ? data.searchTimes.split(',').map((t: string) => t.trim()).filter(Boolean)
            : ['09:00']
        )
        setMaxResults(data.maxResultsPerKeyword ?? 10)
        setMaxAge(data.threadMaxAgeDays ?? 2)
        setRelevanceThreshold(data.relevanceThreshold ?? 0.4)
        setAiSearchContext(data.aiSearchContext || '')
        setAiModel(data.aiModel || 'claude-sonnet-4-20250514')
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
      } else {
        setSearchResult(
          `Search complete: ${data.summary.opportunitiesCreated} new opportunities from ${data.summary.clientsSearched} clients`
        )
      }
    } catch (err) {
      setSearchResult(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSearchRunning(false)
    }
  }

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = {
        redditApiMode,
        searchFrequency,
        searchTimezone,
        searchTimes: searchTimes.join(','),
        maxResultsPerKeyword: maxResults,
        threadMaxAgeDays: maxAge,
        relevanceThreshold,
        aiSearchContext: aiSearchContext.trim() || null,
        aiModel,
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
        setTimeout(() => setSaved(false), 2500)
        loadSettings()
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
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

      {/* Search Settings */}
      <SectionCard title="Search Settings">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Search Frequency</InputLabel>
            <Select
              value={searchFrequency}
              onChange={(e) => setSearchFrequency(e.target.value)}
              label="Search Frequency"
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="twice-daily">Twice Daily</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            value={searchTimezone}
            onChange={(_, val) => val && setSearchTimezone(val)}
            options={Intl.supportedValuesOf('timeZone')}
            size="small"
            fullWidth
            disableClearable
            renderInput={(params) => (
              <TextField {...params} label="Timezone" sx={inputSx} />
            )}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#475569' },
                '&.Mui-focused fieldset': { borderColor: '#f97316' },
              },
            }}
          />

          <Box>
            <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 1 }}>
              Search Times ({searchTimezone.replace(/_/g, ' ')})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {searchTimes.map((time) => (
                <Chip
                  key={time}
                  label={time}
                  onDelete={searchTimes.length > 1 ? () => setSearchTimes((prev) => prev.filter((t) => t !== time)) : undefined}
                  sx={{
                    bgcolor: 'rgba(249, 115, 22, 0.1)',
                    color: '#f97316',
                    border: '1px solid rgba(249, 115, 22, 0.25)',
                    fontWeight: 600,
                    fontSize: '13px',
                    '& .MuiChip-deleteIcon': { color: '#f97316', '&:hover': { color: '#ea6c0a' } },
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                type="time"
                size="small"
                value=""
                onChange={(e) => {
                  const val = e.target.value
                  if (val && !searchTimes.includes(val)) {
                    setSearchTimes((prev) => [...prev, val].sort())
                  }
                }}
                sx={{
                  ...inputSx,
                  width: 160,
                  '& input': { color: 'text.primary' },
                }}
                InputLabelProps={{ shrink: true }}
              />
              <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                Click to add a time. {searchFrequency === 'daily' ? '1 time recommended.' : '2 times recommended.'}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#1e293b', my: 0.5 }} />

          <TextField
            label="Max Results Per Keyword"
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            fullWidth
            size="small"
            inputProps={{
              min: 1,
              max: 100,
            }}
            sx={inputSx}
          />
          <TextField
            label="Thread Max Age (days)"
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(Number(e.target.value))}
            fullWidth
            size="small"
            inputProps={{
              min: 1,
              max: 30,
            }}
            sx={inputSx}
          />

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

          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>AI Model</InputLabel>
            <Select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              label="AI Model"
            >
              <MenuItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</MenuItem>
              <MenuItem value="claude-haiku-4-20250514">Claude Haiku 4 (Faster/Cheaper)</MenuItem>
              <MenuItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Custom Scoring Context"
            value={aiSearchContext}
            onChange={(e) => setAiSearchContext(e.target.value)}
            fullWidth
            multiline
            rows={4}
            size="small"
            placeholder="e.g. Our client focuses on B2B SaaS companies. Ignore consumer-focused discussions, local Philippines-only threads, and posts about physical products..."
            helperText="This text is injected into the AI scoring prompt to help it understand what makes a good opportunity for your clients."
            sx={inputSx}
          />
        </Box>
      </SectionCard>

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
    </Box>
  )
}
