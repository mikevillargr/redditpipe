import React, { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  Collapse,
  Alert,
} from '@mui/material'
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

function TopicCard({
  topic,
  isDark,
}: {
  topic: TrendingTopic
  isDark: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [contentType, setContentType] = useState<'reply' | 'post'>('reply')
  const [generating, setGenerating] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [genPost, setGenPost] = useState<ThreadPost | null>(null)
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
      } else {
        setError(data.error || 'Failed to generate reply')
      }
    } catch { setError('Network error') }
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
      } else {
        setError(data.error || 'Failed to generate post')
      }
    } catch { setError('Network error') }
    setGenerating(null)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: isDark ? '#1e293b' : '#fff',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        borderLeft: isNews ? '3px solid #8b5cf6' : undefined,
        borderRadius: '10px',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: isDark ? '#475569' : '#cbd5e1' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
            <Chip
              icon={<CatIcon size={12} />}
              label={cat.label}
              size="small"
              sx={{
                height: 22, fontSize: '11px', fontWeight: 600,
                bgcolor: `${cat.color}15`, color: cat.color,
                border: `1px solid ${cat.color}30`,
                '& .MuiChip-icon': { color: cat.color },
              }}
            />
            <Chip
              label={isNews ? topic.subreddit : `r/${topic.subreddit}`}
              size="small"
              sx={{
                height: 22, fontSize: '11px',
                bgcolor: isDark ? '#0f172a' : '#f1f5f9', color: 'text.secondary',
              }}
            />
            {!isNews && (
              <Typography sx={{ fontSize: '11px', color: 'text.disabled', ml: 'auto' }}>
                {topic.score.toLocaleString()} pts · {topic.commentCount} comments
              </Typography>
            )}
          </Box>
          <Typography
            component="a"
            href={topic.url}
            target="_blank"
            rel="noopener"
            sx={{
              fontSize: '14px', fontWeight: 600, color: 'text.primary',
              textDecoration: 'none', display: 'block', mb: 0.5,
              '&:hover': { color: '#f97316' }, lineHeight: 1.4,
            }}
          >
            {topic.title}
          </Typography>
          {topic.snippet && (
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', lineHeight: 1.5, mb: 1 }}>
              {topic.snippet}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {!isNews && (
          <Button size="small" variant="outlined"
            startIcon={generating === 'reply' ? <CircularProgress size={12} /> : <SparklesIcon size={12} />}
            disabled={!!generating} onClick={handleGenReply}
            sx={{ fontSize: '11px', textTransform: 'none', borderColor: isDark ? '#334155' : '#e2e8f0', color: 'text.secondary', '&:hover': { borderColor: '#f97316', color: '#f97316' } }}
          >
            AI Reply
          </Button>
        )}
        <Button size="small" variant="outlined"
          startIcon={generating === 'post' ? <CircularProgress size={12} /> : <FileTextIcon size={12} />}
          disabled={!!generating} onClick={handleGenPost}
          sx={{ fontSize: '11px', textTransform: 'none', borderColor: isDark ? '#334155' : '#e2e8f0', color: 'text.secondary', '&:hover': { borderColor: '#8b5cf6', color: '#8b5cf6' } }}
        >
          AI Thread Post
        </Button>
        <Button size="small" variant="outlined"
          startIcon={<ExternalLinkIcon size={12} />}
          component="a" href={topic.url} target="_blank" rel="noopener"
          sx={{ fontSize: '11px', textTransform: 'none', borderColor: isDark ? '#334155' : '#e2e8f0', color: 'text.secondary', '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' } }}
        >
          {isNews ? 'Read Article' : 'Open Thread'}
        </Button>
        {(content || genPost) && (
          <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ ml: 'auto' }}>
            {expanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
          </IconButton>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mt: 1, fontSize: '12px' }} onClose={() => setError(null)}>{error}</Alert>}

      <Collapse in={expanded && (!!content || !!genPost)}>
        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, borderRadius: '8px' }}>
          {contentType === 'reply' && content && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary' }}>AI-Generated Reply Draft</Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                  <IconButton size="small" onClick={() => handleCopy(content)}>
                    {copied ? <CheckIcon size={13} color="#10b981" /> : <CopyIcon size={13} />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography sx={{ fontSize: '13px', color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</Typography>
            </>
          )}
          {contentType === 'post' && genPost && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary' }}>AI-Generated Thread</Typography>
                  <Chip label={`r/${genPost.subreddit}`} size="small" sx={{ height: 18, fontSize: '10px', bgcolor: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }} />
                </Box>
                <Tooltip title={copied ? 'Copied!' : 'Copy all'}>
                  <IconButton size="small" onClick={() => handleCopy(`${genPost.title}\n\n${genPost.body}`)}>
                    {copied ? <CheckIcon size={13} color="#10b981" /> : <CopyIcon size={13} />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'text.primary', mb: 1 }}>{genPost.title}</Typography>
              <Typography sx={{ fontSize: '13px', color: 'text.primary', lineHeight: 1.7, whiteSpace: 'pre-wrap', mb: 1.5 }}>{genPost.body}</Typography>
              {genPost.tips && (
                <Typography sx={{ fontSize: '11px', color: '#f59e0b', fontStyle: 'italic' }}>💡 {genPost.tips}</Typography>
              )}
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}

export function Warming() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [threadIdeas, setThreadIdeas] = useState<ThreadIdea[]>([])
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'question' | 'discussion' | 'trending' | 'news'>('all')

  const fetchTrending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/warming/trending')
      if (res.ok) {
        const data = await res.json()
        setTopics(data.topics)
        setLastFetched(data.generatedAt)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const generateIdeas = async () => {
    setIdeasLoading(true)
    setIdeasError(null)
    try {
      // Pass news titles as context for more relevant ideas
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
      } else {
        setIdeasError(data.error || 'Failed to generate ideas')
      }
    } catch {
      setIdeasError('Network error')
    }
    setIdeasLoading(false)
  }

  const filteredTopics = filter === 'all' ? topics : topics.filter((t) => t.category === filter)
  const filterCounts: Record<string, number> = { all: topics.length }
  for (const t of topics) filterCounts[t.category] = (filterCounts[t.category] || 0) + 1

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '20px' }}>
            Account Warming
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary', mt: 0.5 }}>
            Build karma with genuine engagement — trending news, Reddit threads, and AI-generated content ideas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <RefreshCwIcon size={14} />}
          disabled={loading}
          onClick={fetchTrending}
          sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' }, fontSize: '13px', fontWeight: 600, px: 2.5, borderRadius: '8px' }}
        >
          {topics.length === 0 ? 'Load Trending' : 'Refresh'}
        </Button>
      </Box>

      {/* Thread Ideas Generator */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: threadIdeas.length > 0 || ideasError ? 2 : 0, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PenLineIcon size={16} color="#f97316" />
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary' }}>
              AI Thread Ideas
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
              — Inspired by trending news and topics
            </Typography>
          </Box>
          <Button size="small" variant="outlined"
            startIcon={ideasLoading ? <CircularProgress size={12} /> : <SparklesIcon size={12} />}
            disabled={ideasLoading} onClick={generateIdeas}
            sx={{ fontSize: '12px', textTransform: 'none', borderColor: '#f97316', color: '#f97316', '&:hover': { bgcolor: 'rgba(249,115,22,0.08)' } }}
          >
            {ideasLoading ? 'Generating...' : 'Generate Ideas'}
          </Button>
        </Box>

        {ideasError && <Alert severity="error" sx={{ mb: 1.5, fontSize: '12px' }} onClose={() => setIdeasError(null)}>{ideasError}</Alert>}

        {threadIdeas.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {threadIdeas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} isDark={isDark} />
            ))}
          </Box>
        )}
      </Paper>

      {/* Filter bar */}
      {topics.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {(['all', 'news', 'question', 'discussion', 'trending'] as const).map((f) => (
            <Chip
              key={f}
              label={`${f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} (${filterCounts[f] || 0})`}
              onClick={() => setFilter(f)}
              sx={{
                height: 28, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                bgcolor: filter === f ? '#f97316' : 'transparent',
                color: filter === f ? '#fff' : 'text.secondary',
                border: `1px solid ${filter === f ? '#f97316' : (isDark ? '#334155' : '#e2e8f0')}`,
                '&:hover': { bgcolor: filter === f ? '#ea6c0a' : (isDark ? '#1e293b' : '#f1f5f9') },
              }}
            />
          ))}
          {lastFetched && (
            <Typography sx={{ fontSize: '11px', color: 'text.disabled', ml: 'auto' }}>
              Fetched {new Date(lastFetched).toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      )}

      {/* Empty state */}
      {topics.length === 0 && !loading && (
        <Paper sx={{ textAlign: 'center', py: 6, px: 3, bgcolor: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, borderRadius: '12px' }}>
          <Box sx={{ fontSize: 40, mb: 1.5 }}>🔥</Box>
          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'text.primary', mb: 1 }}>Warm up your accounts</Typography>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary', maxWidth: 420, mx: 'auto', lineHeight: 1.6 }}>
            Click "Load Trending" to discover trending news and popular Reddit threads. Build karma and maintain a healthy citation ratio by posting genuine, helpful content unrelated to your clients.
          </Typography>
        </Paper>
      )}

      {loading && topics.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={32} sx={{ color: '#f97316' }} />
          <Typography sx={{ fontSize: '13px', color: 'text.secondary', mt: 2 }}>Fetching trending news and Reddit topics...</Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filteredTopics.map((topic, i) => (
          <TopicCard key={`${topic.url}-${i}`} topic={topic} isDark={isDark} />
        ))}
      </Box>
    </Box>
  )
}

