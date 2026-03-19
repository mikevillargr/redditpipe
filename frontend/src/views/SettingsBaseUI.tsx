import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../components/base/Button'
import { Card, CardContent } from '../components/base/Card'
import { Input } from '../components/base/Input'
import { Select } from '../components/base/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/base/Dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/base/Tabs'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import {
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  SaveIcon,
  AlertTriangleIcon,
} from 'lucide-react'

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error'

interface SectionCardProps {
  title: string
  children: React.ReactNode
}

function SectionCard({ title, children }: SectionCardProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          {title}
        </h3>
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
  return (
    <div className="relative">
      <Input
        label={label}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        {show ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
      </button>
    </div>
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
    <div className="flex items-center gap-3">
      <Button
        variant="outlined"
        size="sm"
        onClick={onTest}
        disabled={status === 'testing'}
      >
        {status === 'testing' ? 'Testing...' : 'Test'}
      </Button>
      {status === 'success' && (
        <div className="flex items-center gap-1.5">
          <CheckCircleIcon size={14} className="text-green-500" />
          <span className="text-xs text-green-500">Connected</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-1.5">
          <XCircleIcon size={14} className="text-red-500" />
          <span className="text-xs text-red-500">Failed</span>
        </div>
      )}
    </div>
  )
}

export default function SettingsBaseUI() {
  const [activeTab, setActiveTab] = useState('0')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Reddit API
  const [redditMode, setRedditMode] = useState<'public_json' | 'oauth'>('public_json')
  const [redditClientId, setRedditClientId] = useState('')
  const [redditClientSecret, setRedditClientSecret] = useState('')
  const [redditUsername, setRedditUsername] = useState('')
  const [redditPassword, setRedditPassword] = useState('')
  const [redditStatus, setRedditStatus] = useState<ConnectionStatus>('idle')

  // AI Keys
  const [anthropicKey, setAnthropicKey] = useState('')
  const [anthropicStatus, setAnthropicStatus] = useState<ConnectionStatus>('idle')
  const [zaiKey, setZaiKey] = useState('')
  const [zaiStatus, setZaiStatus] = useState<ConnectionStatus>('idle')

  // Special Instructions
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [testPreviewOpen, setTestPreviewOpen] = useState(false)
  const [testPreviewLoading, setTestPreviewLoading] = useState(false)
  const [testPreviewOutput, setTestPreviewOutput] = useState('')

  // AI Models
  const [aiModelScoring, setAiModelScoring] = useState('claude-haiku-4-5-20251001')
  const [scoringTestOutput, setScoringTestOutput] = useState('')
  const [scoringStatus, setScoringStatus] = useState<ConnectionStatus>('idle')

  const [aiModelReplies, setAiModelReplies] = useState('claude-sonnet-4-20250514')
  const [repliesTestOutput, setRepliesTestOutput] = useState('')
  const [repliesStatus, setRepliesStatus] = useState<ConnectionStatus>('idle')

  const [aiModelDetection, setAiModelDetection] = useState('claude-sonnet-4-20250514')
  const [detectionTestOutput, setDetectionTestOutput] = useState('')
  const [detectionStatus, setDetectionStatus] = useState<ConnectionStatus>('idle')

  // AI Search Tuning
  const [relevanceThreshold, setRelevanceThreshold] = useState(0.35)
  const [aiSearchContext, setAiSearchContext] = useState('')

  // Search & Scheduling
  const [searchFrequency, setSearchFrequency] = useState<'once_daily' | 'twice_daily' | 'manual'>('once_daily')
  const [searchScheduleTimes, setSearchScheduleTimes] = useState('09:00')
  const [searchTimezone, setSearchTimezone] = useState('America/New_York')
  const [searchBreadth, setSearchBreadth] = useState<'narrow' | 'balanced' | 'broad'>('balanced')
  const [maxResults, setMaxResults] = useState(10)
  const [maxAge, setMaxAge] = useState(2)
  const [maxAiCandidatesPerClient, setMaxAiCandidatesPerClient] = useState(10)
  const [maxAiCallsTotal, setMaxAiCallsTotal] = useState(50)
  const [maxOppsPerClient, setMaxOppsPerClient] = useState(15)
  const [maxOppsTotal, setMaxOppsTotal] = useState(100)
  const [searchRunning, setSearchRunning] = useState(false)
  const [showRunConfirm, setShowRunConfirm] = useState(false)
  const [searchResult, setSearchResult] = useState('')

  // Pile-On Settings
  const [pileOnEnabled, setPileOnEnabled] = useState(false)
  const [pileOnAutoCreate, setPileOnAutoCreate] = useState(false)
  const [pileOnMaxPerPrimary, setPileOnMaxPerPrimary] = useState(2)
  const [pileOnDelayMinHours, setPileOnDelayMinHours] = useState(4)
  const [pileOnDelayMaxHours, setPileOnDelayMaxHours] = useState(12)
  const [pileOnMaxPerOpportunity, setPileOnMaxPerOpportunity] = useState(3)
  const [pileOnCooldownDays, setPileOnCooldownDays] = useState(7)

  // Deletion Detection
  const [deletionCheckEnabled, setDeletionCheckEnabled] = useState(false)
  const [deletionCheckTime, setDeletionCheckTime] = useState('19:00')
  const [deletionCheckTimezone, setDeletionCheckTimezone] = useState('America/New_York')
  const [deletionCheckDays, setDeletionCheckDays] = useState(7)

  // Nuke
  const [nukeStep, setNukeStep] = useState(0)
  const [nukeConfirmText, setNukeConfirmText] = useState('')
  const [nukeLoading, setNukeLoading] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()

      setRedditMode(data.redditMode || 'public_json')
      setRedditClientId(data.redditClientId || '')
      setRedditClientSecret(data.redditClientSecret || '')
      setRedditUsername(data.redditUsername || '')
      setRedditPassword(data.redditPassword || '')
      setAnthropicKey(data.anthropicApiKey || '')
      setZaiKey(data.zaiApiKey || '')
      setSpecialInstructions(data.specialInstructions || '')
      setAiModelScoring(data.aiModelScoring || 'claude-haiku-4-5-20251001')
      setAiModelReplies(data.aiModelReplies || 'claude-sonnet-4-20250514')
      setAiModelDetection(data.aiModelDetection || 'claude-sonnet-4-20250514')
      setRelevanceThreshold(data.relevanceThreshold ?? 0.35)
      setAiSearchContext(data.aiSearchContext || '')
      setSearchFrequency(data.searchFrequency || 'once_daily')
      setSearchScheduleTimes(data.searchScheduleTimes || '09:00')
      setSearchTimezone(data.searchTimezone || 'America/New_York')
      setSearchBreadth(data.searchBreadth || 'balanced')
      setMaxResults(data.maxResults ?? 10)
      setMaxAge(data.maxAge ?? 2)
      setMaxAiCandidatesPerClient(data.maxAiCandidatesPerClient ?? 10)
      setMaxAiCallsTotal(data.maxAiCallsTotal ?? 50)
      setMaxOppsPerClient(data.maxOppsPerClient ?? 15)
      setMaxOppsTotal(data.maxOppsTotal ?? 100)
      setPileOnEnabled(data.pileOnEnabled ?? false)
      setPileOnAutoCreate(data.pileOnAutoCreate ?? false)
      setPileOnMaxPerPrimary(data.pileOnMaxPerPrimary ?? 2)
      setPileOnDelayMinHours(data.pileOnDelayMinHours ?? 4)
      setPileOnDelayMaxHours(data.pileOnDelayMaxHours ?? 12)
      setPileOnMaxPerOpportunity(data.pileOnMaxPerOpportunity ?? 3)
      setPileOnCooldownDays(data.pileOnCooldownDays ?? 7)
      setDeletionCheckEnabled(data.deletionCheckEnabled ?? false)
      setDeletionCheckTime(data.deletionCheckTime || '19:00')
      setDeletionCheckTimezone(data.deletionCheckTimezone || 'America/New_York')
      setDeletionCheckDays(data.deletionCheckDays ?? 7)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redditApiMode: redditMode,
          redditClientId,
          redditClientSecret,
          redditUsername,
          redditPassword,
          anthropicApiKey: anthropicKey,
          zaiApiKey: zaiKey,
          specialInstructions,
          aiModelScoring,
          aiModelReplies,
          aiModelDetection,
          relevanceThreshold,
          aiSearchContext,
          searchFrequency,
          searchScheduleTimes,
          searchTimezone,
          searchBreadth,
          maxResultsPerKeyword: maxResults,
          threadMaxAgeDays: maxAge,
          maxAiCandidatesPerClient,
          maxAiCallsTotal,
          maxOppsPerClient,
          maxOppsTotal,
          pileOnEnabled,
          pileOnAutoCreate,
          pileOnMaxPerPrimary,
          pileOnDelayMinHours,
          pileOnDelayMaxHours,
          pileOnMaxPerOpportunity,
          pileOnCooldownDays,
          deletionCheckEnabled,
          deletionCheckTime,
          deletionCheckTimezone,
          deletionCheckDays,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    }
  }

  const handleTestReddit = async () => {
    setRedditStatus('testing')
    try {
      const res = await fetch('/api/settings/test-reddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redditMode, redditClientId, redditClientSecret, redditUsername, redditPassword }),
      })
      if (!res.ok) throw new Error('Failed')
      setRedditStatus('success')
      setTimeout(() => setRedditStatus('idle'), 3000)
    } catch {
      setRedditStatus('error')
      setTimeout(() => setRedditStatus('idle'), 3000)
    }
  }

  const handleTestAnthropic = async () => {
    setAnthropicStatus('testing')
    try {
      const res = await fetch('/api/settings/test-anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: anthropicKey }),
      })
      if (!res.ok) throw new Error('Failed')
      setAnthropicStatus('success')
      setTimeout(() => setAnthropicStatus('idle'), 3000)
    } catch {
      setAnthropicStatus('error')
      setTimeout(() => setAnthropicStatus('idle'), 3000)
    }
  }

  const handleTestZai = async () => {
    setZaiStatus('testing')
    try {
      const res = await fetch('/api/settings/test-zai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: zaiKey }),
      })
      if (!res.ok) throw new Error('Failed')
      setZaiStatus('success')
      setTimeout(() => setZaiStatus('idle'), 3000)
    } catch {
      setZaiStatus('error')
      setTimeout(() => setZaiStatus('idle'), 3000)
    }
  }

  const handleTestPreview = async () => {
    setTestPreviewLoading(true)
    setTestPreviewOutput('')
    try {
      const res = await fetch('/api/settings/test-special-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: specialInstructions }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setTestPreviewOutput(data.output || 'No output')
    } catch (err) {
      setTestPreviewOutput('Error: ' + (err instanceof Error ? err.message : 'Failed'))
    } finally {
      setTestPreviewLoading(false)
    }
  }

  const handleTestScoring = async () => {
    setScoringStatus('testing')
    setScoringTestOutput('')
    try {
      const res = await fetch('/api/settings/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: aiModelScoring, type: 'scoring' }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setScoringTestOutput(data.output || 'Success')
      setScoringStatus('success')
      setTimeout(() => setScoringStatus('idle'), 5000)
    } catch (err) {
      setScoringTestOutput('Error: ' + (err instanceof Error ? err.message : 'Failed'))
      setScoringStatus('error')
      setTimeout(() => setScoringStatus('idle'), 5000)
    }
  }

  const handleTestReplies = async () => {
    setRepliesStatus('testing')
    setRepliesTestOutput('')
    try {
      const res = await fetch('/api/settings/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: aiModelReplies, type: 'replies' }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRepliesTestOutput(data.output || 'Success')
      setRepliesStatus('success')
      setTimeout(() => setRepliesStatus('idle'), 5000)
    } catch (err) {
      setRepliesTestOutput('Error: ' + (err instanceof Error ? err.message : 'Failed'))
      setRepliesStatus('error')
      setTimeout(() => setRepliesStatus('idle'), 5000)
    }
  }

  const handleTestDetection = async () => {
    setDetectionStatus('testing')
    setDetectionTestOutput('')
    try {
      const res = await fetch('/api/settings/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: aiModelDetection, type: 'detection' }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setDetectionTestOutput(data.output || 'Success')
      setDetectionStatus('success')
      setTimeout(() => setDetectionStatus('idle'), 5000)
    } catch (err) {
      setDetectionTestOutput('Error: ' + (err instanceof Error ? err.message : 'Failed'))
      setDetectionStatus('error')
      setTimeout(() => setDetectionStatus('idle'), 5000)
    }
  }

  const handleRunSearch = async () => {
    if (!showRunConfirm) {
      setShowRunConfirm(true)
      setTimeout(() => setShowRunConfirm(false), 5000)
      return
    }
    setShowRunConfirm(false)
    setSearchRunning(true)
    setSearchResult('')
    try {
      const res = await fetch('/api/search/run', { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      setSearchResult('Search started successfully')
    } catch (err) {
      setSearchResult('Error: ' + (err instanceof Error ? err.message : 'Failed'))
    } finally {
      setSearchRunning(false)
    }
  }

  const handleNukeOpportunities = async () => {
    setNukeLoading(true)
    try {
      const res = await fetch('/api/opportunities/all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_ALL_OPPORTUNITIES' }),
      })
      if (!res.ok) throw new Error('Failed')
      setNukeStep(0)
      setNukeConfirmText('')
      alert('All opportunities deleted successfully')
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed'))
    } finally {
      setNukeLoading(false)
    }
  }

  const modelOptions = [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Cheapest)' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (May 2025)' },
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Sep 2025)' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Latest)' },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4 (May 2025)' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Most Capable)' },
  ]

  const timezones = [
    'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
    'America/Chicago', 'America/New_York', 'America/Sao_Paulo',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
    'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
    'Asia/Shanghai', 'Asia/Manila', 'Asia/Tokyo', 'Asia/Seoul',
    'Australia/Sydney', 'Pacific/Auckland', 'UTC',
  ].map(tz => ({ value: tz, label: tz.replace(/_/g, ' ') }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Configure API keys, AI models, search parameters, and advanced features</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="0">API Keys</TabsTrigger>
          <TabsTrigger value="1">AI Functions</TabsTrigger>
          <TabsTrigger value="2">Search & Scheduling</TabsTrigger>
          <TabsTrigger value="3">Advanced</TabsTrigger>
        </TabsList>

        {/* Tab 0: API Keys */}
        <TabsContent value="0">
          <SectionCard title="Reddit API">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">API Mode</label>
                <div className="flex gap-2">
                  <Button
                    variant={redditMode === 'public_json' ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setRedditMode('public_json')}
                  >
                    Public JSON
                  </Button>
                  <Button
                    variant={redditMode === 'oauth' ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setRedditMode('oauth')}
                  >
                    OAuth
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {redditMode === 'public_json'
                    ? 'Uses public Reddit JSON endpoints. No authentication required but has rate limits.'
                    : 'Uses OAuth for higher rate limits. Requires Reddit app credentials.'}
                </p>
              </div>

              {redditMode === 'oauth' && (
                <>
                  <Input
                    label="Client ID"
                    value={redditClientId}
                    onChange={(e) => setRedditClientId(e.target.value)}
                    placeholder="Enter Reddit app client ID"
                  />
                  <PasswordField
                    label="Client Secret"
                    value={redditClientSecret}
                    onChange={setRedditClientSecret}
                    placeholder="Enter Reddit app client secret"
                  />
                  <Input
                    label="Username"
                    value={redditUsername}
                    onChange={(e) => setRedditUsername(e.target.value)}
                    placeholder="Reddit username"
                  />
                  <PasswordField
                    label="Password"
                    value={redditPassword}
                    onChange={setRedditPassword}
                    placeholder="Reddit password"
                  />
                  <ConnectionTestButton onTest={handleTestReddit} status={redditStatus} />
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="AI API Keys">
            <div className="space-y-4">
              <div>
                <PasswordField
                  label="Anthropic API Key"
                  value={anthropicKey}
                  onChange={setAnthropicKey}
                  placeholder="sk-ant-..."
                />
                <div className="mt-2">
                  <ConnectionTestButton onTest={handleTestAnthropic} status={anthropicStatus} />
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <PasswordField
                  label="Z.ai API Key (Optional)"
                  value={zaiKey}
                  onChange={setZaiKey}
                  placeholder="Optional for future integrations"
                />
                <div className="mt-2">
                  <ConnectionTestButton onTest={handleTestZai} status={zaiStatus} />
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Tab 1: AI Functions */}
        <TabsContent value="1">
          <SectionCard title="Special Instructions">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Custom AI Instructions
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={6}
                  placeholder="e.g. Always mention our 24/7 support team. Never discuss pricing in initial comments..."
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  These instructions are injected into every AI reply generation. Use this to enforce brand voice, mention key features, or avoid certain topics.
                </p>
              </div>
              <Button variant="outlined" size="sm" onClick={() => setTestPreviewOpen(true)}>
                Test Preview
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="AI Model Selection">
            <div className="space-y-6">
              <div>
                <Select
                  label="Scoring Model"
                  value={aiModelScoring}
                  onChange={(val) => val && setAiModelScoring(val)}
                  options={modelOptions}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Used for relevance scoring. Haiku is fastest and cheapest.
                </p>
                <div className="mt-2">
                  <ConnectionTestButton onTest={handleTestScoring} status={scoringStatus} />
                </div>
                {scoringTestOutput && (
                  <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap">
                    {scoringTestOutput}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <Select
                  label="Replies Model"
                  value={aiModelReplies}
                  onChange={(val) => val && setAiModelReplies(val)}
                  options={modelOptions}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Used for generating comment replies. Sonnet recommended for quality.
                </p>
                <div className="mt-2">
                  <ConnectionTestButton onTest={handleTestReplies} status={repliesStatus} />
                </div>
                {repliesTestOutput && (
                  <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap">
                    {repliesTestOutput}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <Select
                  label="Detection Model"
                  value={aiModelDetection}
                  onChange={(val) => val && setAiModelDetection(val)}
                  options={modelOptions}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Used for auto-detecting client keywords and intent.
                </p>
                <div className="mt-2">
                  <ConnectionTestButton onTest={handleTestDetection} status={detectionStatus} />
                </div>
                {detectionTestOutput && (
                  <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap">
                    {detectionTestOutput}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="AI Search Tuning">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Relevance Threshold: <strong>{Math.round(relevanceThreshold * 100)}%</strong>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Opportunities below this score will be automatically filtered out. Higher = stricter.
                </p>
                <div className="px-2">
                  <div className="flex justify-between mb-1">
                    {[0, 25, 50, 75, 100].map((v) => (
                      <span key={v} className="text-xs text-slate-500">{v}%</span>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={relevanceThreshold}
                    onChange={(e) => setRelevanceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  AI Scoring Instructions
                </label>
                <textarea
                  value={aiSearchContext}
                  onChange={(e) => setAiSearchContext(e.target.value)}
                  rows={4}
                  placeholder="e.g. We only target English-language B2B discussions. Ignore hiring posts, local community threads, educational tutorials..."
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  General rules injected into the AI scoring prompt. These apply across all clients to filter out irrelevant results.
                </p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Tab 2: Search & Scheduling */}
        <TabsContent value="2">
          <SectionCard title="Search Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Search Schedule
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={searchFrequency === 'once_daily' ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setSearchFrequency('once_daily')}
                  >
                    Once Daily
                  </Button>
                  <Button
                    variant={searchFrequency === 'twice_daily' ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setSearchFrequency('twice_daily')}
                  >
                    Twice Daily
                  </Button>
                  <Button
                    variant={searchFrequency === 'manual' ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setSearchFrequency('manual')}
                  >
                    Manual Only
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {searchFrequency === 'once_daily'
                    ? 'One full digest per day. Conserves tokens and gives you a complete batch to work through.'
                    : searchFrequency === 'twice_daily'
                      ? 'Two digests per day (morning + afternoon). Good for active teams who check in twice.'
                      : 'Searches only run when you click "Run Search Now" below.'}
                </p>
              </div>

              {searchFrequency !== 'manual' && (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        label={searchFrequency === 'twice_daily' ? 'Schedule Times (HH:MM)' : 'Schedule Time (HH:MM)'}
                        value={searchScheduleTimes}
                        onChange={(e) => setSearchScheduleTimes(e.target.value)}
                        placeholder={searchFrequency === 'twice_daily' ? '09:00, 17:00' : '09:00'}
                      />
                    </div>
                    <div className="flex-1">
                      <Select
                        label="Timezone"
                        value={searchTimezone}
                        onChange={(val) => val && setSearchTimezone(val)}
                        options={timezones}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                    {searchFrequency === 'twice_daily'
                      ? 'Two times in 24h format, e.g. "09:00, 17:00".'
                      : 'Time in 24h format, e.g. "09:00".'}
                  </p>
                </>
              )}

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Search Breadth
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={searchBreadth === 'narrow' ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setSearchBreadth('narrow')}
                  >
                    Narrow
                  </Button>
                  <Button
                    variant={searchBreadth === 'balanced' ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setSearchBreadth('balanced')}
                  >
                    Balanced
                  </Button>
                  <Button
                    variant={searchBreadth === 'broad' ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setSearchBreadth('broad')}
                  >
                    Broad
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {searchBreadth === 'narrow'
                    ? 'Exact keyword phrases only. Fewer results but highly targeted.'
                    : searchBreadth === 'broad'
                      ? 'Expands keywords into 2-word and 3-word sub-queries. More results, relies on AI scoring to filter noise.'
                      : 'Expands long keywords into 3-word sub-queries. Good balance of coverage and precision.'}
                </p>
              </div>

              <Input
                label="Max Results Per Keyword"
                type="number"
                value={maxResults.toString()}
                onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
                helperText="Max Reddit threads fetched per keyword. Higher = more threads but slower searches."
              />

              <Input
                label="Thread Max Age (days)"
                type="number"
                value={maxAge.toString()}
                onChange={(e) => setMaxAge(parseInt(e.target.value) || 2)}
                helperText="Ignore threads older than this. Older threads = less engagement. Recommended: 2-7 days."
              />

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Pipeline Limits (Scalability)</h4>
                <div className="space-y-4">
                  <Input
                    label="Max AI Candidates Per Client"
                    type="number"
                    value={maxAiCandidatesPerClient.toString()}
                    onChange={(e) => setMaxAiCandidatesPerClient(parseInt(e.target.value) || 10)}
                    helperText="Max threads per client sent to AI for scoring. Higher = more AI calls."
                  />
                  <Input
                    label="Max AI Calls Total"
                    type="number"
                    value={maxAiCallsTotal.toString()}
                    onChange={(e) => setMaxAiCallsTotal(parseInt(e.target.value) || 50)}
                    helperText="Total AI calls per search run across all clients. Prevents runaway costs."
                  />
                  <Input
                    label="Max Opps Per Client"
                    type="number"
                    value={maxOppsPerClient.toString()}
                    onChange={(e) => setMaxOppsPerClient(parseInt(e.target.value) || 15)}
                    helperText="Max opportunities created per client per run. Limits drip to avoid overwhelm."
                  />
                  <Input
                    label="Max Opps Total"
                    type="number"
                    value={maxOppsTotal.toString()}
                    onChange={(e) => setMaxOppsTotal(parseInt(e.target.value) || 100)}
                    helperText="Total opportunities per run across all clients. Final safety cap."
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Adjust these as you add more clients. Higher values = more AI cost and processing time.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                {showRunConfirm && (
                  <Alert variant="warning" className="mb-3">
                    This will search for all active clients now. Click the button again to confirm.
                  </Alert>
                )}
                <Button
                  variant={showRunConfirm ? 'secondary' : 'primary'}
                  fullWidth
                  disabled={searchRunning}
                  onClick={handleRunSearch}
                  className="flex items-center justify-center gap-2"
                >
                  <PlayIcon size={16} />
                  {searchRunning ? 'Searching...' : showRunConfirm ? 'Click again to confirm' : 'Run Search Now'}
                </Button>
                {searchResult && (
                  <Alert variant={searchResult.startsWith('Error') ? 'error' : 'success'} className="mt-3">
                    {searchResult}
                  </Alert>
                )}
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Tab 3: Advanced */}
        <TabsContent value="3">
          <SectionCard title="Pile-On Settings">
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure automatic pile-on comment generation. When a primary comment is verified as published, the system can automatically create pile-on opportunities for secondary accounts to reinforce the message.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Pile-On Feature</label>
                <div className="flex gap-2">
                  <Button
                    variant={!pileOnEnabled ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setPileOnEnabled(false)}
                  >
                    Disabled
                  </Button>
                  <Button
                    variant={pileOnEnabled ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setPileOnEnabled(true)}
                  >
                    Enabled
                  </Button>
                </div>
              </div>

              {pileOnEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Auto-Create Pile-Ons</label>
                    <div className="flex gap-2">
                      <Button
                        variant={!pileOnAutoCreate ? 'primary' : 'outlined'}
                        size="sm"
                        onClick={() => setPileOnAutoCreate(false)}
                      >
                        No - Manual Only
                      </Button>
                      <Button
                        variant={pileOnAutoCreate ? 'primary' : 'outlined'}
                        size="sm"
                        onClick={() => setPileOnAutoCreate(true)}
                      >
                        Yes - Automatic
                      </Button>
                    </div>
                  </div>

                  <Input
                    label="Max Pile-Ons Per Primary"
                    type="number"
                    value={pileOnMaxPerPrimary.toString()}
                    onChange={(e) => setPileOnMaxPerPrimary(parseInt(e.target.value) || 2)}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Min Delay (hours)"
                      type="number"
                      value={pileOnDelayMinHours.toString()}
                      onChange={(e) => setPileOnDelayMinHours(parseInt(e.target.value) || 4)}
                    />
                    <Input
                      label="Max Delay (hours)"
                      type="number"
                      value={pileOnDelayMaxHours.toString()}
                      onChange={(e) => setPileOnDelayMaxHours(parseInt(e.target.value) || 12)}
                    />
                  </div>

                  <Input
                    label="Max Pile-Ons Per Opportunity"
                    type="number"
                    value={pileOnMaxPerOpportunity.toString()}
                    onChange={(e) => setPileOnMaxPerOpportunity(parseInt(e.target.value) || 3)}
                  />

                  <Input
                    label="Cooldown Period (days)"
                    type="number"
                    value={pileOnCooldownDays.toString()}
                    onChange={(e) => setPileOnCooldownDays(parseInt(e.target.value) || 7)}
                  />
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Deletion Detection">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Enable Deletion Checks</label>
                <div className="flex gap-2">
                  <Button
                    variant={!deletionCheckEnabled ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setDeletionCheckEnabled(false)}
                  >
                    Disabled
                  </Button>
                  <Button
                    variant={deletionCheckEnabled ? 'primary' : 'outlined'}
                    size="sm"
                    onClick={() => setDeletionCheckEnabled(true)}
                  >
                    Enabled
                  </Button>
                </div>
              </div>

              {deletionCheckEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Check Time (HH:MM)"
                      value={deletionCheckTime}
                      onChange={(e) => setDeletionCheckTime(e.target.value)}
                      placeholder="19:00"
                    />
                    <Select
                      label="Timezone"
                      value={deletionCheckTimezone}
                      onChange={(val) => val && setDeletionCheckTimezone(val)}
                      options={timezones}
                    />
                  </div>

                  <Input
                    label="Check Comments From Last N Days"
                    type="number"
                    value={deletionCheckDays.toString()}
                    onChange={(e) => setDeletionCheckDays(parseInt(e.target.value) || 7)}
                  />
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Dangerous Actions">
            <div className="space-y-4">
              <Alert variant="warning">
                ⚠️ These actions cannot be undone. Use with extreme caution.
              </Alert>

              <Button
                variant="danger"
                onClick={() => setNukeStep(1)}
              >
                Clear All Opportunities
              </Button>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-4 pb-4 border-t border-slate-200 dark:border-slate-700 mt-6">
        {saveError && (
          <Alert variant="error" className="mb-3">
            {saveError}
          </Alert>
        )}
        <Button
          variant={saved ? 'secondary' : 'primary'}
          fullWidth
          onClick={handleSave}
          disabled={saved}
          className="flex items-center justify-center gap-2 py-3 text-base"
        >
          {saved ? '✓ Saved' : 'Save All Settings'}
        </Button>
      </div>

      {/* Test Preview Dialog */}
      <Dialog open={testPreviewOpen} onOpenChange={setTestPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Special Instructions</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              This will test your special instructions with a sample prompt to see how they affect AI output.
            </p>
            {testPreviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : testPreviewOutput ? (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-96 overflow-auto">
                {testPreviewOutput}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No output yet. Click "Run Test" to see results.</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outlined" onClick={() => setTestPreviewOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={handleTestPreview} disabled={testPreviewLoading}>
              Run Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nuke Confirmation Dialogs */}
      <Dialog open={nukeStep === 1} onOpenChange={(open) => !open && setNukeStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangleIcon size={20} /> Clear All Opportunities?
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              This will permanently delete <strong>all opportunities</strong> and <strong>all dismissal logs</strong> from the database.
            </p>
            <p className="text-sm text-red-500 font-semibold">
              This action is irreversible.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outlined" onClick={() => setNukeStep(0)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setNukeStep(2)}>
              Yes, I'm Sure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nukeStep === 2} onOpenChange={(open) => !open && setNukeStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangleIcon size={20} /> Final Confirmation
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Type <strong>DELETE</strong> below to confirm you want to permanently erase all opportunities.
            </p>
            <Input
              value={nukeConfirmText}
              onChange={(e) => setNukeConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outlined" onClick={() => { setNukeStep(0); setNukeConfirmText('') }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={nukeConfirmText !== 'DELETE' || nukeLoading}
              onClick={handleNukeOpportunities}
            >
              {nukeLoading ? 'Deleting...' : 'Permanently Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
