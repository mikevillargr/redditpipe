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
  CircularProgress,
  useTheme,
} from '@mui/material'
import {
  BarChart3Icon,
  RefreshCwIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  XCircleIcon,
  TrendingDownIcon,
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

export function Insights() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [analysis, setAnalysis] = useState<DismissalAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  const cardBorder = `1px solid ${isDark ? '#334155' : '#e2e8f0'}`

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        maxWidth: 1000,
        mx: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BarChart3Icon size={22} color="#f97316" />
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '20px', color: 'text.primary' }}>
            Insights
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={14} /> : <RefreshCwIcon size={14} />}
          onClick={fetchAnalysis}
          disabled={loading}
          sx={{
            fontSize: '13px',
            textTransform: 'none',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            color: 'text.secondary',
            '&:hover': { borderColor: '#f97316', color: '#f97316' },
          }}
        >
          {loading ? 'Analyzing...' : 'Refresh Analysis'}
        </Button>
      </Box>

      {loading && !analysis && <LinearProgress sx={{ mb: 2, '& .MuiLinearProgress-bar': { bgcolor: '#f97316' } }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                  Total Dismissed
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <TrendingDownIcon size={28} color="#f59e0b" style={{ marginBottom: 8 }} />
                <Typography sx={{ fontSize: '28px', fontWeight: 800, color: 'text.primary' }}>
                  {analysis.patterns.length}
                </Typography>
                <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                  Patterns Found
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 200px', border: cardBorder, bgcolor: 'background.paper' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <LightbulbIcon size={28} color="#f97316" style={{ marginBottom: 8 }} />
                <Typography sx={{ fontSize: '28px', fontWeight: 800, color: 'text.primary' }}>
                  {analysis.recommendations.length}
                </Typography>
                <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                  Recommendations
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* AI Summary */}
          <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <BarChart3Icon size={16} color="#f97316" />
                <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary' }}>
                  AI Summary
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '14px', color: 'text.secondary', lineHeight: 1.7 }}>
                {analysis.summary}
              </Typography>
            </CardContent>
          </Card>

          {/* Dismissal Patterns */}
          {analysis.patterns.length > 0 && (
            <Card sx={{ border: cardBorder, bgcolor: 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AlertTriangleIcon size={16} color="#f59e0b" />
                  <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary' }}>
                    Dismissal Patterns
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 2 }}>
                  These patterns are automatically extracted from dismissed opportunities. The AI scoring model uses them to avoid showing similar results in the future.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {analysis.patterns.map((pattern, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        bgcolor: isDark ? '#0f172a' : '#f8fafc',
                        border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                        borderRadius: '8px',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'text.primary' }}>
                          {pattern.pattern}
                        </Typography>
                        <Chip
                          label={`~${pattern.count} occurrences`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '11px',
                            fontWeight: 600,
                            bgcolor: 'rgba(239,68,68,0.08)',
                            color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.2)',
                          }}
                        />
                      </Box>
                      {pattern.examples.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {pattern.examples.slice(0, 3).map((ex, j) => (
                            <Chip
                              key={j}
                              label={ex.length > 60 ? ex.slice(0, 60) + '...' : ex}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: '11px',
                                bgcolor: isDark ? '#1e293b' : '#e2e8f0',
                                color: 'text.secondary',
                              }}
                            />
                          ))}
                        </Box>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LightbulbIcon size={16} color="#f97316" />
                  <Typography sx={{ fontWeight: 700, fontSize: '15px', color: 'text.primary' }}>
                    Recommendations
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 2 }}>
                  Actionable suggestions to improve your search relevance based on dismissal patterns.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {analysis.recommendations.map((rec, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        p: 1.5,
                        bgcolor: 'rgba(249,115,22,0.04)',
                        border: '1px solid rgba(249,115,22,0.12)',
                        borderRadius: '8px',
                      }}
                    >
                      <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#f97316', mt: '1px', flexShrink: 0 }}>
                        {i + 1}.
                      </Typography>
                      <Typography sx={{ fontSize: '14px', color: 'text.primary', lineHeight: 1.6 }}>
                        {rec}
                      </Typography>
                    </Box>
                  ))}
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
    </Box>
  )
}