function IdeaCard({ idea, isDark }: { idea: ThreadIdea; isDark: boolean }) {
  const [genPost, setGenPost] = useState<ThreadPost | null>(null)
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
      } else {
        setError(data.error || 'Failed to generate post')
      }
    } catch { setError('Network error') }
    setGenerating(false)
  }

  const handleCopy = () => {
    if (genPost) {
      navigator.clipboard.writeText(`${genPost.title}\n\n${genPost.body}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Box sx={{ p: 1.5, bgcolor: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Chip label={`r/${idea.subreddit}`} size="small" sx={{ height: 20, fontSize: '10px', bgcolor: isDark ? '#1e293b' : '#e2e8f0' }} />
        <Button size="small"
          startIcon={generating ? <CircularProgress size={10} /> : <FileTextIcon size={10} />}
          disabled={generating} onClick={handleGenerate}
          sx={{ ml: 'auto', fontSize: '10px', textTransform: 'none', color: '#8b5cf6', minWidth: 0, px: 1, '&:hover': { bgcolor: 'rgba(139,92,246,0.08)' } }}
        >
          Generate Post
        </Button>
      </Box>
      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary', mb: 0.25 }}>{idea.title}</Typography>
      <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>{idea.hook}</Typography>

      {error && <Alert severity="error" sx={{ mt: 1, fontSize: '11px' }} onClose={() => setError(null)}>{error}</Alert>}

      <Collapse in={expanded && !!genPost}>
        {genPost && (
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: '6px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Chip label={`Post to r/${genPost.subreddit}`} size="small" sx={{ height: 18, fontSize: '10px', bgcolor: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }} />
              <Tooltip title={copied ? 'Copied!' : 'Copy all'}>
                <IconButton size="small" onClick={handleCopy}>
                  {copied ? <CheckIcon size={12} color="#10b981" /> : <CopyIcon size={12} />}
                </IconButton>
              </Tooltip>
            </Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'text.primary', mb: 0.75 }}>{genPost.title}</Typography>
            <Typography sx={{ fontSize: '12px', color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-wrap', mb: 1 }}>{genPost.body}</Typography>
            {genPost.tips && <Typography sx={{ fontSize: '10px', color: '#f59e0b', fontStyle: 'italic' }}>💡 {genPost.tips}</Typography>}
          </Box>
        )}
      </Collapse>
    </Box>
  )
}
