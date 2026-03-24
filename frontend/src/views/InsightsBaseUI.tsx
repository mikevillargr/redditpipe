import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '../components/base/Card'
import { Button } from '../components/base/Button'
import { Badge } from '../components/base/Badge'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/base/Table'
import {
  BarChart3Icon,
  AlertTriangleIcon,
  LightbulbIcon,
  XCircleIcon,
  TrendingDownIcon,
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

export function InsightsBaseUI() {
  const [activeTab, setActiveTab] = useState(0)
  const [analysis, setAnalysis] = useState<DismissalAnalysis | null>(null)
  const [deletionInsights, setDeletionInsights] = useState<DeletionInsights | null>(null)
  const [successInsights, setSuccessInsights] = useState<SuccessInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingDeletions, setLoadingDeletions] = useState(false)
  const [loadingSuccess, setLoadingSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      
      const rawData = await res.json()
      
      // Validate response structure
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('Invalid response: expected object')
      }
      
      // Check if it's an error response from backend
      if (rawData.error) {
        throw new Error(rawData.error)
      }
      
      // Validate required fields
      const validatedAnalysis: DismissalAnalysis = {
        totalDismissed: typeof rawData.totalDismissed === 'number' ? rawData.totalDismissed : 0,
        patterns: Array.isArray(rawData.patterns) ? rawData.patterns : [],
        summary: typeof rawData.summary === 'string' ? rawData.summary : 'No summary available',
        recommendations: Array.isArray(rawData.recommendations) ? rawData.recommendations : [],
      }
      
      // Check if summary looks like raw JSON (malformed response)
      if (validatedAnalysis.summary.startsWith('{') || validatedAnalysis.summary.startsWith('[')) {
        console.warn('Dismissal insights summary appears to be raw JSON, backend parsing may have failed')
        validatedAnalysis.summary = 'Analysis failed to parse properly. Please try again.'
      }
      
      setAnalysis(validatedAnalysis)
    } catch (err) {
      console.error('Failed to fetch dismissal analysis:', err)
      setError(err instanceof Error ? err.message : 'Failed to load insights')
      setAnalysis(null)
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

  const applySelectedDismissalRecs = async () => {
    if (!analysis || selectedDismissalRecs.size === 0) return
    try {
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      const settings = await settingsRes.json()

      const selectedRecs = Array.from(selectedDismissalRecs)
        .map((i) => analysis.recommendations[i])
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
        .map((i) => deletionInsights.topRecommendations[i].recommendation)
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
      setSnackbar({
        open: true,
        message: `Applied ${selectedRecs.length} recommendation(s) to Special Instructions for AI Generation`,
      })
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
        .map((i) => successInsights.recommendations.filtering[i].text)
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
      setSnackbar({
        open: true,
        message: `Applied ${selectedRecs.length} filtering recommendation(s) to AI Search Context`,
      })
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
        .map((i) => successInsights.recommendations.generation[i].text)
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
      setSnackbar({
        open: true,
        message: `Applied ${selectedRecs.length} generation recommendation(s) to Special Instructions`,
      })
    } catch {
      setSnackbar({ open: true, message: 'Failed to apply generation recommendations' })
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3Icon size={22} className="text-orange-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Insights</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800">
        {['Dismissal Insights', 'Deletion Patterns', 'Success Patterns'].map((label, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === idx
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dismissal Insights Tab */}
      {activeTab === 0 && (
        <>
          {loading && !analysis && (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size="lg" className="text-orange-500 mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Analyzing dismissal patterns...</p>
            </div>
          )}
          {error && (
            <Alert variant="error" className="mb-4">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={fetchAnalysis} className="ml-4">
                  Retry
                </Button>
              </div>
            </Alert>
          )}

          {analysis && (
            <div className="flex flex-col gap-4">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="text-center py-6">
                    <XCircleIcon size={28} className="text-red-500 mx-auto mb-2" />
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                      {analysis.totalDismissed}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Total Dismissed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-6">
                    <TrendingDownIcon size={28} className="text-amber-500 mx-auto mb-2" />
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                      {analysis.patterns.length}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Patterns Found</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-6">
                    <LightbulbIcon size={28} className="text-orange-500 mx-auto mb-2" />
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                      {analysis.recommendations.length}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Recommendations</div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              {analysis.summary && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Summary</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{analysis.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Patterns */}
              {analysis.patterns.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                      Dismissal Patterns
                    </h3>
                    <div className="flex flex-col gap-4">
                      {analysis.patterns.map((p, i) => (
                        <div
                          key={i}
                          className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangleIcon size={16} className="text-amber-500" />
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {p.pattern}
                            </span>
                            <Badge variant="warning" className="ml-auto">
                              {p.count}x
                            </Badge>
                          </div>
                          {p.examples.length > 0 && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{p.examples[0]}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Recommendations
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                      Select recommendations to apply to your <strong>AI Search Context</strong> setting:
                    </p>
                    <div className="flex flex-col gap-2">
                      {analysis.recommendations.map((rec, i) => {
                        const isSelected = selectedDismissalRecs.has(i)
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setSelectedDismissalRecs((prev) => {
                                const next = new Set(prev)
                                if (next.has(i)) {
                                  next.delete(i)
                                } else {
                                  next.add(i)
                                }
                                return next
                              })
                            }}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-300 dark:border-orange-800'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="mt-0.5 w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed flex-1">
                              {rec}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    {selectedDismissalRecs.size > 0 && (
                      <Button variant="primary" size="sm" onClick={applySelectedDismissalRecs} className="mt-4">
                        Apply {selectedDismissalRecs.size} to Search Context
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {analysis.totalDismissed === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <BarChart3Icon size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      No Dismissals Yet
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      As you dismiss irrelevant opportunities from the Dashboard, patterns will be analyzed here to
                      help improve future search results.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Deletion Patterns Tab */}
      {activeTab === 1 && (
        <>
          {loadingDeletions && (
            <div className="mb-4 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 animate-pulse w-1/2"></div>
            </div>
          )}

          {deletionInsights && deletionInsights.totalDeletions > 0 ? (
            <div className="flex flex-col gap-4">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="text-center py-5">
                    <TrashIcon size={24} className="text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {deletionInsights.totalDeletions}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Comments Deleted</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-5">
                    <ClockIcon size={24} className="text-amber-500 mx-auto mb-2" />
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {deletionInsights.avgHoursToDelete.toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Avg Time to Deletion</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-5">
                    <AlertCircleIcon size={24} className="text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {Object.keys(deletionInsights.reasonBreakdown).length}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Deletion Reasons</div>
                  </CardContent>
                </Card>
              </div>

              {/* Reason Breakdown */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                    Deletion Reasons Breakdown
                  </h3>
                  <div className="flex flex-col gap-3">
                    {Object.entries(deletionInsights.reasonBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([reason, count]) => {
                        const percentage = ((count / deletionInsights.totalDeletions) * 100).toFixed(0)
                        const reasonColors: Record<string, string> = {
                          spam: 'bg-red-500',
                          'self-promotion': 'bg-amber-500',
                          'off-topic': 'bg-blue-500',
                          'rule-violation': 'bg-purple-500',
                          'low-quality': 'bg-gray-500',
                          other: 'bg-slate-500',
                        }
                        const colorClass = reasonColors[reason] || 'bg-orange-500'
                        return (
                          <div key={reason}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">
                                {reason.replace('-', ' ')}
                              </span>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${colorClass}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Subreddit Stats */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                    Subreddit Deletion Rates
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subreddit</TableHead>
                          <TableHead className="text-right">Deletions</TableHead>
                          <TableHead className="text-right">Confidence</TableHead>
                          <TableHead>Top Reason</TableHead>
                        </TableRow>
                      </TableHeader>
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
                                <TableCell>r/{subreddit}</TableCell>
                                <TableCell className="text-right">{stats.count}</TableCell>
                                <TableCell className="text-right">{(stats.avgConfidence * 100).toFixed(0)}%</TableCell>
                                <TableCell className="capitalize text-slate-600 dark:text-slate-400">
                                  {mostCommon[0].replace('-', ' ')}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {deletionInsights.topRecommendations.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Recommendations</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                      Based on {deletionInsights.totalDeletions} analyzed deletions. Select recommendations to apply
                      to your <strong>Special Instructions for AI Generation</strong> setting:
                    </p>
                    <div className="flex flex-col gap-2">
                      {deletionInsights.topRecommendations.map((rec, i) => {
                        const isSelected = selectedDeletionRecs.has(i)
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setSelectedDeletionRecs((prev) => {
                                const next = new Set(prev)
                                if (next.has(i)) {
                                  next.delete(i)
                                } else {
                                  next.add(i)
                                }
                                return next
                              })
                            }}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-300 dark:border-orange-800'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="mt-0.5 w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                                {rec.recommendation}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Seen in {rec.frequency} deletion{rec.frequency > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {selectedDeletionRecs.size > 0 && (
                      <Button variant="primary" size="sm" onClick={applySelectedDeletionRecs} className="mt-4">
                        Apply {selectedDeletionRecs.size} to Settings
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <TrashIcon size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  No Deletion Analysis Yet
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Deletion analysis runs automatically daily. You can also manually analyze deleted opportunities from
                  the Dashboard.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Success Patterns Tab */}
      {activeTab === 2 && (
        <>
          {loadingSuccess && (
            <div className="mb-4 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 animate-pulse w-1/2"></div>
            </div>
          )}

          {successInsights && successInsights.totalAnalyzed > 0 ? (
            <div className="flex flex-col gap-4">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="text-center py-5">
                    <TrophyIcon size={24} className="text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {successInsights.totalAnalyzed}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Successful Comments</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-5">
                    <ClockIcon size={24} className="text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {successInsights.avgAge.toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Avg Age Analyzed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-5">
                    <SparklesIcon size={24} className="text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {Object.keys(successInsights.successFactors).length}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Success Factors</div>
                  </CardContent>
                </Card>
              </div>

              {/* Success Factors Breakdown */}
              {Object.keys(successInsights.successFactors).length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                      Success Factors Breakdown
                    </h3>
                    <div className="flex flex-col gap-3">
                      {Object.entries(successInsights.successFactors)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([factor, count]) => {
                          const percentage = ((count / successInsights.totalAnalyzed) * 100).toFixed(0)
                          return (
                            <div key={factor}>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {factor}
                                </span>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {count} ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-green-500"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Subreddit Success Stats */}
              {Object.keys(successInsights.subredditStats).length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                      Subreddit Success Patterns
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subreddit</TableHead>
                            <TableHead className="text-right">Successes</TableHead>
                            <TableHead className="text-right">Confidence</TableHead>
                            <TableHead>Top Factors</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(successInsights.subredditStats)
                            .sort(([, a], [, b]) => b.count - a.count)
                            .slice(0, 10)
                            .map(([subreddit, stats]) => (
                              <TableRow key={subreddit}>
                                <TableCell>r/{subreddit}</TableCell>
                                <TableCell className="text-right">{stats.count}</TableCell>
                                <TableCell className="text-right">{(stats.avgConfidence * 100).toFixed(0)}%</TableCell>
                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                  {stats.topFactors.slice(0, 2).join(', ')}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filtering Recommendations */}
              {successInsights.recommendations.filtering.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Search Filtering Recommendations
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                      Apply these to <strong>AI Search Context</strong> to improve opportunity filtering:
                    </p>
                    <div className="flex flex-col gap-2">
                      {successInsights.recommendations.filtering.map((rec, i) => {
                        const isSelected = selectedFilteringRecs.has(i)
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setSelectedFilteringRecs((prev) => {
                                const next = new Set(prev)
                                if (next.has(i)) {
                                  next.delete(i)
                                } else {
                                  next.add(i)
                                }
                                return next
                              })
                            }}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-green-50 dark:bg-green-950/30 border-2 border-green-300 dark:border-green-800'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-300 dark:hover:border-green-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="mt-0.5 w-4 h-4 text-green-500 rounded focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">{rec.text}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Seen in {rec.frequency} success{rec.frequency > 1 ? 'es' : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {selectedFilteringRecs.size > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={applySelectedFilteringRecs}
                        className="mt-4 bg-green-600 hover:bg-green-700"
                      >
                        Apply {selectedFilteringRecs.size} to Search Context
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Generation Recommendations */}
              {successInsights.recommendations.generation.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Reply Generation Recommendations
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                      Apply these to <strong>Special Instructions</strong> to improve AI-generated replies:
                    </p>
                    <div className="flex flex-col gap-2">
                      {successInsights.recommendations.generation.map((rec, i) => {
                        const isSelected = selectedGenerationRecs.has(i)
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setSelectedGenerationRecs((prev) => {
                                const next = new Set(prev)
                                if (next.has(i)) {
                                  next.delete(i)
                                } else {
                                  next.add(i)
                                }
                                return next
                              })
                            }}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="mt-0.5 w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">{rec.text}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Seen in {rec.frequency} success{rec.frequency > 1 ? 'es' : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {selectedGenerationRecs.size > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={applySelectedGenerationRecs}
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                      >
                        Apply {selectedGenerationRecs.size} to Special Instructions
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <TrophyIcon size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  No Success Analysis Yet
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Success analysis runs automatically daily on published comments that have survived past the average
                  deletion time.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Snackbar */}
      {snackbar.open && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2">
          <Alert variant="success" className="shadow-lg">
            {snackbar.message}
          </Alert>
        </div>
      )}
      {snackbar.open && setTimeout(() => setSnackbar({ open: false, message: '' }), 3000)}
    </div>
  )
}
