import React, { useState } from 'react'
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
  const [redditClientId, setRedditClientId] = useState('')
  const [redditClientSecret, setRedditClientSecret] = useState('')
  const [redditUsername, setRedditUsername] = useState('')
  const [redditPassword, setRedditPassword] = useState('')
  const [redditStatus, setRedditStatus] = useState<ConnectionStatus>('idle')
  // Planka
  const [plankaUrl, setPlankaUrl] = useState('')
  const [plankaToken, setPlankaToken] = useState('')
  const [plankaBoardId, setPlankaBoardId] = useState('')
  const [plankaListId, setPlankaListId] = useState('')
  const [plankaStatus, setPlankaStatus] = useState<ConnectionStatus>('idle')
  // AI
  const [anthropicKey, setAnthropicKey] = useState('')
  const [aiStatus, setAiStatus] = useState<ConnectionStatus>('idle')
  // Search
  const [searchFrequency, setSearchFrequency] = useState('daily')
  const [maxResults, setMaxResults] = useState(10)
  const [maxAge, setMaxAge] = useState(2)
  const [showRunConfirm, setShowRunConfirm] = useState(false)
  const [saved, setSaved] = useState(false)
  const simulateTest = (setter: (s: ConnectionStatus) => void) => {
    setter('testing')
    setTimeout(() => {
      setter(Math.random() > 0.3 ? 'success' : 'error')
    }, 1500)
  }
  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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
            onTest={() => simulateTest(setRedditStatus)}
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
        </Box>
      </SectionCard>

      {/* Planka Integration */}
      <SectionCard title="Planka Integration">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <TextField
            label="Planka URL"
            value={plankaUrl}
            onChange={(e) => setPlankaUrl(e.target.value)}
            fullWidth
            size="small"
            placeholder="https://planka.example.com"
            sx={inputSx}
          />
          <PasswordField
            label="API Token"
            value={plankaToken}
            onChange={setPlankaToken}
          />
          <TextField
            label="Board ID"
            value={plankaBoardId}
            onChange={(e) => setPlankaBoardId(e.target.value)}
            fullWidth
            size="small"
            sx={inputSx}
          />
          <TextField
            label="Target List ID"
            value={plankaListId}
            onChange={(e) => setPlankaListId(e.target.value)}
            fullWidth
            size="small"
            helperText="Cards will be created in this list"
            sx={{
              ...inputSx,
              '& .MuiFormHelperText-root': {
                color: '#64748b',
                fontSize: '11px',
              },
            }}
          />
          <ConnectionTestButton
            onTest={() => simulateTest(setPlankaStatus)}
            status={plankaStatus}
          />
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
            onTest={() => simulateTest(setAiStatus)}
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
              onClick={() => {
                if (!showRunConfirm) {
                  setShowRunConfirm(true)
                  setTimeout(() => setShowRunConfirm(false), 3000)
                } else {
                  setShowRunConfirm(false)
                }
              }}
              sx={{
                bgcolor: showRunConfirm ? '#f59e0b' : '#f97316',
                '&:hover': {
                  bgcolor: showRunConfirm ? '#d97706' : '#ea6c0a',
                },
                py: 1.25,
                fontSize: '14px',
              }}
            >
              {showRunConfirm ? 'Click again to confirm' : 'Run Search Now'}
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
