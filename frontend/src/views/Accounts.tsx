import React, { useState, useEffect, useCallback } from 'react'
import { copyToClipboard } from '../utils/clipboard'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Divider,
  InputAdornment,
} from '@mui/material'
import {
  PlusIcon,
  MoreVerticalIcon,
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
  ClipboardIcon,
  CheckIcon,
  EditIcon,
  Trash2Icon,
  ActivityIcon,
  SparklesIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { RedditIcon } from '../components/RedditIcon'
import { CircularProgress } from '@mui/material'

function getTimeAgo(date: Date): string {
  const ms = Date.now() - date.getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}
interface Account {
  id: string
  username: string
  password: string
  status: 'active' | 'warming' | 'cooldown' | 'flagged'
  age: string
  postKarma: number
  commentKarma: number
  subreddits: string[]
  clients: string[]
  postsToday: number
  maxPostsPerDay: number
  lastActivity: string
  noOrganicActivity: boolean
  location: string
  organicPostsWeek: number
  citationPostsWeek: number
  personaNotes?: string
  personalitySummary?: string
  writingStyleNotes?: string
  sampleComments?: string
}
const statusConfig = {
  active: {
    label: 'Active',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  warming: {
    label: 'Farming',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  cooldown: {
    label: 'Cooldown',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  flagged: {
    label: 'Flagged',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
}
// ── Persona pool for AI simulation ──────────────────────────────────────────
const PERSONA_POOL = [
  'Mid-30s software engineer in Seattle. Works at a mid-size SaaS company. Casual, slightly nerdy tone — uses lowercase a lot, drops punctuation. Passionate about dev tooling, cloud infra, and weekend hiking. Lurks r/aws, r/devops, r/PNWhikers. Skeptical of hype, values practical advice over theory.',
  "Late-20s personal trainer and nutrition coach based in Austin, TX. Energetic but not preachy. Uses fitness jargon naturally. Posts in r/fitness, r/bodybuilding, r/running. Gives detailed, experience-based advice. Occasionally self-deprecating. Doesn't like bro-science.",
  "Early-40s restaurant owner in Chicago. Blunt, no-nonsense tone. Has seen a lot of 'solutions' come and go. Engages in r/restaurants, r/smallbusiness, r/entrepreneur. Trusts word-of-mouth over ads. Appreciates tools that actually save time. Skeptical of software that overpromises.",
  "32-year-old paralegal in Boston. Careful with wording, avoids giving direct legal advice but knows the landscape well. Active in r/legaladvice, r/personalfinance. Empathetic tone, often suggests 'consult a professional' while still being genuinely helpful. Writes in full sentences.",
  '26-year-old e-commerce entrepreneur who started a Shopify store 3 years ago. Obsessed with conversion optimization and logistics. Hangs out in r/ecommerce, r/shopify, r/Entrepreneur. Direct, data-driven tone. Shares real numbers when relevant. Hates vague advice.',
  "45-year-old IT manager at a mid-market company. Pragmatic, budget-conscious. Has dealt with vendor lock-in before. Active in r/sysadmin, r/aws, r/msp. Writes in a dry, matter-of-fact style. Values reliability over cutting-edge. Often plays devil's advocate.",
  '29-year-old yoga instructor and wellness blogger in Denver. Warm, encouraging tone. Writes in r/yoga, r/meditation, r/loseit. Avoids toxic positivity but genuinely supportive. Uses em-dashes and ellipses. Recommends holistic approaches alongside practical ones.',
  '38-year-old freelance web developer. Opinionated about tech stacks. Hangs out in r/webdev, r/freelance, r/startups. Dry humor, occasionally sarcastic. Has strong opinions on React vs everything else. Gives detailed technical answers but keeps them digestible for non-devs.',
  "Early-30s financial analyst in NYC. Precise, numbers-first communication style. Active in r/personalfinance, r/investing, r/financialindependence. Doesn't sugarcoat. Cites sources when possible. Occasionally mentions their own financial mistakes as cautionary tales.",
  '27-year-old marketing manager at a DTC brand. Knows the difference between organic and paid. Engages in r/marketing, r/ecommerce, r/entrepreneur. Conversational, uses marketing terminology naturally but explains it when needed. Enthusiastic about brand storytelling.',
]
function generatePersona(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const persona =
        PERSONA_POOL[Math.floor(Math.random() * PERSONA_POOL.length)]
      resolve(persona)
    }, 900)
  })
}
// ─── Add Account Modal ────────────────────────────────────────────────────────
interface AddAccountModalProps {
  open: boolean
  onClose: () => void
  onSave: (
    account: Omit<
      Account,
      | 'id'
      | 'age'
      | 'postKarma'
      | 'commentKarma'
      | 'subreddits'
      | 'lastActivity'
      | 'noOrganicActivity'
    >,
  ) => void
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
  '& .MuiFormHelperText-root': {
    color: '#475569',
    fontSize: '11px',
  },
}
function AddAccountModal({ open, onClose, onSave }: AddAccountModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<Account['status']>('warming')
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(3)
  const [personaNotes, setPersonaNotes] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; error?: string; karma?: { post: number; comment: number }; accountAge?: number } | null>(null)
  
  const handleRandomizePersona = async () => {
    setIsGenerating(true)
    const result = await generatePersona()
    setPersonaNotes(result)
    setIsGenerating(false)
  }
  
  const handleVerifyCredentials = async () => {
    if (!username || !password) return
    setVerifying(true)
    setVerificationResult(null)
    try {
      const res = await fetch('/api/accounts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      setVerificationResult(data)
    } catch {
      setVerificationResult({ valid: false, error: 'Network error' })
    }
    setVerifying(false)
  }
  const handleCopy = async () => {
    if (!password) return
    const success = await copyToClipboard(password)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  const handleSave = () => {
    onSave({
      username,
      password,
      status,
      clients: [],
      postsToday: 0,
      maxPostsPerDay,
      location: '',
      organicPostsWeek: 0,
      citationPostsWeek: 0,
      personaNotes,
    })
    setUsername('')
    setPassword('')
    setShowPassword(false)
    setCopied(false)
    setStatus('warming')
    setMaxPostsPerDay(3)
    setPersonaNotes('')
    setIsGenerating(false)
    setVerificationResult(null)
    onClose()
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'text.primary',
          fontWeight: 700,
          pb: 0.5,
        }}
      >
        Add new Reddit Account
      </DialogTitle>
      <Typography
        sx={{
          px: 3,
          pb: 2,
          fontSize: '13px',
          color: 'text.secondary',
        }}
      >
        Connect a Reddit account to use for outreach.
      </Typography>

      <DialogContent
        sx={{
          pt: '8px !important',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 1.5,
          }}
        >
          Reddit Credentials
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mb: 3,
          }}
        >
          <TextField
            label="Reddit Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. fitness_mike (without u/)"
            helperText="The Reddit username for this account"
            sx={inputSx}
          />
          <TextField
            label="Reddit Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            helperText="Used to authenticate via Reddit API"
            sx={inputSx}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showPassword ? 'Hide' : 'Reveal'} arrow>
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      sx={{
                        color: 'text.secondary',
                        mr: -0.5,
                      }}
                    >
                      {showPassword ? (
                        <EyeOffIcon size={15} />
                      ) : (
                        <EyeIcon size={15} />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={copied ? 'Copied!' : 'Copy'} arrow>
                    <IconButton
                      size="small"
                      onClick={handleCopy}
                      edge="end"
                      sx={{
                        color: copied ? '#10b981' : 'text.secondary',
                      }}
                    >
                      {copied ? (
                        <CheckIcon size={15} />
                      ) : (
                        <ClipboardIcon size={15} />
                      )}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          
          {/* Verify Credentials Button */}
          <Button
            size="small"
            variant="outlined"
            onClick={handleVerifyCredentials}
            disabled={!username || !password || verifying}
            startIcon={verifying ? <CircularProgress size={12} /> : <CheckIcon size={12} />}
            sx={{
              mt: 1,
              borderColor: verificationResult?.valid ? '#10b981' : 'divider',
              color: verificationResult?.valid ? '#10b981' : 'text.secondary',
              fontSize: '12px',
              '&:hover': {
                borderColor: verificationResult?.valid ? '#059669' : '#475569',
              },
            }}
          >
            {verifying ? 'Verifying...' : 'Verify Credentials'}
          </Button>
          
          {/* Verification Result */}
          {verificationResult && (
            <Box sx={{ mt: 1 }}>
              {verificationResult.valid ? (
                <Typography sx={{ fontSize: '11px', color: '#10b981' }}>
                  ✓ Valid account • {verificationResult.karma?.post || 0} post karma • {verificationResult.karma?.comment || 0} comment karma • {verificationResult.accountAge || 0} days old
                </Typography>
              ) : (
                <Typography sx={{ fontSize: '11px', color: '#ef4444' }}>
                  ✗ {verificationResult.error || 'Invalid credentials'}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <Divider
          sx={{
            borderColor: 'divider',
            mb: 3,
          }}
        />

        {/* Persona Notes Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Persona Notes
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleRandomizePersona}
            disabled={isGenerating}
            startIcon={
              isGenerating ? (
                <CircularProgress
                  size={11}
                  sx={{
                    color: '#f97316',
                  }}
                />
              ) : (
                <SparklesIcon size={12} />
              )
            }
            sx={{
              fontSize: '11px',
              py: 0.3,
              px: 1.25,
              borderColor: 'rgba(249,115,22,0.35)',
              color: '#f97316',
              '&:hover': {
                borderColor: '#f97316',
                bgcolor: 'rgba(249,115,22,0.06)',
              },
              '&:disabled': {
                borderColor: 'divider',
                color: 'text.disabled',
              },
            }}
          >
            {isGenerating ? 'Generating...' : 'Randomize'}
          </Button>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mb: 3,
          }}
        >
          <TextField
            label="Persona Notes"
            value={personaNotes}
            onChange={(e) => setPersonaNotes(e.target.value)}
            fullWidth
            multiline
            rows={4}
            placeholder="Describe this persona's background, tone, and interests — or click Randomize to generate one."
            helperText="Used by AI to write replies that match this account's voice and background"
            sx={{
              ...inputSx,
              '& .MuiOutlinedInput-root': {
                ...inputSx['& .MuiOutlinedInput-root'],
                transition: 'all 0.2s ease',
                ...(isGenerating && {
                  opacity: 0.6,
                }),
              },
            }}
          />
          {personaNotes && !isGenerating && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                size="small"
                onClick={handleRandomizePersona}
                startIcon={<RefreshCwIcon size={11} />}
                sx={{
                  fontSize: '11px',
                  color: 'text.secondary',
                  py: 0.25,
                  '&:hover': {
                    color: '#f97316',
                    bgcolor: 'transparent',
                  },
                }}
              >
                Try another
              </Button>
            </Box>
          )}
        </Box>

        <Divider
          sx={{
            borderColor: 'divider',
            mb: 3,
          }}
        />

        <Typography
          sx={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 1.5,
          }}
        >
          Configuration
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <FormControl size="small" fullWidth sx={inputSx}>
            <InputLabel>Initial Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as Account['status'])}
              label="Initial Status"
            >
              <MenuItem value="warming">
                Farming — new account, building karma
              </MenuItem>
              <MenuItem value="active">Active — ready for outreach</MenuItem>
              <MenuItem value="cooldown">
                Cooldown — temporarily paused
              </MenuItem>
            </Select>
            <FormHelperText
              sx={{
                color: 'text.secondary',
                fontSize: '11px',
              }}
            >
              New accounts should typically start on Farming
            </FormHelperText>
          </FormControl>
          <TextField
            label="Max Posts Per Day"
            type="number"
            value={maxPostsPerDay}
            onChange={(e) => setMaxPostsPerDay(Number(e.target.value))}
            fullWidth
            size="small"
            inputProps={{
              min: 1,
              max: 10,
            }}
            helperText="Safety limit — the account won't post more than this per day"
            sx={inputSx}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'text.secondary',
              bgcolor: 'action.hover',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!username.trim() || !password.trim()}
          sx={{
            bgcolor: '#f97316',
            '&:hover': {
              bgcolor: '#ea6c0a',
            },
            '&:disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'text.disabled',
            },
          }}
        >
          Add Reddit Account
        </Button>
      </DialogActions>
    </Dialog>
  )
}
// ─── Account Card ─────────────────────────────────────────────────────────────
interface AccountCardProps {
  account: Account
  onView: (id: string) => void
}
function AccountCard({ account, onView }: AccountCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const status = statusConfig[account.status]
  const postRatio = account.postsToday / account.maxPostsPerDay
  const progressColor =
    postRatio >= 1 ? '#ef4444' : postRatio >= 0.5 ? '#f59e0b' : '#10b981'
  const ratio = getRatioHealth(
    account.organicPostsWeek,
    account.citationPostsWeek,
  )
  const hasWarning = postRatio >= 1 || account.noOrganicActivity || !ratio.ok
  const handleCopy = async () => {
    const success = await copyToClipboard(account.password)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: hasWarning
          ? '1px solid rgba(245, 158, 11, 0.3)'
          : '1px solid #334155',
        borderRadius: '12px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s ease',
        '&:hover': {
          borderColor: hasWarning ? 'rgba(245, 158, 11, 0.5)' : '#475569',
        },
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          '&:last-child': {
            pb: 2.5,
          },
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* ── Header Row: Avatar + Identity + Warning + Menu ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minWidth: 0,
            }}
          >
            {/* Reddit-branded avatar */}
            <Box
              sx={{
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: '#FF4500',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RedditIcon size={22} variant="white" />
              </Avatar>
            </Box>
            <Box
              sx={{
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 0.25,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'text.primary',
                    lineHeight: 1.2,
                  }}
                >
                  u/{account.username}
                </Typography>
                {hasWarning && (
                  <Tooltip
                    title={
                      postRatio >= 1
                        ? 'At max posts for today'
                        : 'No organic activity in 7+ days'
                    }
                    arrow
                  >
                    <AlertTriangleIcon size={13} color="#f59e0b" />
                  </Tooltip>
                )}
              </Box>
              {/* Password row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  mb: 0.4,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: 'text.disabled',
                    fontFamily: 'monospace',
                    letterSpacing: showPassword ? 'normal' : '0.08em',
                  }}
                >
                  {showPassword ? account.password : '••••••••••'}
                </Typography>
                <Tooltip
                  title={showPassword ? 'Hide password' : 'Reveal password'}
                  arrow
                  placement="top"
                >
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword((v) => !v)}
                    sx={{
                      p: 0.2,
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
                      p: 0.2,
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Chip
                  label={status.label}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '10px',
                    fontWeight: 600,
                    bgcolor: status.bg,
                    color: status.color,
                    border: `1px solid ${status.border}`,
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Menu */}
          <Box
            sx={{
              flexShrink: 0,
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{
                color: '#64748b',
                '&:hover': {
                  color: '#94a3b8',
                  bgcolor: '#0f172a',
                },
              }}
            >
              <MoreVerticalIcon size={16} />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              PaperProps={{
                sx: {
                  bgcolor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  minWidth: 140,
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  onView(account.id)
                  setMenuAnchor(null)
                }}
                sx={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  gap: 1.5,
                }}
              >
                <EditIcon size={14} /> Edit
              </MenuItem>
              <MenuItem
                onClick={() => setMenuAnchor(null)}
                sx={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  gap: 1.5,
                }}
              >
                <ActivityIcon size={14} /> Analyze
              </MenuItem>
              <MenuItem
                onClick={() => setMenuAnchor(null)}
                sx={{
                  fontSize: '13px',
                  color: '#ef4444',
                  gap: 1.5,
                }}
              >
                <Trash2Icon size={14} /> Delete
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* ── Stats Row: 3 equal columns ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 0,
            mb: 2,
            p: 1.5,
            bgcolor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #1e293b',
          }}
        >
          {[
            {
              label: 'Age',
              value: account.age,
            },
            {
              label: 'Post Karma',
              value: account.postKarma.toLocaleString(),
            },
            {
              label: 'Cmt Karma',
              value: account.commentKarma.toLocaleString(),
            },
          ].map((stat, i) => (
            <Box
              key={stat.label}
              sx={{
                textAlign: 'center',
                px: 1,
                borderLeft: i > 0 ? '1px solid #1e293b' : 'none',
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 0.25,
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'text.primary',
                }}
              >
                {stat.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ── Subreddits ── */}
        <Box
          sx={{
            mb: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: '10px',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 0.75,
            }}
          >
            Active Subreddits
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
            }}
          >
            {account.subreddits.slice(0, 4).map((sub) => (
              <Chip
                key={sub}
                label={sub}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '10px',
                  bgcolor: '#0f172a',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                }}
              />
            ))}
            {account.subreddits.length > 4 && (
              <Chip
                label={`+${account.subreddits.length - 4}`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '10px',
                  bgcolor: '#0f172a',
                  color: '#64748b',
                  border: '1px solid #334155',
                }}
              />
            )}
          </Box>
        </Box>

        {/* ── Safety Bar ── */}
        <Box
          sx={{
            mb: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 0.5,
            }}
          >
            <Typography
              sx={{
                fontSize: '11px',
                color: '#64748b',
              }}
            >
              Posts today
            </Typography>
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: progressColor,
              }}
            >
              {account.postsToday}/{account.maxPostsPerDay}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(postRatio * 100, 100)}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: '#0f172a',
              '& .MuiLinearProgress-bar': {
                bgcolor: progressColor,
                borderRadius: 2,
              },
            }}
          />
        </Box>

        {/* ── Organic / Citation Ratio ── */}
        <Box
          sx={{
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 0.5,
            }}
          >
            <Tooltip
              title="Target: 3 organic posts for every 1 citation-building post. Staying above this ratio protects account standing with Reddit."
              arrow
              placement="top"
            >
              <Typography
                sx={{
                  fontSize: '11px',
                  color: '#64748b',
                  cursor: 'help',
                  borderBottom: '1px dashed #475569',
                  display: 'inline',
                }}
              >
                Organic : Citation ratio
              </Typography>
            </Tooltip>
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: ratio.color,
              }}
            >
              {ratio.label}
            </Typography>
          </Box>
          {/* Bar shows citation % — green zone is left 25%, warning is 25-40%, danger is 40%+ */}
          <Box
            sx={{
              position: 'relative',
              height: 4,
              borderRadius: 2,
              bgcolor: '#0f172a',
              overflow: 'hidden',
            }}
          >
            {/* Target line at 25% */}
            <Box
              sx={{
                position: 'absolute',
                left: '25%',
                top: 0,
                bottom: 0,
                width: '1px',
                bgcolor: '#334155',
                zIndex: 1,
              }}
            />
            <Box
              sx={{
                height: '100%',
                width: `${Math.min(ratio.pct, 100)}%`,
                bgcolor: ratio.color,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 0.25,
            }}
          >
            <Typography
              sx={{
                fontSize: '9px',
                color: '#475569',
              }}
            >
              Organic
            </Typography>
            <Typography
              sx={{
                fontSize: '9px',
                color: '#475569',
              }}
            >
              ▲ 25% max citation
            </Typography>
            <Typography
              sx={{
                fontSize: '9px',
                color: '#475569',
              }}
            >
              Citation
            </Typography>
          </Box>
        </Box>

        {/* ── Last Activity ── */}
        <Typography
          sx={{
            fontSize: '11px',
            color: '#475569',
            mb: 2,
          }}
        >
          Last post: {account.lastActivity}
        </Typography>

        {/* ── Footer ── */}
        <Box
          sx={{
            borderTop: '1px solid #1e293b',
            pt: 1.5,
            mt: 'auto',
          }}
        >
          <Button
            size="small"
            startIcon={<EyeIcon size={13} />}
            onClick={() => onView(account.id)}
            sx={{
              color: '#f97316',
              fontSize: '12px',
              p: 0,
              '&:hover': {
                bgcolor: 'transparent',
                textDecoration: 'underline',
              },
            }}
          >
            View Details
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}
// ─── Accounts Page ────────────────────────────────────────────────────────────
interface AccountsProps {
  onViewAccount: (id: string) => void
}
export function Accounts({ onViewAccount }: AccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.map((a: {
          id: string; username: string; password: string | null; status: string;
          accountAgeDays: number | null; postKarma: number | null; commentKarma: number | null;
          activeSubreddits: string | null; lastPostAt: string | null;
          postsTodayCount: number; maxPostsPerDay: number; location: string | null;
          organicPostsWeek: number; citationPostsWeek: number;
          personalitySummary: string | null; writingStyleNotes: string | null; sampleComments: string | null;
          accountAssignments: { client: { id: string; name: string } }[];
        }) => {
          let subs: string[] = []
          if (a.activeSubreddits) {
            try { subs = JSON.parse(a.activeSubreddits).map((s: string) => `r/${s}`) } catch { subs = [] }
          }
          const ageDays = a.accountAgeDays || 0
          const years = Math.floor(ageDays / 365)
          const months = Math.floor((ageDays % 365) / 30)
          return {
            id: a.id,
            username: a.username,
            password: a.password || '',
            status: a.status as Account['status'],
            age: `${years}y ${months}m`,
            postKarma: a.postKarma || 0,
            commentKarma: a.commentKarma || 0,
            subreddits: subs,
            clients: a.accountAssignments.map((aa: { client: { name: string } }) => aa.client.name),
            postsToday: a.postsTodayCount,
            maxPostsPerDay: a.maxPostsPerDay,
            lastActivity: a.lastPostAt ? getTimeAgo(new Date(a.lastPostAt)) : 'Never',
            noOrganicActivity: a.organicPostsWeek === 0,
            location: a.location || '',
            organicPostsWeek: a.organicPostsWeek,
            citationPostsWeek: a.citationPostsWeek,
            personalitySummary: a.personalitySummary || '',
            writingStyleNotes: a.writingStyleNotes || '',
            sampleComments: a.sampleComments || '',
          }
        }))
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const totalAccounts = accounts.length
  const activeAccounts = accounts.filter((a) => a.status === 'active').length
  const warmingAccounts = accounts.filter((a) => a.status === 'warming').length
  const cooldownAccounts = accounts.filter(
    (a) => a.status === 'cooldown',
  ).length
  const handleAddAccount = async (
    data: Omit<
      Account,
      | 'id'
      | 'age'
      | 'postKarma'
      | 'commentKarma'
      | 'subreddits'
      | 'lastActivity'
      | 'noOrganicActivity'
    >,
  ) => {
    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          status: data.status,
          maxPostsPerDay: data.maxPostsPerDay,
          location: data.location || null,
          personaNotes: data.personaNotes || null,
          personalitySummary: data.personalitySummary || null,
          writingStyleNotes: data.writingStyleNotes || null,
          sampleComments: data.sampleComments || null,
        }),
      })
      fetchAccounts()
    } catch (err) {
      console.error('Failed to add account:', err)
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
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <RedditIcon size={28} variant="color" />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            Reddit Accounts
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PlusIcon size={16} />}
          onClick={() => setModalOpen(true)}
          sx={{
            bgcolor: '#f97316',
            '&:hover': {
              bgcolor: '#ea6c0a',
            },
          }}
        >
          Add new Reddit Account
        </Button>
      </Box>

      {/* Stats Pills */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Chip
          label={`${totalAccounts} Total`}
          sx={{
            bgcolor: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            fontWeight: 600,
          }}
        />
        <Chip
          label={`${activeAccounts} Active`}
          sx={{
            bgcolor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontWeight: 600,
          }}
        />
        <Chip
          label={`${warmingAccounts} Farming`}
          sx={{
            bgcolor: 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            fontWeight: 600,
          }}
        />
        <Chip
          label={`${cooldownAccounts} Cooldown`}
          sx={{
            bgcolor: 'rgba(245, 158, 11, 0.1)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontWeight: 600,
          }}
        />
      </Box>

      {/* Card Grid */}
      <Grid container spacing={2}>
        {accounts.map((account) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={account.id}>
            <AccountCard account={account} onView={onViewAccount} />
          </Grid>
        ))}
      </Grid>

      <AddAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddAccount}
      />
    </Box>
  )
}
// Helper: compute ratio health
function getRatioHealth(
  organic: number,
  citation: number,
): {
  color: string
  label: string
  pct: number
  ok: boolean
} {
  const total = organic + citation
  if (total === 0)
    return {
      color: '#64748b',
      label: 'No posts',
      pct: 0,
      ok: true,
    }
  const citationPct = citation / total
  if (citationPct <= 0.25)
    return {
      color: '#10b981',
      label: `${organic}:${citation} ✓`,
      pct: citationPct * 100,
      ok: true,
    }
  if (citationPct <= 0.4)
    return {
      color: '#f59e0b',
      label: `${organic}:${citation} ⚠`,
      pct: citationPct * 100,
      ok: false,
    }
  return {
    color: '#ef4444',
    label: `${organic}:${citation} ✗`,
    pct: citationPct * 100,
    ok: false,
  }
}
