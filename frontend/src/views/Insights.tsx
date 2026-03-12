import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
  CircularProgress,
  useTheme,
  Tabs,
  Tab,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  BarChart3Icon,
  RefreshCwIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  XCircleIcon,
  TrendingDownIcon,
  CheckCircleIcon,
  ZapIcon,
  TrashIcon,
  AlertCircleIcon,
  ClockIcon,
} from 'lucide-react'

interface DismissalPattern {
  pattern: string
  count: number
  examples: string[]
}

interface DismissalAnalysis {
  totalDismissed: number
  patterns: DismissalPattern[]
  summary: string
  recommendations: string[]
}

interface DeletionInsights {
  totalDeletions: number
  reasonBreakdown: Record<string, number>
  subredditStats: Record<string, { count: number; avgConfidence: number; reasons: string[] }>
  topRecommendations: { recommendation: string; frequency: number }[]
  avgHoursToDelete: number
  recentAnalyses: Array<{
    id: string
    subreddit: string
    reason: string
    confidence: number
    hoursUntilDeletion: number
    createdAt: string
    clientName: string
  }>
}

export function Insights() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [activeTab, setActiveTab] = useState(0)
  const [analysis, setAnalysis] = useState<DismissalAnalysis | null>(null)
  const [deletionInsights, setDeletionInsights] = useState<DeletionInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingDeletions, setLoadingDeletions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set())
  const [selectedDeletionRecs, setSelectedDeletionRecs] = useState<Set<number>>(new Set())
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/opportunities/dismissals')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDeletionInsights = useCallback(async () => {
    setLoadingDeletions(true)
    try {
      const res = await fetch('/api/deletion-analysis/insights')
      if (res.ok) {
        const data = await res.json()
        setDeletionInsights(data)
      }
    } catch (err) {
      console.error('Failed to fetch deletion insights:', err)
    } finally {
      setLoadingDeletions(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalysis()
    fetchDeletionInsights()
  }, [fetchAnalysis, fetchDeletionInsights])

  const applyToSearchContext = async (text: string, key: string) => {
    try {
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settings = await settingsRes.json()

      const current = settings.aiSearchContext || ''
      const separator = current.trim() ? '\n' : ''
      const updated = current.trim() + separator + text

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSearchContext: updated }),
      })
      setAppliedItems((prev) => new Set(prev).add(key))
      setSnackbar({ open: true, message: 'Applied to AI search context' })
    } catch {
      setSnackbar({ open: true, message: 'Failed to apply' })
    }
  }

  const applyAllRecommendations = async () => {
    if (!analysis || analysis.recommendations.length === 0) return
    try {
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settings = await settingsRes.json()

      const current = settings.aiSearchContext || ''
      const newRules = analysis.recommendations
        .filter((_, i) => !appliedItems.has(`rec-${i}`))
        .map((r) => `- ${r}`)
        .join('\n')
      if (!newRules) return

      const separator = current.trim() ? '\n\nINSIGHTS-BASED RULES:\n' : 'INSIGHTS-BASED RULES:\n'
      const updated = current.trim() + separator + newRules

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSearchContext: updated }),
      })
      const newApplied = new Set(appliedItems)
      analysis.recommendations.forEach((_, i) => newApplied.add(`rec-${i}`))
      setAppliedItems(newApplied)
      setSnackbar({ open: true, message: `Applied ${analysis.recommendations.length} recommendations to search context` })
    } catch {
      setSnackbar({ open: true, message: 'Failed to apply' })
    }
  }

  const applySelectedDeletionRecs = async () => {
    if (!deletionInsights || selectedDeletionRecs.size === 0) return
    try {
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settings = await settingsRes.json()

      const selectedRecs = Array.from(selectedDeletionRecs)
        .map(i => deletionInsights.topRecommendations[i].recommendation)
        .filter(Boolean)
      
      const current = settings.specialInstructions || ''
      const newInstructions = selectedRecs.join('\n')
      const separator = current.trim() ? '\n\n' : ''
      const updated = current.trim() + separator + newInstructions

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialInstructions: updated }),
      })
      
      setSelectedDeletionRecs(new Set())
      setSnackbar({ open: true, message: `Applied ${selectedRecs.length} recommendation(s) to Special Instructions for AI Generation` })
    } catch {
      setSnackbar({ open: true, message: 'Failed to apply recommendations' })
    }
  }

  const cardBorder = `1px solid ${isDark ? '#334155' : '#e2e8f0'}`

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <BarChart3Icon size={22} color="#f97316" />
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '20px', color: 'text.primary' }}>
          Insights
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          mb: 3,
          borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: '14px',
            fontWeight: 600,
            color: 'text.secondary',
            '&.Mui-selected': { color: '#f97316' },
          },
          '& .MuiTabs-indicator': { bgcolor: '#f97316' },
        }}
      >
        <Tab label="Dismissal Insights" />
        <Tab label="Deletion Patterns" />
      </Tabs>

      {/* Dismissal Insights Tab */}
      {activeTab === 0 && (
        <>
          {loading && !analysis && <LinearProgress sx={{ mb: 2, '& .MuiLinearProgress-bar': { bgcolor: '#f97316' } }} />}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {analysis && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Stats Overview */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <XCircleIcon size={28} color="#ef4444" style={{ marginBottom: 8 }} />
                    <Typography sx={{ fontSize: '28px', fontWeight: 800, color: 'text.primary' }}>
                      {analysis.totalDismissed}
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>Total Dismissed</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <TrendingDownIcon size={28} color="#f59e0b" style={{ marginBottom: 8 }} />
                    <Typography sx={{ fontSize: '28px', fontWeight: 800, color: 'text.primary' }}>
                      {analysis.patterns.length}
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>Patterns Found</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <LightbulbIcon size={28} color="#f97316" style={{ marginBottom: 8 }} />
                    <Typography sx={{ fontSize: '28px', fontWeight: 800, color: 'text.primary' }}>
                      {analysis.recommendations.length}
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>Recommendations</Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Summary */}
              {analysis.summary && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 1.5 }}>
                      Summary
                    </Typography>
                    <Typography sx={{ fontSize: '14px', color: 'text.secondary', lineHeight: 1.7 }}>
                      {analysis.summary}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Patterns */}
              {analysis.patterns.length > 0 && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                      Dismissal Patterns
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {analysis.patterns.map((p, i) => (
                        <Box key={i} sx={{ p: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <AlertTriangleIcon size={16} color="#f59e0b" />
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary' }}>
                              {p.pattern}
                            </Typography>
                            <Chip label={`${p.count}x`} size="small" sx={{ height: 20, fontSize: '11px', bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }} />
                          </Box>
                          {p.examples.length > 0 && (
                            <Typography sx={{ fontSize: '13px', color: 'text.secondary', fontStyle: 'italic' }}>
                              "{p.examples[0]}"
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary' }}>
                        Recommendations
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ZapIcon size={12} />}
                        onClick={applyAllRecommendations}
                        sx={{
                          fontSize: '11px',
                          borderColor: '#f97316',
                          color: '#f97316',
                          '&:hover': { bgcolor: 'rgba(249,115,22,0.08)' },
                        }}
                      >
                        Apply All to Search
                      </Button>
                    </Box>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 2 }}>
                      Click "Apply" on individual items or "Apply All" to inject these rules into your AI search scoring context.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {analysis.recommendations.map((rec, i) => {
                        const key = `rec-${i}`
                        const applied = appliedItems.has(key)
                        return (
                          <Box
                            key={i}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1.5,
                              p: 1.5,
                              bgcolor: applied ? 'rgba(16,185,129,0.04)' : 'rgba(249,115,22,0.04)',
                              border: `1px solid ${applied ? 'rgba(16,185,129,0.2)' : 'rgba(249,115,22,0.12)'}`,
                              borderRadius: '8px',
                            }}
                          >
                            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: applied ? '#10b981' : '#f97316', mt: '1px', flexShrink: 0 }}>
                              {i + 1}.
                            </Typography>
                            <Typography sx={{ fontSize: '14px', color: 'text.primary', lineHeight: 1.6, flex: 1 }}>
                              {rec}
                            </Typography>
                            <Button
                              size="small"
                              variant={applied ? 'contained' : 'outlined'}
                              disabled={applied}
                              startIcon={applied ? <CheckCircleIcon size={12} /> : <ZapIcon size={12} />}
                              onClick={() => applyToSearchContext(rec, key)}
                              sx={{
                                fontSize: '11px',
                                minWidth: 80,
                                bgcolor: applied ? '#10b981' : 'transparent',
                                borderColor: applied ? '#10b981' : '#f97316',
                                color: applied ? '#fff' : '#f97316',
                                '&:hover': { bgcolor: applied ? '#059669' : 'rgba(249,115,22,0.08)' },
                                '&:disabled': { bgcolor: '#10b981', color: '#fff', opacity: 0.7 },
                              }}
                            >
                              {applied ? 'Applied' : 'Apply'}
                            </Button>
                          </Box>
                        )
                      })}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {analysis.totalDismissed === 0 && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <BarChart3Icon size={40} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 12 }} />
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                      No Dismissals Yet
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'text.secondary', maxWidth: 400, mx: 'auto' }}>
                      As you dismiss irrelevant opportunities from the Dashboard, patterns will be analyzed here to help improve future search results.
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </>
      )}

      {/* Deletion Patterns Tab */}
      {activeTab === 1 && (
        <>
          {loadingDeletions && <LinearProgress sx={{ mb: 2, '& .MuiLinearProgress-bar': { bgcolor: '#f97316' } }} />}

          {deletionInsights && deletionInsights.totalDeletions > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                    <TrashIcon size={24} color="#ef4444" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: 'text.primary' }}>
                      {deletionInsights.totalDeletions}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>Comments Deleted</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                    <ClockIcon size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: 'text.primary' }}>
                      {deletionInsights.avgHoursToDelete.toFixed(1)}h
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>Avg Time to Deletion</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                    <AlertCircleIcon size={24} color="#f97316" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: 'text.primary' }}>
                      {Object.keys(deletionInsights.reasonBreakdown).length}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>Deletion Reasons</Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Reason Breakdown */}
              <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                    Deletion Reasons Breakdown
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {Object.entries(deletionInsights.reasonBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([reason, count]) => {
                        const percentage = ((count / deletionInsights.totalDeletions) * 100).toFixed(0)
                        const reasonColors: Record<string, string> = {
                          'spam': '#ef4444',
                          'self-promotion': '#f59e0b',
                          'off-topic': '#3b82f6',
                          'rule-violation': '#8b5cf6',
                          'low-quality': '#6b7280',
                          'other': '#64748b',
                        }
                        const color = reasonColors[reason] || '#f97316'
                        return (
                          <Box key={reason}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary', textTransform: 'capitalize' }}>
                                {reason.replace('-', ' ')}
                              </Typography>
                              <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                                {count} ({percentage}%)
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={parseInt(percentage)}
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 1 },
                              }}
                            />
                          </Box>
                        )
                      })}
                  </Box>
                </CardContent>
              </Card>

              {/* Subreddit Stats */}
              <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                    Subreddit Deletion Rates
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'text.secondary' }}>Subreddit</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'text.secondary' }} align="right">Deletions</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'text.secondary' }} align="right">Confidence</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'text.secondary' }}>Top Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(deletionInsights.subredditStats)
                          .sort(([, a], [, b]) => b.count - a.count)
                          .slice(0, 10)
                          .map(([subreddit, stats]) => {
                            const topReason = stats.reasons.reduce((acc, r) => {
                              acc[r] = (acc[r] || 0) + 1
                              return acc
                            }, {} as Record<string, number>)
                            const mostCommon = Object.entries(topReason).sort(([, a], [, b]) => b - a)[0]
                            return (
                              <TableRow key={subreddit}>
                                <TableCell sx={{ fontSize: '13px', color: 'text.primary' }}>r/{subreddit}</TableCell>
                                <TableCell sx={{ fontSize: '13px', color: 'text.primary' }} align="right">{stats.count}</TableCell>
                                <TableCell sx={{ fontSize: '13px', color: 'text.primary' }} align="right">
                                  {(stats.avgConfidence * 100).toFixed(0)}%
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', color: 'text.secondary', textTransform: 'capitalize' }}>
                                  {mostCommon[0].replace('-', ' ')}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {deletionInsights.topRecommendations.length > 0 && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                      Recommendations
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 2 }}>
                      Based on {deletionInsights.totalDeletions} analyzed deletions. Select recommendations to apply to your <strong>Special Instructions for AI Generation</strong> setting:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {deletionInsights.topRecommendations.map((rec, i) => {
                        const isSelected = selectedDeletionRecs.has(i)
                        return (
                          <Box
                            key={i}
                            onClick={() => {
                              setSelectedDeletionRecs(prev => {
                                const next = new Set(prev)
                                if (next.has(i)) {
                                  next.delete(i)
                                } else {
                                  next.add(i)
                                }
                                return next
                              })
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1.5,
                              p: 1.5,
                              bgcolor: isSelected ? 'rgba(249,115,22,0.08)' : 'rgba(0,0,0,0.02)',
                              border: `1px solid ${isSelected ? 'rgba(249,115,22,0.3)' : (isDark ? '#334155' : '#e2e8f0')}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.04)',
                                borderColor: '#f97316',
                              },
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              size="small"
                              sx={{
                                p: 0,
                                color: isDark ? '#64748b' : '#94a3b8',
                                '&.Mui-checked': { color: '#f97316' },
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontSize: '13px', color: 'text.primary', lineHeight: 1.6 }}>
                                {rec.recommendation}
                              </Typography>
                              <Typography sx={{ fontSize: '11px', color: 'text.secondary', mt: 0.5 }}>
                                Seen in {rec.frequency} deletion{rec.frequency > 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                    {selectedDeletionRecs.size > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={applySelectedDeletionRecs}
                        sx={{
                          mt: 2,
                          bgcolor: '#f97316',
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#ea580c' },
                        }}
                      >
                        Apply {selectedDeletionRecs.size} to Settings
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <TrashIcon size={40} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 12 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                  No Deletion Analysis Yet
                </Typography>
                <Typography sx={{ fontSize: '13px', color: 'text.secondary', maxWidth: 400, mx: 'auto' }}>
                  Deletion analysis runs automatically daily. You can also manually analyze deleted opportunities from the Dashboard.
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" sx={{ bgcolor: 'background.paper', color: 'text.primary', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
