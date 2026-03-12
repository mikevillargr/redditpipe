import React, { useEffect, useState } from 'react'
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  useTheme,
  Tooltip,
  TextField,
} from '@mui/material'
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  ExternalLinkIcon,
  Building2Icon,
  CalendarIcon,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

interface Client {
  id: string
  name: string
  websiteUrl: string
  keywords: string
  description: string
  status: string
}

interface ReportOpportunity {
  id: string
  threadTitle: string
  threadUrl: string
  heuristicScore: number | null
  aiScore: number | null
  aiScoreCommentary: string | null
  aiScoreFactors: {
    subredditRelevance?: number
    topicMatch?: number
    intent?: number
    naturalFit?: number
  } | null
  status: string
  commentText: string | null
  citationAnchorText: string | null
  commentPermalink: string | null
  subreddit: string
  threadCreatedAt: string | null
  publishedAt: string | null
  deletedAt: string | null
  createdAt: string
}

export function Reports() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [allOpportunities, setAllOpportunities] = useState<ReportOpportunity[]>([])
  const [opportunities, setOpportunities] = useState<ReportOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'excel' | null>(null)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedRows, setExpandedRows] = useState<Record<string, { commentary: boolean; comment: boolean }>>({})

  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const rowBorder = isDark ? '#1e293b' : '#f1f5f9'

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data)
        if (data.length > 0 && !selectedClientId) {
          setSelectedClientId(data[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  useEffect(() => {
    if (selectedClientId) {
      fetchReportData(selectedClientId)
    }
  }, [selectedClientId])

  const fetchReportData = async (clientId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/clients/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setAllOpportunities(data.opportunities)
        setOpportunities(data.opportunities)
      } else {
        setError('Failed to load report data')
      }
    } catch (err) {
      setError('Network error loading report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Filter opportunities based on date range and status
    let filtered = allOpportunities
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((opp) => opp.status === statusFilter)
    }
    
    if (startDate || endDate) {
      filtered = filtered.filter((opp) => {
        const oppDate = new Date(opp.createdAt)
        if (startDate && oppDate < startDate) return false
        if (endDate && oppDate > endDate) return false
        return true
      })
    }
    
    setOpportunities(filtered)
  }, [startDate, endDate, statusFilter, allOpportunities])

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const selectedClient = clients.find((c) => c.id === selectedClientId)
      const exportData = opportunities.map((opp) => ({
        'Thread Title': opp.threadTitle,
        'Thread URL': opp.threadUrl,
        'Subreddit': opp.subreddit,
        'Heuristic Score': opp.heuristicScore ?? 'N/A',
        'AI Score': opp.aiScore ?? 'N/A',
        'Status': opp.status,
        'AI Commentary': opp.aiScoreCommentary ?? 'N/A',
        'Comment Text': opp.commentText ?? 'N/A',
        'Citation Anchor Text': opp.citationAnchorText ?? 'N/A',
        'Comment Permalink': opp.commentPermalink ?? 'N/A',
        'Discovered': new Date(opp.createdAt).toLocaleDateString(),
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      XLSX.writeFile(wb, `${selectedClient?.name || 'report'}-opportunities.xlsx`)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExporting(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' }
      case 'published':
        return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' }
      case 'verified':
        return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' }
      case 'unverified':
        return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' }
      case 'dismissed':
        return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' }
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' }
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

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
          Reports
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={exporting === 'excel' ? <CircularProgress size={16} /> : <FileSpreadsheetIcon size={16} />}
            onClick={handleExportExcel}
            disabled={loading || opportunities.length === 0 || exporting !== null}
            sx={{
              borderColor: '#10b981',
              color: '#10b981',
              '&:hover': {
                borderColor: '#059669',
                bgcolor: 'rgba(16, 185, 129, 0.08)',
              },
              '&:disabled': {
                opacity: 0.5,
              },
            }}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          mb: 3,
          bgcolor: 'background.paper',
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Building2Icon size={13} color="#64748b" />
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Client:
            </Typography>
          </Box>
          <Select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            size="small"
            disabled={clients.length === 0}
            sx={{
              minWidth: 180,
              fontSize: '13px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: borderColor },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#475569' : '#cbd5e1' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f97316' },
            }}
          >
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
              </MenuItem>
            ))}
          </Select>
          
          <Box sx={{ width: '1px', height: 20, bgcolor: borderColor, mx: 0.5 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Status:
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, val) => val && setStatusFilter(val)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 1.5,
                py: 0.75,
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'capitalize',
                border: `1px solid ${borderColor}`,
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
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="new">New</ToggleButton>
            <ToggleButton value="published">Published</ToggleButton>
            <ToggleButton value="unverified">Unverified</ToggleButton>
            <ToggleButton value="deleted_by_mod">Deleted</ToggleButton>
          </ToggleButtonGroup>
          
          <Box sx={{ width: '1px', height: 20, bgcolor: borderColor, mx: 0.5 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CalendarIcon size={13} color="#64748b" />
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Date:
            </Typography>
          </Box>
          <TextField
            type="date"
            size="small"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
            inputProps={{ max: endDate ? endDate.toISOString().split('T')[0] : undefined }}
            sx={{
              width: 140,
              '& .MuiOutlinedInput-root': {
                fontSize: '12px',
                '& fieldset': { borderColor: borderColor },
                '&:hover fieldset': { borderColor: isDark ? '#475569' : '#cbd5e1' },
                '&.Mui-focused fieldset': { borderColor: '#f97316' },
              },
              '& input': { py: 0.75, px: 1.25 },
              '& input::-webkit-calendar-picker-indicator': { filter: isDark ? 'invert(0.5)' : 'none', cursor: 'pointer' },
            }}
          />
          <Typography sx={{ fontSize: '12px', color: 'text.disabled', mx: -0.5 }}>–</Typography>
          <TextField
            type="date"
            size="small"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
            inputProps={{ min: startDate ? startDate.toISOString().split('T')[0] : undefined }}
            sx={{
              width: 140,
              '& .MuiOutlinedInput-root': {
                fontSize: '12px',
                '& fieldset': { borderColor: borderColor },
                '&:hover fieldset': { borderColor: isDark ? '#475569' : '#cbd5e1' },
                '&.Mui-focused fieldset': { borderColor: '#f97316' },
              },
              '& input': { py: 0.75, px: 1.25 },
              '& input::-webkit-calendar-picker-indicator': { filter: isDark ? 'invert(0.5)' : 'none', cursor: 'pointer' },
            }}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : opportunities.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No opportunities found for this client
        </Alert>
      ) : (
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
                  'Thread Title',
                  'Scores',
                  'Status',
                  'Deleted',
                  'AI Commentary',
                  'Comment',
                  'Citations',
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
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {opportunities.map((opp, idx) => {
                const statusColor = getStatusColor(opp.status)
                const expandedCommentary = expandedRows[opp.id]?.commentary || false
                const expandedComment = expandedRows[opp.id]?.comment || false
                
                const commentaryText = opp.aiScoreCommentary || 'N/A'
                const commentText = opp.commentText || 'N/A'
                const commentaryTruncated = commentaryText.length > 150
                const commentTruncated = commentText.length > 200
                
                const toggleCommentary = () => {
                  setExpandedRows(prev => ({
                    ...prev,
                    [opp.id]: { ...prev[opp.id], commentary: !expandedCommentary }
                  }))
                }
                
                const toggleComment = () => {
                  setExpandedRows(prev => ({
                    ...prev,
                    [opp.id]: { ...prev[opp.id], comment: !expandedComment }
                  }))
                }
                
                return (
                  <TableRow
                    key={opp.id}
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
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box>
                        <Tooltip title={opp.threadTitle}>
                          <Typography
                            sx={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'text.primary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 250,
                            }}
                          >
                            {opp.threadTitle}
                          </Typography>
                        </Tooltip>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                            r/{opp.subreddit}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 0.25 }}>
                          Heuristic: {opp.heuristicScore ? (opp.heuristicScore * 100).toFixed(0) + '%' : 'N/A'}
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                          AI: {opp.aiScore ? (opp.aiScore * 100).toFixed(0) + '%' : 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={opp.status}
                        size="small"
                        sx={{
                          fontSize: '11px',
                          height: 22,
                          bgcolor: statusColor.bg,
                          color: statusColor.color,
                          border: `1px solid ${statusColor.border}`,
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {opp.deletedAt ? (
                        <Box>
                          <Typography sx={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                            Yes
                          </Typography>
                          <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>
                            {new Date(opp.deletedAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          No
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 250, maxWidth: 350 }}>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: '12px',
                            color: 'text.secondary',
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: expandedCommentary ? 'unset' : 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {commentaryText}
                        </Typography>
                        {commentaryTruncated && (
                          <Button
                            size="small"
                            onClick={toggleCommentary}
                            sx={{
                              fontSize: '11px',
                              textTransform: 'none',
                              minWidth: 'auto',
                              p: 0,
                              mt: 0.5,
                              color: '#3b82f6',
                              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                            }}
                          >
                            {expandedCommentary ? 'Show less' : 'Show more'}
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: 200, maxWidth: 400 }}>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: '12px',
                            color: 'text.secondary',
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: expandedComment ? 'unset' : 4,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {commentText}
                        </Typography>
                        {commentTruncated && (
                          <Button
                            size="small"
                            onClick={toggleComment}
                            sx={{
                              fontSize: '11px',
                              textTransform: 'none',
                              minWidth: 'auto',
                              p: 0,
                              mt: 0.5,
                              color: '#3b82f6',
                              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                            }}
                          >
                            {expandedComment ? 'Show less' : 'Show more'}
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      {opp.citationAnchorText ? (
                        <Tooltip title={opp.citationAnchorText}>
                          <Typography
                            sx={{
                              fontSize: '11px',
                              color: '#3b82f6',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 150,
                            }}
                          >
                            {opp.citationAnchorText}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography sx={{ fontSize: '11px', color: 'text.disabled' }}>
                          None
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {opp.threadUrl && (
                        <Button
                          size="small"
                          href={opp.threadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          startIcon={<ExternalLinkIcon size={12} />}
                          sx={{
                            fontSize: '11px',
                            color: '#3b82f6',
                            '&:hover': {
                              bgcolor: 'rgba(59, 130, 246, 0.08)',
                            },
                          }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
