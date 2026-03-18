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
  TrophyIcon,
  SparklesIcon,
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
    opportunityType: string
  }>
}

interface SuccessInsights {
  totalAnalyzed: number
  avgAge: number
  successFactors: Record<string, number>
  subredditStats: Record<string, { count: number; avgConfidence: number; topFactors: string[] }>
  generalPatterns: string[]
  recommendations: {
    filtering: Array<{ text: string; frequency: number }>
    generation: Array<{ text: string; frequency: number }>
  }
  recentAnalyses: Array<{
    id: string
    subreddit: string
    confidence: number
    ageAtAnalysis: number
    createdAt: string
    clientName: string
    opportunityType: string
  }>
}

export function Insights() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [activeTab, setActiveTab] = useState(0)
  const [analysis, setAnalysis] = useState<DismissalAnalysis | null>(null)
  const [deletionInsights, setDeletionInsights] = useState<DeletionInsights | null>(null)
  const [successInsights, setSuccessInsights] = useState<SuccessInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingDeletions, setLoadingDeletions] = useState(false)
  const [loadingSuccess, setLoadingSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set())
  const [selectedDismissalRecs, setSelectedDismissalRecs] = useState<Set<number>>(new Set())
  const [selectedDeletionRecs, setSelectedDeletionRecs] = useState<Set<number>>(new Set())
  const [selectedFilteringRecs, setSelectedFilteringRecs] = useState<Set<number>>(new Set())
  const [selectedGenerationRecs, setSelectedGenerationRecs] = useState<Set<number>>(new Set())
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

  const fetchSuccessInsights = useCallback(async () => {
    setLoadingSuccess(true)
    try {
      const res = await fetch('/api/success-analysis/insights')
      if (res.ok) {
        const data = await res.json()
        setSuccessInsights(data)
      }
    } catch (err) {
      console.error('Failed to fetch success insights:', err)
    } finally {
      setLoadingSuccess(false)
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
    fetchSuccessInsights()
  }, [fetchAnalysis, fetchDeletionInsights, fetchSuccessInsights])

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

  const applySelectedDismissalRecs = async () => {
    if (!analysis || selectedDismissalRecs.size === 0) return
    try {
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settings = await settingsRes.json()

      const selectedRecs = Array.from(selectedDismissalRecs)
        .map(i => analysis.recommendations[i])
        .filter(Boolean)
      
      const current = settings.aiSearchContext || ''
      const newContext = selectedRecs.join('\n')
      const separator = current.trim() ? '\n\n' : ''
      const updated = current.trim() + separator + newContext

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSearchContext: updated }),
      })
      
      setSelectedDismissalRecs(new Set())
      setSnackbar({ open: true, message: `Applied ${selectedRecs.length} recommendation(s) to AI Search Context` })
    } catch {
      setSnackbar({ open: true, message: 'Failed to apply recommendations' })
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

  const applySelectedFilteringRecs = async () => {
    if (!successInsights || selectedFilteringRecs.size === 0) return
    try {
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settings = await settingsRes.json()

      const selectedRecs = Array.from(selectedFilteringRecs)
        .map(i => successInsights.recommendations.filtering[i].text)
        .filter(Boolean)
      
      const current = settings.aiSearchContext || ''
      const newContext = selectedRecs.join('\n')
      const separator = current.trim() ? '\n\n' : ''
      const updated = current.trim() + separator + newContext

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSearchContext: updated }),
      })
      
      setSelectedFilteringRecs(new Set())
      setSnackbar({ open: true, message: `Applied ${selectedRecs.length} filtering recommendation(s) to AI Search Context` })
    } catch {
      setSnackbar({ open: true, message: 'Failed to apply filtering recommendations' })
    }
  }

  const applySelectedGenerationRecs = async () => {
    if (!successInsights || selectedGenerationRecs.size === 0) return
    try {
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settings = await settingsRes.json()

      const selectedRecs = Array.from(selectedGenerationRecs)
        .map(i => successInsights.recommendations.generation[i].text)
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
      
      setSelectedGenerationRecs(new Set())
      setSnackbar({ open: true, message: `Applied ${selectedRecs.length} generation recommendation(s) to Special Instructions` })
    } catch {
      setSnackbar({ open: true, message: 'Failed to apply generation recommendations' })
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
        <Tab label="Success Patterns" />
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
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                      Recommendations
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 2 }}>
                      Select recommendations to apply to your <strong>AI Search Context</strong> setting:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {analysis.recommendations.map((rec, i) => {
                        const isSelected = selectedDismissalRecs.has(i)
                        return (
                          <Box
                            key={i}
                            onClick={() => {
                              setSelectedDismissalRecs(prev => {
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
                            <Typography sx={{ fontSize: '13px', color: 'text.primary', lineHeight: 1.6, flex: 1 }}>
                              {rec}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>
                    {selectedDismissalRecs.size > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={applySelectedDismissalRecs}
                        sx={{
                          mt: 2,
                          bgcolor: '#f97316',
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#ea580c' },
                        }}
                      >
                        Apply {selectedDismissalRecs.size} to Search Context
                      </Button>
                    )}
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

      {/* Success Patterns Tab */}
      {activeTab === 2 && (
        <>
          {loadingSuccess && <LinearProgress sx={{ mb: 2, '& .MuiLinearProgress-bar': { bgcolor: '#f97316' } }} />}

          {successInsights && successInsights.totalAnalyzed > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                    <TrophyIcon size={24} color="#10b981" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: 'text.primary' }}>
                      {successInsights.totalAnalyzed}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>Successful Comments</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                    <ClockIcon size={24} color="#3b82f6" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: 'text.primary' }}>
                      {successInsights.avgAge.toFixed(1)}h
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>Avg Age Analyzed</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                    <SparklesIcon size={24} color="#f97316" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: 'text.primary' }}>
                      {Object.keys(successInsights.successFactors).length}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>Success Factors</Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Success Factors Breakdown */}
              {Object.keys(successInsights.successFactors).length > 0 && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                      Success Factors Breakdown
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {Object.entries(successInsights.successFactors)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([factor, count]) => {
                          const percentage = ((count / successInsights.totalAnalyzed) * 100).toFixed(0)
                          return (
                            <Box key={factor}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary' }}>
                                  {factor}
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
                                  '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 1 },
                                }}
                              />
                            </Box>
                          )
                        })}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Subreddit Success Stats */}
              {Object.keys(successInsights.subredditStats).length > 0 && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                      Subreddit Success Patterns
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'text.secondary' }}>Subreddit</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'text.secondary' }} align="right">Successes</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'text.secondary' }} align="right">Confidence</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: 'text.secondary' }}>Top Factors</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(successInsights.subredditStats)
                            .sort(([, a], [, b]) => b.count - a.count)
                            .slice(0, 10)
                            .map(([subreddit, stats]) => (
                              <TableRow key={subreddit}>
                                <TableCell sx={{ fontSize: '13px', color: 'text.primary' }}>r/{subreddit}</TableCell>
                                <TableCell sx={{ fontSize: '13px', color: 'text.primary' }} align="right">{stats.count}</TableCell>
                                <TableCell sx={{ fontSize: '13px', color: 'text.primary' }} align="right">
                                  {(stats.avgConfidence * 100).toFixed(0)}%
                                </TableCell>
                                <TableCell sx={{ fontSize: '11px', color: 'text.secondary' }}>
                                  {stats.topFactors.slice(0, 2).join(', ')}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}

              {/* Filtering Recommendations */}
              {successInsights.recommendations.filtering.length > 0 && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                      Search Filtering Recommendations
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 2 }}>
                      Apply these to <strong>AI Search Context</strong> to improve opportunity filtering:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {successInsights.recommendations.filtering.map((rec, i) => {
                        const isSelected = selectedFilteringRecs.has(i)
                        return (
                          <Box
                            key={i}
                            onClick={() => {
                              setSelectedFilteringRecs(prev => {
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
                              bgcolor: isSelected ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.02)',
                              border: `1px solid ${isSelected ? 'rgba(16,185,129,0.3)' : (isDark ? '#334155' : '#e2e8f0')}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: isSelected ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.04)',
                                borderColor: '#10b981',
                              },
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              size="small"
                              sx={{
                                p: 0,
                                color: isDark ? '#64748b' : '#94a3b8',
                                '&.Mui-checked': { color: '#10b981' },
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontSize: '13px', color: 'text.primary', lineHeight: 1.6 }}>
                                {rec.text}
                              </Typography>
                              <Typography sx={{ fontSize: '11px', color: 'text.secondary', mt: 0.5 }}>
                                Seen in {rec.frequency} success{rec.frequency > 1 ? 'es' : ''}
                              </Typography>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                    {selectedFilteringRecs.size > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={applySelectedFilteringRecs}
                        sx={{
                          mt: 2,
                          bgcolor: '#10b981',
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#059669' },
                        }}
                      >
                        Apply {selectedFilteringRecs.size} to Search Context
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Generation Recommendations */}
              {successInsights.recommendations.generation.length > 0 && (
                <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary', mb: 2 }}>
                      Reply Generation Recommendations
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 2 }}>
                      Apply these to <strong>Special Instructions</strong> to improve AI-generated replies:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {successInsights.recommendations.generation.map((rec, i) => {
                        const isSelected = selectedGenerationRecs.has(i)
                        return (
                          <Box
                            key={i}
                            onClick={() => {
                              setSelectedGenerationRecs(prev => {
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
                              bgcolor: isSelected ? 'rgba(59,130,246,0.08)' : 'rgba(0,0,0,0.02)',
                              border: `1px solid ${isSelected ? 'rgba(59,130,246,0.3)' : (isDark ? '#334155' : '#e2e8f0')}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: isSelected ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.04)',
                                borderColor: '#3b82f6',
                              },
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              size="small"
                              sx={{
                                p: 0,
                                color: isDark ? '#64748b' : '#94a3b8',
                                '&.Mui-checked': { color: '#3b82f6' },
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontSize: '13px', color: 'text.primary', lineHeight: 1.6 }}>
                                {rec.text}
                              </Typography>
                              <Typography sx={{ fontSize: '11px', color: 'text.secondary', mt: 0.5 }}>
                                Seen in {rec.frequency} success{rec.frequency > 1 ? 'es' : ''}
                              </Typography>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                    {selectedGenerationRecs.size > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={applySelectedGenerationRecs}
                        sx={{
                          mt: 2,
                          bgcolor: '#3b82f6',
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#2563eb' },
                        }}
                      >
                        Apply {selectedGenerationRecs.size} to Special Instructions
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <TrophyIcon size={40} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 12 }} />
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                  No Success Analysis Yet
                </Typography>
                <Typography sx={{ fontSize: '13px', color: 'text.secondary', maxWidth: 400, mx: 'auto' }}>
                  Success analysis runs automatically daily on published comments that have survived past the average deletion time.
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
