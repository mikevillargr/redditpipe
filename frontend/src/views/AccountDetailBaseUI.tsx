import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '../components/base/Card'
import { Button } from '../components/base/Button'
import { Badge } from '../components/base/Badge'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/base/Table'
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  Trash2Icon,
  SaveIcon,
  XIcon,
  SparklesIcon,
} from 'lucide-react'
import { RedditIcon } from '../components/RedditIcon'

interface AccountDetailProps {
  accountId: string | null
  onBack: () => void
}

interface SampleComment {
  id: string
  subreddit: string
  text: string
  score: number
  date: string
}

interface ActivityRow {
  date: string
  thread: string
  subreddit: string
  client: string
  status: string
  permalinkUrl?: string
}

interface AccountData {
  id: string
  username: string
  status: string
  accountAgeDays: number | null
  postKarma: number | null
  commentKarma: number | null
  personalitySummary: string | null
  writingStyleNotes: string | null
  sampleComments: string | null
  activeSubreddits: string | null
  maxPostsPerDay: number
  minHoursBetweenPosts: number
  postsTodayCount: number
  organicPostsTotal: number
  citationPostsTotal: number
}

export function AccountDetailBaseUI({ accountId, onBack }: AccountDetailProps) {
  const [account, setAccount] = useState<AccountData | null>(null)
  const [status, setStatus] = useState('active')
  const [personalitySummary, setPersonalitySummary] = useState('')
  const [writingStyle, setWritingStyle] = useState('')
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(3)
  const [minHoursBetween, setMinHoursBetween] = useState(4)
  const [loading, setLoading] = useState(true)
  const [savedPersonality, setSavedPersonality] = useState(false)
  const [savedStyle, setSavedStyle] = useState(false)
  const [savedSafety, setSavedSafety] = useState(false)
  const [sampleComments, setSampleComments] = useState<SampleComment[]>([])
  const [activeSubreddits, setActiveSubreddits] = useState<string[]>([])
  const [activityLog, setActivityLog] = useState<ActivityRow[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [generatingPersonality, setGeneratingPersonality] = useState(false)
  const [generatingStyle, setGeneratingStyle] = useState(false)
  const [page, setPage] = useState(0)

  const fetchAccount = useCallback(async () => {
    if (!accountId) return
    try {
      const res = await fetch(`/api/accounts/${accountId}`)
      if (res.ok) {
        const data = await res.json()
        setAccount(data)
        setStatus(data.status)
        setPersonalitySummary(data.personalitySummary || '')
        setWritingStyle(data.writingStyleNotes || '')
        setMaxPostsPerDay(data.maxPostsPerDay)
        setMinHoursBetween(data.minHoursBetweenPosts)
        
        // Parse sample comments
        if (data.sampleComments) {
          try {
            const parsed = JSON.parse(data.sampleComments)
            setSampleComments(
              parsed.map((c: string, i: number) => {
                const match = c.match(/^\[r\/([^,]+), score: (\d+)\] (.*)$/)
                return match
                  ? { id: String(i), subreddit: `r/${match[1]}`, score: Number(match[2]), text: match[3], date: '' }
                  : { id: String(i), subreddit: '', score: 0, text: c, date: '' }
              })
            )
          } catch {
            setSampleComments([])
          }
        }
        
        // Parse active subreddits
        if (data.activeSubreddits) {
          try {
            setActiveSubreddits(JSON.parse(data.activeSubreddits).map((s: string) => `r/${s}`))
          } catch {
            setActiveSubreddits([])
          }
        }
        
        // Fetch activity log
        const actRes = await fetch(`/api/accounts/${accountId}/activity`)
        if (actRes.ok) {
          const actData = await actRes.json()
          setActivityLog(
            actData.map(
              (o: {
                createdAt: string
                title: string
                subreddit: string
                client?: { name: string }
                status: string
                permalinkUrl?: string
              }) => ({
                date: new Date(o.createdAt).toISOString().split('T')[0],
                thread: o.title,
                subreddit: `r/${o.subreddit}`,
                client: o.client?.name || '',
                status: o.status === 'published' ? 'pushed' : o.status,
                permalinkUrl: o.permalinkUrl,
              })
            )
          )
        }
      }
    } catch (err) {
      console.error('Failed to fetch account:', err)
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  const organicPostsTotal = account?.organicPostsTotal ?? 0
  const citationPostsTotal = account?.citationPostsTotal ?? 0
  const postsToday = account?.postsTodayCount ?? 0
  const postRatio = maxPostsPerDay > 0 ? postsToday / maxPostsPerDay : 0
  const progressColor = postRatio >= 1 ? 'bg-red-500' : postRatio >= 0.5 ? 'bg-amber-500' : 'bg-green-500'

  // Ratio health
  const totalPosts = organicPostsTotal + citationPostsTotal
  const citationPct = totalPosts > 0 ? (citationPostsTotal / totalPosts) * 100 : 0
  const ratioColor = citationPct <= 25 ? 'text-green-500' : citationPct <= 40 ? 'text-amber-500' : 'text-red-500'
  const ratioStatus = citationPct <= 25 ? 'Healthy' : citationPct <= 40 ? 'Borderline' : 'Too many citations'

  const handleSave = async (type: 'personality' | 'style' | 'safety') => {
    if (!accountId) return
    try {
      const payload: Record<string, unknown> = {}
      if (type === 'personality') payload.personalitySummary = personalitySummary
      if (type === 'style') payload.writingStyleNotes = writingStyle
      if (type === 'safety') {
        payload.maxPostsPerDay = maxPostsPerDay
        payload.minHoursBetweenPosts = minHoursBetween
        payload.status = status
      }
      await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (type === 'personality') {
        setSavedPersonality(true)
        setTimeout(() => setSavedPersonality(false), 2000)
      }
      if (type === 'style') {
        setSavedStyle(true)
        setTimeout(() => setSavedStyle(false), 2000)
      }
      if (type === 'safety') {
        setSavedSafety(true)
        setTimeout(() => setSavedSafety(false), 2000)
      }
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  const handleAnalyze = async () => {
    if (!accountId) return
    setAnalyzing(true)
    try {
      await fetch(`/api/accounts/${accountId}/analyze`, { method: 'POST' })
      await fetchAccount()
    } catch (err) {
      console.error('Failed to analyze:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGeneratePersonality = async () => {
    if (!accountId) return
    setGeneratingPersonality(true)
    try {
      const res = await fetch('/api/warming/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'persona' }),
      })
      const data = await res.json()
      if (res.ok && data.persona) {
        setPersonalitySummary(data.persona)
      }
    } catch (err) {
      console.error('Failed to generate personality:', err)
    } finally {
      setGeneratingPersonality(false)
    }
  }

  const handleGenerateWritingStyle = async () => {
    if (!accountId) return
    setGeneratingStyle(true)
    try {
      const res = await fetch('/api/warming/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'writing_style' }),
      })
      const data = await res.json()
      if (res.ok && data.style) {
        setWritingStyle(data.style)
      }
    } catch (err) {
      console.error('Failed to generate writing style:', err)
    } finally {
      setGeneratingStyle(false)
    }
  }

  const handleDelete = async () => {
    if (!accountId || !confirm('Are you sure you want to delete this account?')) return
    try {
      await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })
      onBack()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors"
      >
        <ArrowLeftIcon size={16} />
        <span className="text-sm">Back to Accounts</span>
      </button>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#FF4500] flex items-center justify-center">
                <RedditIcon size={32} variant="white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RedditIcon size={14} variant="color" />
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    u/{account?.username || '...'}
                  </h1>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </div>

            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Account Age</div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {account
                    ? `${Math.floor((account.accountAgeDays || 0) / 365)}y ${Math.floor(
                        ((account.accountAgeDays || 0) % 365) / 30
                      )}m`
                    : '...'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Post Karma</div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {(account?.postKarma || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Comment Karma</div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {(account?.commentKarma || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="active">Active</option>
                <option value="warming">Farming</option>
                <option value="cooldown">Cooldown</option>
                <option value="flagged">Flagged</option>
                <option value="retired">Retired</option>
              </select>
              <Button
                variant="outlined"
                size="sm"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="border-slate-300 dark:border-slate-700"
              >
                {analyzing ? <Spinner size="sm" className="mr-2" /> : <RefreshCwIcon size={14} className="mr-2" />}
                {analyzing ? 'Analyzing...' : 'Re-Analyze'}
              </Button>
              <Button
                variant="outlined"
                size="sm"
                onClick={handleDelete}
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash2Icon size={14} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-4">
          {/* AI Personality Summary */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                AI Personality Summary
              </h3>
              <textarea
                value={personalitySummary}
                onChange={(e) => setPersonalitySummary(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-3"
              />
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={handleGeneratePersonality}
                  disabled={generatingPersonality}
                  className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950"
                >
                  {generatingPersonality ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <SparklesIcon size={13} className="mr-2" />
                  )}
                  {generatingPersonality ? 'Generating...' : 'AI Generate'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSave('personality')}
                  className={savedPersonality ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <SaveIcon size={13} className="mr-2" />
                  {savedPersonality ? 'Saved!' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Writing Style Notes */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                Writing Style Notes
              </h3>
              <textarea
                value={writingStyle}
                onChange={(e) => setWritingStyle(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-3"
              />
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={handleGenerateWritingStyle}
                  disabled={generatingStyle}
                  className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950"
                >
                  {generatingStyle ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <SparklesIcon size={13} className="mr-2" />
                  )}
                  {generatingStyle ? 'Generating...' : 'AI Generate'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSave('style')}
                  className={savedStyle ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <SaveIcon size={13} className="mr-2" />
                  {savedStyle ? 'Saved!' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sample Comments */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
                Sample Comments
              </h3>
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                {sampleComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="warning" className="text-xs">
                        {comment.subreddit}
                      </Badge>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>↑ {comment.score}</span>
                        <span>{comment.date}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Safety Settings */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
                Safety Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Max posts per day</label>
                  <input
                    type="number"
                    value={maxPostsPerDay || ''}
                    onChange={(e) => setMaxPostsPerDay(e.target.value === '' ? 0 : Number(e.target.value))}
                    min="1"
                    max="10"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Min hours between posts
                  </label>
                  <input
                    type="number"
                    value={minHoursBetween || ''}
                    onChange={(e) => setMinHoursBetween(e.target.value === '' ? 0 : Number(e.target.value))}
                    min="1"
                    max="24"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Posts today</span>
                    <span className={`text-xs font-semibold ${ratioColor}`}>
                      {postsToday}/{maxPostsPerDay}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${progressColor}`}
                      style={{ width: `${Math.min((postsToday / maxPostsPerDay) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-dashed border-slate-400 cursor-help"
                      title="Reddit penalizes accounts that post too many promotional/citation replies relative to organic participation. Maintain at least 3 organic posts for every 1 citation post."
                    >
                      Organic : Citation ratio (this week)
                    </div>
                    <Badge
                      variant={citationPct <= 25 ? 'success' : citationPct <= 40 ? 'warning' : 'danger'}
                      className="text-xs"
                    >
                      {ratioStatus}
                    </Badge>
                  </div>
                  <div className="flex gap-6 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-extrabold text-green-500">{organicPostsTotal}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Organic</div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-base text-slate-400">:</span>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-extrabold ${ratioColor}`}>{citationPostsTotal}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Citation</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-500">Citation %</span>
                        <span className={`text-xs font-bold ${ratioColor}`}>{citationPct.toFixed(0)}%</span>
                      </div>
                      <div className="relative h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-slate-400 z-10"></div>
                        <div
                          className={`h-full rounded-full ${
                            citationPct <= 25 ? 'bg-green-500' : citationPct <= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(citationPct, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Target: max 25% citation (3:1 ratio)</div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSave('safety')}
                  className={savedSafety ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <SaveIcon size={13} className="mr-2" />
                  {savedSafety ? 'Saved!' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Subreddits */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                Active Subreddits
              </h3>
              <p className="text-xs text-slate-500 mb-3">Auto-detected from account activity</p>
              <div className="flex flex-wrap gap-2">
                {activeSubreddits.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded"
                  >
                    {sub}
                    <button className="text-slate-500 hover:text-red-500">
                      <XIcon size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Log */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
            Activity Log
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Thread</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Subreddit</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLog.slice(page * 5, page * 5 + 5).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">{row.date}</TableCell>
                    <TableCell>
                      {row.permalinkUrl ? (
                        <a
                          href={row.permalinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline max-w-xs truncate block"
                        >
                          {row.thread}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate block">
                          {row.thread}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning" className="text-xs">
                        {row.subreddit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === 'pushed' ? 'success' : 'default'}
                        className="text-xs capitalize"
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-slate-600 dark:text-slate-400">
            <span>
              Showing {page * 5 + 1}-{Math.min((page + 1) * 5, activityLog.length)} of {activityLog.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(Math.ceil(activityLog.length / 5) - 1, page + 1))}
                disabled={(page + 1) * 5 >= activityLog.length}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
