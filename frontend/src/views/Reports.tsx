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
  CircularProgress,
  Alert,
  useTheme,
  Tooltip,
} from '@mui/material'
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  createdAt: string
}

export function Reports() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [opportunities, setOpportunities] = useState<ReportOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

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

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      const selectedClient = clients.find((c) => c.id === selectedClientId)
      const doc = new jsPDF()
      
      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 14
      const contentWidth = pageWidth - (margin * 2)
      
      // Header background
      doc.setFillColor(249, 115, 22)
      doc.rect(0, 0, pageWidth, 45, 'F')
      
      // Logo/Brand area
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('RedditPipe', margin, 20)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('by Growth Rocket AI Labs', margin, 28)
      
      // Report title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`${selectedClient?.name || 'Client'} - Opportunity Report`, margin, 38)
      
      // Report metadata
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, 55)
      doc.text(`Total Opportunities: ${opportunities.length}`, margin, 62)
      
      // Table data with full text (no truncation)
      const tableData = opportunities.map((opp) => [
        opp.threadTitle,
        opp.threadUrl,
        opp.subreddit,
        opp.aiScore ? (opp.aiScore * 100).toFixed(0) + '%' : 'N/A',
        opp.status.charAt(0).toUpperCase() + opp.status.slice(1),
        opp.aiScoreCommentary || 'N/A',
        opp.commentText || 'N/A',
        opp.citationAnchorText || 'None',
      ])

      autoTable(doc, {
        head: [['Thread Title', 'Thread URL', 'Subreddit', 'AI Score', 'Status', 'AI Commentary', 'Comment Text', 'Citations']],
        body: tableData,
        startY: 70,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          cellWidth: 'auto',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold' },
          1: { cellWidth: 'auto', textColor: [59, 130, 246] },
          2: { cellWidth: 25 },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 25 },
          5: { cellWidth: 'auto' },
          6: { cellWidth: 'auto' },
          7: { cellWidth: 'auto' },
        },
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 4,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        theme: 'grid',
        didParseCell: (data) => {
          // Make URLs clickable
          if (data.section === 'body' && data.column.index === 1) {
            const url = data.cell.raw
            if (url && typeof url === 'string' && url.startsWith('http')) {
              const cell = data.cell
              // Add link annotation to the cell
              const x = cell.x
              const y = cell.y
              const width = cell.width
              const height = cell.height
              doc.link(x, y, width, height, { url })
            }
          }
        },
      })

      // Footer with page numbers
      const pageCount = doc.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Page ${i} of ${pageCount} | RedditPipe by Growth Rocket AI Labs`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
      }

      doc.save(`${selectedClient?.name || 'report'}-opportunities.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
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
          <Button
            variant="outlined"
            startIcon={exporting === 'pdf' ? <CircularProgress size={16} /> : <FileTextIcon size={16} />}
            onClick={handleExportPDF}
            disabled={loading || opportunities.length === 0 || exporting !== null}
            sx={{
              borderColor: '#3b82f6',
              color: '#3b82f6',
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: 'rgba(59, 130, 246, 0.08)',
              },
              '&:disabled': {
                opacity: 0.5,
              },
            }}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* Client Selection */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          bgcolor: 'background.paper',
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
        }}
      >
        <FormControl fullWidth size="small">
          <InputLabel>Select Client</InputLabel>
          <Select
            value={selectedClientId}
            label="Select Client"
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={clients.length === 0}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: borderColor,
                },
                '&:hover fieldset': {
                  borderColor: 'text.secondary',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#f97316',
                },
              },
            }}
          >
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

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
                    <TableCell sx={{ minWidth: 250 }}>
                      <Tooltip title={opp.aiScoreCommentary || 'N/A'}>
                        <Typography
                          sx={{
                            fontSize: '12px',
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 250,
                          }}
                        >
                          {opp.aiScoreCommentary || 'N/A'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Tooltip title={opp.commentText || 'N/A'}>
                        <Typography
                          sx={{
                            fontSize: '12px',
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                          }}
                        >
                          {opp.commentText || 'N/A'}
                        </Typography>
                      </Tooltip>
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
