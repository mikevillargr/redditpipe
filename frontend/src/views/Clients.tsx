import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material'
import {
  PlusIcon,
  EditIcon,
  Trash2Icon,
  ExternalLinkIcon,
  UploadIcon,
  XIcon,
  WandIcon,
} from 'lucide-react'
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
type KeywordMode = 'comma' | 'lines' | 'csv'
interface ClientModalProps {
  open: boolean
  client: Client | null
  onClose: () => void
  onSave: (client: Omit<Client, 'id' | 'opportunities'>) => void
}
function ClientModal({ open, client, onClose, onSave }: ClientModalProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [name, setName] = useState(client?.name ?? '')
  const [website, setWebsite] = useState(client?.website ?? '')
  const [description, setDescription] = useState(client?.description ?? '')
  const [keywordMode, setKeywordMode] = useState<KeywordMode>('comma')
  const [keywords, setKeywords] = useState(client?.keywords.join(', ') ?? '')
  const [mentionTerms, setMentionTerms] = useState(
    client?.mentionTerms?.join(', ') ?? '',
  )
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [nuance, setNuance] = useState(client?.nuance ?? '')
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)
  const [detectProgress, setDetectProgress] = useState<string>('')
  const [detectStartTime, setDetectStartTime] = useState<number>(0)
  const [detectSuccess, setDetectSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) {
      setName(client?.name ?? '')
      setWebsite(client?.website ?? '')
      setDescription(client?.description ?? '')
      setKeywords(client?.keywords.join(', ') ?? '')
      setMentionTerms(client?.mentionTerms?.join(', ') ?? '')
      setNuance(client?.nuance ?? '')
      setKeywordMode('comma')
      setCsvFileName(null)
      setDetectError(null)
      setDetectProgress('')
      setDetectSuccess(null)
    }
  }, [open, client])
  const handleAutoDetect = async () => {
    if (!website.trim()) return
    setDetecting(true)
    setDetectError(null)
    setDetectProgress('Fetching homepage...')
    setDetectSuccess(null)
    const startTime = Date.now()
    setDetectStartTime(startTime)
    
    // Progress updater
    const progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      if (elapsed < 10) {
        setDetectProgress(`Fetching homepage... ${elapsed}s`)
      } else if (elapsed < 20) {
        setDetectProgress(`Crawling sub-pages... ${elapsed}s`)
      } else if (elapsed < 40) {
        setDetectProgress(`Analyzing business model... ${elapsed}s`)
      } else if (elapsed < 70) {
        setDetectProgress(`Generating search queries... ${elapsed}s`)
      } else {
        setDetectProgress(`Finalizing keywords... ${elapsed}s`)
      }
    }, 1000)
    
    try {
      const res = await fetch('/api/clients/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website.trim() }),
      })
      const data = await res.json()
      clearInterval(progressInterval)
      
      if (!res.ok) {
        setDetectError(data.error || 'Detection failed')
        setDetectProgress('')
        return
      }
      
      const keywordCount = data.keywords?.length || 0
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setDetectSuccess(`✓ Generated ${keywordCount} keywords in ${elapsed}s`)
      setDetectProgress('')
      
      if (data.name && !name) setName(data.name)
      if (data.description) setDescription(data.description)
      if (data.keywords?.length) {
        setKeywords(data.keywords.join(', '))
        setKeywordMode('comma')
      }
      if (data.mentionTerms?.length) setMentionTerms(data.mentionTerms.join(', '))
      if (data.nuance) setNuance(data.nuance)
    } catch (err) {
      clearInterval(progressInterval)
      setDetectError(err instanceof Error ? err.message : 'Network error')
      setDetectProgress('')
    } finally {
      setDetecting(false)
    }
  }
  const parseKeywords = (): string[] => {
    if (keywordMode === 'lines') {
      return keywords
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean)
    }
    return keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  }
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = text
        .split(/[\n\r]+/)
        .flatMap((line) => line.split(','))
        .map((k) => k.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean)
      setKeywords(parsed.join(', '))
      setKeywordMode('comma')
    }
    reader.readAsText(file)
    e.target.value = ''
  }
  const handleSave = () => {
    onSave({
      name,
      website,
      description,
      keywords: parseKeywords(),
      mentionTerms: mentionTerms
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      nuance: nuance.trim(),
      active: client?.active ?? true,
    })
    onClose()
  }
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'divider',
      },
      '&:hover fieldset': {
        borderColor: 'text.secondary',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#f97316',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'text.secondary',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#f97316',
    },
    '& .MuiOutlinedInput-input': {
      color: 'text.primary',
    },
    '& .MuiInputBase-inputMultiline': {
      color: 'text.primary',
    },
  }
  const parsedPreview = parseKeywords()
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
          pb: 1,
          fontSize: '17px',
        }}
      >
        {client ? 'Edit Client' : 'Add Client'}
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          pt: '16px !important',
        }}
      >
        <TextField
          label="Client Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
          sx={inputSx}
        />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            label="Website URL"
            value={website}
            onChange={(e) => { setWebsite(e.target.value); setDetectError(null) }}
            fullWidth
            size="small"
            placeholder="example.com"
            sx={inputSx}
          />
          <Button
            variant="outlined"
            size="small"
            disabled={!website.trim() || detecting}
            onClick={handleAutoDetect}
            startIcon={detecting ? <CircularProgress size={14} /> : <WandIcon size={14} />}
            sx={{
              minWidth: 120,
              mt: '1px',
              py: '7px',
              fontSize: '12px',
              borderColor: '#f97316',
              color: '#f97316',
              flexShrink: 0,
              '&:hover': { bgcolor: 'rgba(249,115,22,0.08)', borderColor: '#ea6c0a' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {detecting ? 'Detecting...' : 'Auto Detect'}
          </Button>
        </Box>
        {detectProgress && (
          <Alert severity="info" sx={{ py: 0.5, fontSize: '12px' }}>
            {detectProgress}
          </Alert>
        )}
        {detectSuccess && (
          <Alert severity="success" sx={{ py: 0.5, fontSize: '12px' }}>
            {detectSuccess}
          </Alert>
        )}
        {detectError && (
          <Alert severity="error" sx={{ py: 0.25, fontSize: '12px' }}>
            {detectError}
          </Alert>
        )}
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Describe what this client does. Used as context for AI-generated replies..."
          sx={inputSx}
        />

        {/* Keywords Section */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              Keywords
            </Typography>
            <ToggleButtonGroup
              value={keywordMode}
              exclusive
              onChange={(_, val) => val && setKeywordMode(val)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  color: 'text.secondary',
                  fontSize: '11px',
                  px: 1.25,
                  py: 0.3,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(249,115,22,0.1)',
                    color: '#f97316',
                    borderColor: 'rgba(249,115,22,0.4)',
                  },
                  '&:hover': {
                    bgcolor: isDark ? '#1e293b' : '#f8fafc',
                  },
                },
              }}
            >
              <ToggleButton value="comma">Comma-separated</ToggleButton>
              <ToggleButton value="lines">One per line</ToggleButton>
              <ToggleButton value="csv">CSV upload</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {keywordMode === 'csv' ? (
            <Box>
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: `2px dashed ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  bgcolor: isDark ? '#0f172a' : '#f8fafc',
                  '&:hover': {
                    borderColor: '#f97316',
                    bgcolor: 'rgba(249,115,22,0.04)',
                  },
                }}
              >
                <UploadIcon
                  size={20}
                  color="#64748b"
                  style={{
                    marginBottom: 8,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '13px',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  {csvFileName ? csvFileName : 'Click to upload a CSV file'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: 'text.disabled',
                  }}
                >
                  One keyword per row, or comma-separated values
                </Typography>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                style={{
                  display: 'none',
                }}
                onChange={handleCsvUpload}
              />
              {csvFileName && parsedPreview.length > 0 && (
                <Box
                  sx={{
                    mt: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: 'text.secondary',
                      mb: 0.75,
                    }}
                  >
                    {parsedPreview.length} keywords imported — switching to
                    comma-separated for editing
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <TextField
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              fullWidth
              multiline
              rows={keywordMode === 'lines' ? 4 : 2}
              placeholder={
                keywordMode === 'lines'
                  ? 'Enter one keyword per line:\npersonal injury lawyer\ncar accident attorney\nwrongful death'
                  : 'Enter comma-separated keywords, e.g., personal injury lawyer, car accident attorney'
              }
              sx={inputSx}
            />
          )}

          {parsedPreview.length > 0 && keywordMode !== 'csv' && (
            <Box
              sx={{
                mt: 1,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              {parsedPreview.slice(0, 8).map((kw, i) => (
                <Chip
                  key={i}
                  label={kw}
                  size="small"
                  onDelete={() => {
                    const updated = parsedPreview.filter((_, idx) => idx !== i)
                    setKeywords(
                      keywordMode === 'lines'
                        ? updated.join('\n')
                        : updated.join(', '),
                    )
                  }}
                  deleteIcon={<XIcon size={10} />}
                  sx={{
                    fontSize: '11px',
                    height: 22,
                    bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                    color: 'text.secondary',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    '& .MuiChip-deleteIcon': {
                      color: 'text.disabled',
                      '&:hover': {
                        color: '#ef4444',
                      },
                    },
                  }}
                />
              ))}
              {parsedPreview.length > 8 && (
                <Chip
                  label={`+${parsedPreview.length - 8} more`}
                  size="small"
                  sx={{
                    fontSize: '11px',
                    height: 22,
                    bgcolor: 'transparent',
                    color: 'text.disabled',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Mention Terms */}
        <Box>
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            Mention Terms
          </Typography>
          <Typography
            sx={{
              fontSize: '11px',
              color: 'text.secondary',
              mb: 1,
              lineHeight: 1.5,
            }}
          >
            Brand names, URLs, or phrases the AI will naturally weave into
            replies — e.g. a brand name, your website, or a CTA like "free
            consultation". These act as soft anchor text in organic mentions.
          </Typography>
          <TextField
            value={mentionTerms}
            onChange={(e) => setMentionTerms(e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. Harmon Law Group, harmonlaw.com, free consultation"
            helperText="Comma-separated. The AI will pick the most contextually appropriate term per reply."
            sx={inputSx}
          />
          {mentionTerms.trim() && (
            <Box
              sx={{
                mt: 1,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              {mentionTerms
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .map((term, i) => (
                  <Chip
                    key={i}
                    label={term}
                    size="small"
                    sx={{
                      fontSize: '11px',
                      height: 22,
                      bgcolor: 'rgba(59,130,246,0.08)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59,130,246,0.2)',
                    }}
                  />
                ))}
            </Box>
          )}
        </Box>

        {/* Nuance / Special Instructions */}
        <Box>
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            Nuance
          </Typography>
          <Typography
            sx={{
              fontSize: '11px',
              color: 'text.secondary',
              mb: 1,
              lineHeight: 1.5,
            }}
          >
            Special filtering instructions passed to the AI scorer — e.g.
            geographic focus, target audience, industries to prioritize or
            avoid.
          </Typography>
          <TextField
            value={nuance}
            onChange={(e) => setNuance(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder='e.g. "US-only, focus on small businesses, avoid enterprise/B2B threads"'
            sx={inputSx}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
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
          disabled={!name.trim()}
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
          {client ? 'Save Changes' : 'Add Client'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
export function Clients() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [clients, setClients] = useState<Client[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: { id: string; name: string; websiteUrl: string; keywords: string; mentionTerms: string | null; nuance: string | null; status: string; _count: { opportunities: number }; description: string }) => ({
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
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleAdd = () => {
    setEditingClient(null)
    setModalOpen(true)
  }
  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setModalOpen(true)
  }
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      fetchClients()
    } catch (err) {
      console.error('Failed to delete client:', err)
    }
  }
  const handleToggleActive = async (id: string) => {
    const client = clients.find((c) => c.id === id)
    if (!client) return
    try {
      await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: client.active ? 'paused' : 'active' }),
      })
      fetchClients()
    } catch (err) {
      console.error('Failed to toggle client:', err)
    }
  }
  const handleSave = async (data: Omit<Client, 'id' | 'opportunities'>) => {
    try {
      if (editingClient) {
        await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            websiteUrl: data.website,
            description: data.description,
            keywords: data.keywords,
            mentionTerms: data.mentionTerms,
            nuance: data.nuance || null,
            status: data.active ? 'active' : 'paused',
          }),
        })
      } else {
        await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            websiteUrl: data.website,
            description: data.description,
            keywords: data.keywords,
            mentionTerms: data.mentionTerms,
            nuance: data.nuance || null,
          }),
        })
      }
      fetchClients()
    } catch (err) {
      console.error('Failed to save client:', err)
    }
  }
  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const rowBorder = isDark ? '#1e293b' : '#f1f5f9'
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
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            fontSize: '20px',
          }}
        >
          Clients
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlusIcon size={16} />}
          onClick={handleAdd}
          sx={{
            bgcolor: '#f97316',
            '&:hover': {
              bgcolor: '#ea6c0a',
            },
          }}
        >
          Add Client
        </Button>
      </Box>

      {/* Mobile card list */}
      <Box
        sx={{
          display: {
            xs: 'flex',
            md: 'none',
          },
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {clients.map((client) => (
          <Paper
            key={client.id}
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              border: `1px solid ${borderColor}`,
              borderRadius: '10px',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  {client.name}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: 0.25,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: '#3b82f6',
                    }}
                  >
                    {client.website}
                  </Typography>
                  <ExternalLinkIcon size={10} color="#3b82f6" />
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Chip
                  label={client.opportunities}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(249,115,22,0.1)',
                    color: '#f97316',
                    fontWeight: 700,
                    fontSize: '12px',
                    border: '1px solid rgba(249,115,22,0.2)',
                  }}
                />
                <Switch
                  checked={client.active}
                  onChange={() => handleToggleActive(client.id)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#10b981',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: '#10b981',
                    },
                  }}
                />
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                mb: 1.5,
              }}
            >
              {client.keywords.slice(0, 3).map((kw) => (
                <Chip
                  key={kw}
                  label={kw}
                  size="small"
                  sx={{
                    fontSize: '11px',
                    height: 20,
                    bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                    color: 'text.secondary',
                    border: `1px solid ${borderColor}`,
                  }}
                />
              ))}
              {client.keywords.length > 3 && (
                <Chip
                  label={`+${client.keywords.length - 3}`}
                  size="small"
                  sx={{
                    fontSize: '11px',
                    height: 20,
                    bgcolor: 'transparent',
                    color: 'text.disabled',
                    border: `1px solid ${borderColor}`,
                  }}
                />
              )}
            </Box>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                borderTop: `1px solid ${rowBorder}`,
                pt: 1,
              }}
            >
              <Button
                size="small"
                startIcon={<EditIcon size={13} />}
                onClick={() => handleEdit(client)}
                sx={{
                  color: 'text.secondary',
                  fontSize: '12px',
                }}
              >
                Edit
              </Button>
              <Button
                size="small"
                startIcon={<Trash2Icon size={13} />}
                onClick={() => handleDelete(client.id)}
                sx={{
                  color: '#ef4444',
                  fontSize: '12px',
                }}
              >
                Delete
              </Button>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Desktop table */}
      <Box
        sx={{
          display: {
            xs: 'none',
            md: 'block',
          },
        }}
      >
        <TableContainer
          component={Paper}
          sx={{
            bgcolor: 'background.paper',
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            overflowX: 'auto',
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    borderBottom: `1px solid ${borderColor}`,
                  },
                }}
              >
                {[
                  'Name',
                  'Website',
                  'Keywords',
                  'Status',
                  'Opportunities',
                  'Actions',
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      color: 'text.secondary',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client, idx) => (
                <TableRow
                  key={client.id}
                  sx={{
                    bgcolor:
                      idx % 2 === 0
                        ? 'transparent'
                        : isDark
                          ? 'rgba(255,255,255,0.01)'
                          : 'rgba(0,0,0,0.01)',
                    '&:hover': {
                      bgcolor: 'rgba(249, 115, 22, 0.04)',
                    },
                    '& td': {
                      borderBottom: `1px solid ${rowBorder}`,
                    },
                    '&:last-child td': {
                      borderBottom: 'none',
                    },
                  }}
                >
                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'text.primary',
                      }}
                    >
                      {client.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '13px',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {client.website}
                      </Typography>
                      <ExternalLinkIcon size={11} color="#3b82f6" />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                      }}
                    >
                      {client.keywords.slice(0, 3).map((kw) => (
                        <Chip
                          key={kw}
                          label={kw}
                          size="small"
                          sx={{
                            fontSize: '11px',
                            height: 20,
                            bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                            color: 'text.secondary',
                            border: `1px solid ${borderColor}`,
                          }}
                        />
                      ))}
                      {client.keywords.length > 3 && (
                        <Tooltip
                          title={client.keywords.slice(3).join(', ')}
                          arrow
                        >
                          <Chip
                            label={`+${client.keywords.length - 3} more`}
                            size="small"
                            sx={{
                              fontSize: '11px',
                              height: 20,
                              bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                              color: 'text.disabled',
                              border: `1px solid ${borderColor}`,
                              cursor: 'pointer',
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Switch
                        checked={client.active}
                        onChange={() => handleToggleActive(client.id)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#10b981',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                            {
                              bgcolor: '#10b981',
                            },
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '12px',
                          color: client.active ? '#10b981' : 'text.secondary',
                        }}
                      >
                        {client.active ? 'Active' : 'Paused'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={client.opportunities}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(249, 115, 22, 0.1)',
                        color: '#f97316',
                        fontWeight: 700,
                        fontSize: '12px',
                        border: '1px solid rgba(249, 115, 22, 0.2)',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                      }}
                    >
                      <Tooltip title="Edit" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(client)}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': {
                              color: 'text.primary',
                              bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                            },
                          }}
                        >
                          <EditIcon size={15} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(client.id)}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': {
                              color: '#ef4444',
                              bgcolor: 'rgba(239,68,68,0.08)',
                            },
                          }}
                        >
                          <Trash2Icon size={15} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <ClientModal
        open={modalOpen}
        client={editingClient}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </Box>
  )
}
