import React, { useState, useCallback, useEffect } from 'react'
import { copyToClipboard } from '../utils/clipboard'
import { Button } from '../components/base/Button'
import { Card, CardContent } from '../components/base/Card'
import { Badge } from '../components/base/Badge'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { IconButton } from '../components/base/IconButton'
import {
  RefreshCwIcon,
  ExternalLinkIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  CheckIcon,
  TrendingUpIcon,
  HelpCircleIcon,
  MessageCircleIcon,
  PenLineIcon,
  NewspaperIcon,
  FileTextIcon,
} from 'lucide-react'

interface TrendingTopic {
  title: string
  subreddit: string
  url: string
  score: number
  commentCount: number
  snippet: string
  suggestedAction: 'reply' | 'new_thread'
  category: 'trending' | 'discussion' | 'question' | 'news'
  source: 'reddit' | 'news'
}

interface ThreadIdea {
  title: string
  subreddit: string
  hook: string
}

interface ThreadPost {
  title: string
  body: string
  subreddit: string
  tips: string
}

const categoryConfig: Record<string, { label: string; color: string; icon: typeof TrendingUpIcon }> = {
  trending: { label: 'Trending', color: '#f97316', icon: TrendingUpIcon },
  discussion: { label: 'Discussion', color: '#3b82f6', icon: MessageCircleIcon },
  question: { label: 'Question', color: '#10b981', icon: HelpCircleIcon },
  news: { label: 'News', color: '#8b5cf6', icon: NewspaperIcon },
}

function TopicCard({ topic }: { topic: TrendingTopic }) {
  const storageKey = `topic_${topic.url.replace(/[^a-zA-Z0-9]/g, '_')}`
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState<string | null>(() => {
    const stored = localStorage.getItem(`${storageKey}_reply`)
    return stored || null
  })
  const [contentType, setContentType] = useState<'reply' | 'post'>('reply')
  const [generating, setGenerating] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [genPost, setGenPost] = useState<ThreadPost | null>(() => {
    const stored = localStorage.getItem(`${storageKey}_post`)
    return stored ? JSON.parse(stored) : null
  })
  const [error, setError] = useState<string | null>(null)
  const cat = categoryConfig[topic.category] || categoryConfig.trending
  const CatIcon = cat.icon
  const isNews = topic.source === 'news'

  const handleGenReply = async () => {
    setGenerating('reply')
    setExpanded(true)
    setError(null)
    setGenPost(null)
    try {
      const res = await fetch('/api/warming/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reply_draft', topic: topic.title, subreddit: topic.subreddit }),
      })
      const data = await res.json()
      if (res.ok && data.reply) {
        setContent(data.reply)
        setContentType('reply')
        localStorage.setItem(`${storageKey}_reply`, data.reply)
      } else {
        setError(data.error || 'Failed to generate reply')
      }
    } catch {
      setError('Network error')
    }
    setGenerating(null)
  }

  const handleGenPost = async () => {
    setGenerating('post')
    setExpanded(true)
    setError(null)
    setContent(null)
    try {
      const res = await fetch('/api/warming/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'thread_post', topic: topic.title }),
      })
      const data = await res.json()
      if (res.ok && data.post) {
        setGenPost(data.post)
        setContentType('post')
        localStorage.setItem(`${storageKey}_post`, JSON.stringify(data.post))
      } else {
        setError(data.error || 'Failed to generate post')
      }
    } catch {
      setError('Network error')
    }
    setGenerating(null)
  }

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className={`${isNews ? 'border-l-4 border-l-purple-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                style={{
                  backgroundColor: `${cat.color}15`,
                  color: cat.color,
                  border: `1px solid ${cat.color}30`,
                }}
              >
                <CatIcon size={12} />
                {cat.label}
              </span>
              <Badge variant="default">{isNews ? topic.subreddit : `r/${topic.subreddit}`}</Badge>
              {!isNews && (
                <span className="text-xs text-slate-500 ml-auto">
                  {topic.score.toLocaleString()} pts · {topic.commentCount} comments
                </span>
              )}
            </div>
            <a
              href={topic.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-orange-500 block mb-1 leading-tight"
            >
              {topic.title}
            </a>
            {topic.snippet && (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                {topic.snippet}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {!isNews && (
            <Button
              variant="outlined"
              size="sm"
              onClick={handleGenReply}
              disabled={!!generating}
            >
              {generating === 'reply' ? <Spinner size="sm" className="mr-2" /> : <SparklesIcon size={12} className="mr-2" />}
              AI Reply
            </Button>
          )}
          <Button
            variant="outlined"
            size="sm"
            onClick={handleGenPost}
            disabled={!!generating}
          >
            {generating === 'post' ? <Spinner size="sm" className="mr-2" /> : <FileTextIcon size={12} className="mr-2" />}
            AI Thread Post
          </Button>
          <Button
            variant="outlined"
            size="sm"
            onClick={() => window.open(topic.url, '_blank')}
          >
            <ExternalLinkIcon size={12} className="mr-2" />
            {isNews ? 'Read Article' : 'Open Thread'}
          </Button>
          {(content || genPost) && (
            <IconButton size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="ml-auto">
              {expanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
            </IconButton>
          )}
        </div>

        {error && (
          <Alert variant="error" className="mt-2">
            {error}
          </Alert>
        )}

        {expanded && (content || genPost) && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {contentType === 'reply' && content && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    AI-Generated Reply Draft
                  </span>
                  <IconButton size="sm" variant="ghost" onClick={() => handleCopy(content)}>
                    {copied ? <CheckIcon size={13} className="text-green-500" /> : <CopyIcon size={13} />}
                  </IconButton>
                </div>
                <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {content}
                </p>
              </>
            )}
            {contentType === 'post' && genPost && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      AI-Generated Thread
                    </span>
                    <Badge variant="info">r/{genPost.subreddit}</Badge>
                  </div>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(`${genPost.title}\n\n${genPost.body}`)}
                  >
                    {copied ? <CheckIcon size={13} className="text-green-500" /> : <CopyIcon size={13} />}
                  </IconButton>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">{genPost.title}</h4>
                <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap mb-3">
                  {genPost.body}
                </p>
                {genPost.tips && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 italic">💡 {genPost.tips}</p>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function IdeaCard({ idea }: { idea: ThreadIdea }) {
  const storageKey = `idea_${idea.title.replace(/[^a-zA-Z0-9]/g, '_')}_${idea.subreddit}`
  const [genPost, setGenPost] = useState<ThreadPost | null>(() => {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : null
  })
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setExpanded(true)
    setError(null)
    try {
      const res = await fetch('/api/warming/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'thread_post', topic: idea.title, subreddit: idea.subreddit }),
      })
      const data = await res.json()
      if (res.ok && data.post) {
        setGenPost(data.post)
        localStorage.setItem(storageKey, JSON.stringify(data.post))
      } else {
        setError(data.error || 'Failed to generate post')
      }
    } catch {
      setError('Network error')
    }
    setGenerating(false)
  }

  const handleCopy = async () => {
    if (genPost) {
      const text = `${genPost.title}\n\n${genPost.body}`
      const success = await copyToClipboard(text)
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="default">r/{idea.subreddit}</Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
          className="ml-auto text-purple-600 hover:text-purple-700"
        >
          {generating ? <Spinner size="sm" className="mr-1" /> : <FileTextIcon size={10} className="mr-1" />}
          Generate Post
        </Button>
      </div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{idea.title}</h4>
      <p className="text-xs text-slate-600 dark:text-slate-400">{idea.hook}</p>

      {error && (
        <Alert variant="error" className="mt-2">
          {error}
        </Alert>
      )}

      {expanded && genPost && (
        <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="info">Post to r/{genPost.subreddit}</Badge>
            <IconButton size="sm" variant="ghost" onClick={handleCopy}>
              {copied ? <CheckIcon size={12} className="text-green-500" /> : <CopyIcon size={12} />}
            </IconButton>
          </div>
          <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">{genPost.title}</h5>
          <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap mb-2">
            {genPost.body}
          </p>
          {genPost.tips && (
            <p className="text-xs text-amber-600 dark:text-amber-400 italic">💡 {genPost.tips}</p>
          )}
        </div>
      )}
    </div>
  )
}

const STORAGE_KEY_TOPICS = 'karma_farming_topics'
const STORAGE_KEY_IDEAS = 'karma_farming_ideas'
const STORAGE_KEY_LAST_FETCH = 'karma_farming_last_fetch'
const STORAGE_KEY_LAST_AUTO_REFRESH = 'karma_farming_last_auto_refresh'

export function KarmaFarmingBaseUI() {
  const [activeTab, setActiveTab] = useState(0)
  const [topics, setTopics] = useState<TrendingTopic[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_TOPICS)
    return stored ? JSON.parse(stored) : []
  })
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_LAST_FETCH)
  })
  const [threadIdeas, setThreadIdeas] = useState<ThreadIdea[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_IDEAS)
    return stored ? JSON.parse(stored) : []
  })
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'question' | 'discussion' | 'trending' | 'news'>('all')
  const [timezone, setTimezone] = useState<string>('America/New_York')

  const fetchTrending = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      if (forceRefresh) {
        localStorage.removeItem(STORAGE_KEY_TOPICS)
        localStorage.removeItem(STORAGE_KEY_LAST_FETCH)
      }
      const res = await fetch(`/api/warming/trending?t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setTopics(data.topics)
        setLastFetched(data.generatedAt)
        localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(data.topics))
        localStorage.setItem(STORAGE_KEY_LAST_FETCH, data.generatedAt)
      } else {
        setError('Failed to fetch trending topics')
      }
    } catch (err) {
      setError('Network error')
    }
    setLoading(false)
  }, [])

  const generateIdeas = async () => {
    setIdeasLoading(true)
    setIdeasError(null)
    try {
      const newsTopics = topics.filter((t) => t.source === 'news').map((t) => t.title).slice(0, 5)
      const newsContext = newsTopics.length > 0 ? newsTopics.join('\n') : undefined
      const res = await fetch('/api/warming/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'thread_ideas', newsContext }),
      })
      const data = await res.json()
      if (res.ok && data.ideas) {
        setThreadIdeas(data.ideas)
        localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(data.ideas))
      } else {
        setIdeasError(data.error || 'Failed to generate ideas')
      }
    } catch {
      setIdeasError('Network error')
    }
    setIdeasLoading(false)
  }

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          setTimezone(data.searchTimezone || 'America/New_York')
        }
      } catch {
        /* ignore */
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    const checkAndRefresh = () => {
      try {
        const now = new Date()
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })
        const parts = formatter.formatToParts(now)
        const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0')
        const day = parts.find((p) => p.type === 'day')?.value
        const month = parts.find((p) => p.type === 'month')?.value
        const year = parts.find((p) => p.type === 'year')?.value
        const dateKey = `${year}-${month}-${day}`

        const lastRefresh = localStorage.getItem(STORAGE_KEY_LAST_AUTO_REFRESH)

        if (hour === 10 && lastRefresh !== dateKey) {
          console.log('[KarmaFarming] Auto-refreshing trending topics at 10am')
          fetchTrending(true)
          localStorage.setItem(STORAGE_KEY_LAST_AUTO_REFRESH, dateKey)
        }
      } catch (err) {
        console.error('[KarmaFarming] Auto-refresh check failed:', err)
      }
    }

    const interval = setInterval(checkAndRefresh, 60_000)
    checkAndRefresh()

    return () => clearInterval(interval)
  }, [timezone, fetchTrending])

  const filteredTopics = filter === 'all' ? topics : topics.filter((t) => t.category === filter)
  const filterCounts: Record<string, number> = { all: topics.length }
  for (const t of topics) filterCounts[t.category] = (filterCounts[t.category] || 0) + 1

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Karma Farming</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Build karma with genuine engagement — AI-generated thread ideas and trending Reddit topics
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab(0)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 0
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <TrendingUpIcon size={14} />
          Trending Topics
        </button>
        <button
          onClick={() => setActiveTab(1)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 1
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <PenLineIcon size={14} />
          AI Thread Ideas
        </button>
      </div>

      {/* Tab 0: Trending Topics */}
      {activeTab === 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Discover trending news and popular Reddit threads to engage with.
            </p>
            <Button variant="primary" size="sm" onClick={() => fetchTrending(true)} disabled={loading}>
              {loading ? <Spinner size="sm" className="mr-2" /> : <RefreshCwIcon size={12} className="mr-2" />}
              {topics.length === 0 ? 'Load Trending' : 'Refresh'}
            </Button>
          </div>

          {topics.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {(['all', 'news', 'question', 'discussion', 'trending'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filter === f
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f] || 0})
                </button>
              ))}
              {lastFetched && (
                <span className="text-xs text-slate-500 ml-auto">
                  Fetched {new Date(lastFetched).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          {topics.length === 0 && !loading && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-4xl mb-3">🔥</div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Trending Topics
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Click "Load Trending" to discover trending news and popular Reddit threads. Build karma and
                  maintain a healthy posting ratio.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && topics.length === 0 && (
            <div className="text-center py-12">
              <Spinner size="lg" className="mx-auto mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Fetching trending news and Reddit topics...
              </p>
            </div>
          )}

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            {filteredTopics.map((topic, i) => (
              <TopicCard key={`${topic.url}-${i}`} topic={topic} />
            ))}
          </div>
        </div>
      )}

      {/* Tab 1: AI Thread Ideas */}
      {activeTab === 1 && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Generate original thread ideas inspired by trending news and topics. Post these to build karma.
              {threadIdeas.length > 0 && (
                <span className="text-green-500 ml-2">✓ {threadIdeas.length} ideas cached</span>
              )}
            </p>
            <Button variant="primary" size="sm" onClick={generateIdeas} disabled={ideasLoading}>
              {ideasLoading ? <Spinner size="sm" className="mr-2" /> : <SparklesIcon size={12} className="mr-2" />}
              {ideasLoading ? 'Generating...' : threadIdeas.length > 0 ? 'Refresh Ideas' : 'Generate Ideas'}
            </Button>
          </div>

          {ideasError && (
            <Alert variant="error" className="mb-4">
              {ideasError}
            </Alert>
          )}

          {threadIdeas.length === 0 && !ideasLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-4xl mb-3">✍️</div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  AI Thread Ideas
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Click "Generate Ideas" to get AI-crafted thread ideas for popular subreddits. Each idea comes
                  with a title, hook, and suggested subreddit.
                </p>
              </CardContent>
            </Card>
          )}

          {ideasLoading && threadIdeas.length === 0 && (
            <div className="text-center py-12">
              <Spinner size="lg" className="mx-auto mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Generating thread ideas...</p>
            </div>
          )}

          {threadIdeas.length > 0 && (
            <div className="flex flex-col gap-3">
              {threadIdeas.map((idea, i) => (
                <IdeaCard key={i} idea={idea} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
