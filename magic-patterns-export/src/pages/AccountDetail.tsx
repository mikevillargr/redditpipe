import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TablePagination,
} from '@mui/material'
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  Trash2Icon,
  SaveIcon,
  XIcon,
} from 'lucide-react'
import { RedditIcon } from '../components/RedditIcon'
interface AccountDetailProps {
  accountId: string | null
  onBack: () => void
}
const sampleComments = [
  {
    id: '1',
    subreddit: 'r/fitness',
    text: 'tbh the best thing I did was stop trying to optimize everything and just show up consistently. 3x/week full body, progressive overload, done. Took me 2 years to figure that out.',
    score: 234,
    date: '2 weeks ago',
  },
  {
    id: '2',
    subreddit: 'r/loseit',
    text: 'fwiw tracking calories is the single highest leverage thing you can do. Everything else is noise until you have that dialed in. I use a food scale and it changed everything.',
    score: 89,
    date: '3 weeks ago',
  },
  {
    id: '3',
    subreddit: 'r/gym',
    text: "imo the barbell is still king for building strength. Machines have their place (especially for isolation) but if you're not squatting and deadlifting you're leaving gains on the table.",
    score: 156,
    date: '1 month ago',
  },
  {
    id: '4',
    subreddit: 'r/nutrition',
    text: "protein timing matters way less than total daily protein. Get your 0.8-1g per lb bodyweight and you're good. The rest is just marketing.",
    score: 67,
    date: '1 month ago',
  },
  {
    id: '5',
    subreddit: 'r/running',
    text: 'zone 2 cardio is underrated for recovery. I added 2x 45min easy runs per week and my strength training actually improved (less fatigue, better sleep).',
    score: 43,
    date: '6 weeks ago',
  },
  {
    id: '6',
    subreddit: 'r/bodyweightfitness',
    text: "rings are the best investment I've made for home training. Rings rows, dips, and push-ups cover 80% of what you need. Plus they're portable.",
    score: 112,
    date: '2 months ago',
  },
]
const activityLog = [
  {
    date: '2025-02-28',
    thread:
      'Looking for a gym program that actually works for busy professionals',
    subreddit: 'r/fitness',
    client: 'Gymijet',
    status: 'pushed',
  },
  {
    date: '2025-02-26',
    thread: "Best protein powder that doesn't taste like chalk?",
    subreddit: 'r/nutrition',
    client: 'Gymijet',
    status: 'pushed',
  },
  {
    date: '2025-02-24',
    thread: 'How do I stop skipping leg day?',
    subreddit: 'r/gym',
    client: 'FitnessCo',
    status: 'dismissed',
  },
  {
    date: '2025-02-22',
    thread: 'Running 3x/week vs 5x/week — which is better for weight loss?',
    subreddit: 'r/running',
    client: 'Gymijet',
    status: 'pushed',
  },
  {
    date: '2025-02-20',
    thread: 'Anyone tried intermittent fasting with strength training?',
    subreddit: 'r/loseit',
    client: 'FitnessCo',
    status: 'pushed',
  },
]
export function AccountDetail({ accountId, onBack }: AccountDetailProps) {
  const [status, setStatus] = useState('active')
  const [personalitySummary, setPersonalitySummary] = useState(
    "Casual and helpful tone. Prefers short, punchy responses. Frequently posts in fitness and nutrition subreddits. Uses abbreviations like 'tbh' and 'imo'. Rarely uses emojis. Tends to share personal experience before giving advice.",
  )
  const [writingStyle, setWritingStyle] = useState(
    "Average comment length: 3-4 sentences. Never uses exclamation marks. Lowercase preference. Often starts replies with 'honestly' or 'fwiw'. Uses parenthetical asides frequently.",
  )
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(3)
  const [minHoursBetween, setMinHoursBetween] = useState(4)
  const [page, setPage] = useState(0)
  const [savedPersonality, setSavedPersonality] = useState(false)
  const [savedStyle, setSavedStyle] = useState(false)
  const [savedSafety, setSavedSafety] = useState(false)
  const [organicPostsWeek] = useState(9)
  const [citationPostsWeek] = useState(3)
  const postRatio = 1 / 3
  const progressColor =
    postRatio >= 1 ? '#ef4444' : postRatio >= 0.5 ? '#f59e0b' : '#10b981'
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#334155',
      },
      '&:hover fieldset': {
        borderColor: '#475569',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#f97316',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#64748b',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#f97316',
    },
  }
  // Ratio health
  const totalWeekPosts = organicPostsWeek + citationPostsWeek
  const citationPct =
    totalWeekPosts > 0 ? (citationPostsWeek / totalWeekPosts) * 100 : 0
  const ratioColor =
    citationPct <= 25 ? '#10b981' : citationPct <= 40 ? '#f59e0b' : '#ef4444'
  const ratioStatus =
    citationPct <= 25
      ? 'Healthy'
      : citationPct <= 40
        ? 'Borderline'
        : 'Too many citations'
  const handleSave = (type: 'personality' | 'style' | 'safety') => {
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
  }
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
      {/* Back Button */}
      <Button
        startIcon={<ArrowLeftIcon size={16} />}
        onClick={onBack}
        sx={{
          color: '#64748b',
          mb: 2,
          '&:hover': {
            color: '#94a3b8',
            bgcolor: 'transparent',
          },
          p: 0,
        }}
      >
        Back to Accounts
      </Button>

      {/* Profile Header */}
      <Card
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid #334155',
          borderRadius: '12px',
          mb: 3,
        }}
      >
        <CardContent
          sx={{
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: '#FF4500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RedditIcon size={32} variant="white" />
              </Avatar>
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <RedditIcon size={14} variant="color" />
                  <Typography
                    sx={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'text.primary',
                    }}
                  >
                    u/fitness_mike
                  </Typography>
                </Box>
                <Chip
                  label="Active"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: 4,
              }}
            >
              <Box
                sx={{
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Account Age
                </Typography>
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  2y 4m
                </Typography>
              </Box>
              <Box
                sx={{
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Post Karma
                </Typography>
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  1,234
                </Typography>
              </Box>
              <Box
                sx={{
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Comment Karma
                </Typography>
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  5,678
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <FormControl
                size="small"
                sx={{
                  minWidth: 160,
                  ...inputSx,
                }}
              >
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="warming">Warming</MenuItem>
                  <MenuItem value="cooldown">Cooldown</MenuItem>
                  <MenuItem value="flagged">Flagged</MenuItem>
                  <MenuItem value="retired">Retired</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCwIcon size={14} />}
                sx={{
                  borderColor: '#334155',
                  color: '#94a3b8',
                  '&:hover': {
                    borderColor: '#475569',
                    bgcolor: '#0f172a',
                  },
                }}
              >
                Re-Analyze
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Trash2Icon size={14} />}
                sx={{
                  borderColor: 'rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  '&:hover': {
                    borderColor: '#ef4444',
                    bgcolor: 'rgba(239,68,68,0.08)',
                  },
                }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <Grid
        container
        spacing={3}
        sx={{
          mb: 3,
        }}
      >
        {/* Left Column */}
        <Grid item xs={12} lg={7}>
          {/* AI Personality Summary */}
          <Card
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid #334155',
              borderRadius: '12px',
              mb: 2,
            }}
          >
            <CardContent
              sx={{
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 1.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                AI Personality Summary
              </Typography>
              <TextField
                value={personalitySummary}
                onChange={(e) => setPersonalitySummary(e.target.value)}
                multiline
                rows={4}
                fullWidth
                sx={{
                  ...inputSx,
                  mb: 1.5,
                }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon size={13} />}
                onClick={() => handleSave('personality')}
                sx={{
                  bgcolor: savedPersonality ? '#10b981' : '#f97316',
                  '&:hover': {
                    bgcolor: savedPersonality ? '#059669' : '#ea6c0a',
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                {savedPersonality ? 'Saved!' : 'Save'}
              </Button>
            </CardContent>
          </Card>

          {/* Writing Style Notes */}
          <Card
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid #334155',
              borderRadius: '12px',
              mb: 2,
            }}
          >
            <CardContent
              sx={{
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 1.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Writing Style Notes
              </Typography>
              <TextField
                value={writingStyle}
                onChange={(e) => setWritingStyle(e.target.value)}
                multiline
                rows={3}
                fullWidth
                sx={{
                  ...inputSx,
                  mb: 1.5,
                }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon size={13} />}
                onClick={() => handleSave('style')}
                sx={{
                  bgcolor: savedStyle ? '#10b981' : '#f97316',
                  '&:hover': {
                    bgcolor: savedStyle ? '#059669' : '#ea6c0a',
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                {savedStyle ? 'Saved!' : 'Save'}
              </Button>
            </CardContent>
          </Card>

          {/* Sample Comments */}
          <Card
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid #334155',
              borderRadius: '12px',
            }}
          >
            <CardContent
              sx={{
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Sample Comments
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  maxHeight: 400,
                  overflowY: 'auto',
                }}
              >
                {sampleComments.map((comment) => (
                  <Box
                    key={comment.id}
                    sx={{
                      p: 1.5,
                      bgcolor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 0.75,
                      }}
                    >
                      <Chip
                        label={comment.subreddit}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '10px',
                          bgcolor: 'rgba(249, 115, 22, 0.1)',
                          color: '#f97316',
                          border: '1px solid rgba(249, 115, 22, 0.2)',
                        }}
                      />
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '11px',
                            color: '#64748b',
                          }}
                        >
                          ↑ {comment.score}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '11px',
                            color: '#64748b',
                          }}
                        >
                          {comment.date}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {comment.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={5}>
          {/* Safety Settings */}
          <Card
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid #334155',
              borderRadius: '12px',
              mb: 2,
            }}
          >
            <CardContent
              sx={{
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Safety Settings
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <TextField
                  label="Max posts per day"
                  type="number"
                  value={maxPostsPerDay}
                  onChange={(e) => setMaxPostsPerDay(Number(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{
                    min: 1,
                    max: 10,
                  }}
                  sx={inputSx}
                />
                <TextField
                  label="Min hours between posts"
                  type="number"
                  value={minHoursBetween}
                  onChange={(e) => setMinHoursBetween(Number(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{
                    min: 1,
                    max: 24,
                  }}
                  sx={inputSx}
                />
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 0.75,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '12px',
                        color: '#64748b',
                      }}
                    >
                      Posts today
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: progressColor,
                      }}
                    >
                      1/{maxPostsPerDay}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(1 / maxPostsPerDay) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#0f172a',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: progressColor,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: '#0f172a',
                    borderRadius: '8px',
                    border: '1px solid #1e293b',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Tooltip
                      title="Reddit penalizes accounts that post too many promotional/citation replies relative to organic participation. Maintain at least 3 organic posts for every 1 citation post."
                      arrow
                      placement="top"
                    >
                      <Typography
                        sx={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#64748b',
                          cursor: 'help',
                          borderBottom: '1px dashed #475569',
                          display: 'inline',
                        }}
                      >
                        Organic : Citation ratio (this week)
                      </Typography>
                    </Tooltip>
                    <Chip
                      label={ratioStatus}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '10px',
                        fontWeight: 700,
                        bgcolor: `${ratioColor}18`,
                        color: ratioColor,
                        border: `1px solid ${ratioColor}40`,
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 3,
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: '#10b981',
                        }}
                      >
                        {organicPostsWeek}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '10px',
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Organic
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '16px',
                          color: '#334155',
                          fontWeight: 300,
                        }}
                      >
                        :
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: ratioColor,
                        }}
                      >
                        {citationPostsWeek}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '10px',
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Citation
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '10px',
                            color: '#475569',
                          }}
                        >
                          Citation %
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: ratioColor,
                          }}
                        >
                          {citationPct.toFixed(0)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          position: 'relative',
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#1e293b',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: '25%',
                            top: 0,
                            bottom: 0,
                            width: '1px',
                            bgcolor: '#475569',
                            zIndex: 1,
                          }}
                        />
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.min(citationPct, 100)}%`,
                            bgcolor: ratioColor,
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '9px',
                          color: '#475569',
                          mt: 0.5,
                        }}
                      >
                        Target: max 25% citation (3:1 ratio)
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon size={13} />}
                  onClick={() => handleSave('safety')}
                  sx={{
                    bgcolor: savedSafety ? '#10b981' : '#f97316',
                    '&:hover': {
                      bgcolor: savedSafety ? '#059669' : '#ea6c0a',
                    },
                    alignSelf: 'flex-start',
                  }}
                >
                  {savedSafety ? 'Saved!' : 'Save'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Active Subreddits */}
          <Card
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid #334155',
              borderRadius: '12px',
              mb: 2,
            }}
          >
            <CardContent
              sx={{
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 1.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Active Subreddits
              </Typography>
              <Typography
                sx={{
                  fontSize: '11px',
                  color: '#64748b',
                  mb: 1.5,
                }}
              >
                Auto-detected from account activity
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                }}
              >
                {[
                  'r/fitness',
                  'r/gym',
                  'r/loseit',
                  'r/nutrition',
                  'r/running',
                  'r/bodyweightfitness',
                ].map((sub) => (
                  <Chip
                    key={sub}
                    label={sub}
                    size="small"
                    onDelete={() => {}}
                    deleteIcon={<XIcon size={11} />}
                    sx={{
                      bgcolor: '#0f172a',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                      fontSize: '11px',
                      '& .MuiChip-deleteIcon': {
                        color: '#64748b',
                        '&:hover': {
                          color: '#ef4444',
                        },
                      },
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activity Log */}
      <Card
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid #334155',
          borderRadius: '12px',
        }}
      >
        <CardContent
          sx={{
            p: 2.5,
          }}
        >
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'text.primary',
              mb: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Activity Log
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      borderBottom: '1px solid #334155',
                    },
                  }}
                >
                  <TableCell
                    sx={{
                      color: '#64748b',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Date
                  </TableCell>
                  <TableCell
                    sx={{
                      color: '#64748b',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Thread
                  </TableCell>
                  <TableCell
                    sx={{
                      color: '#64748b',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Subreddit
                  </TableCell>
                  <TableCell
                    sx={{
                      color: '#64748b',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activityLog.slice(page * 5, page * 5 + 5).map((row, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      '& td': {
                        borderBottom: '1px solid #1e293b',
                      },
                      '&:last-child td': {
                        borderBottom: 'none',
                      },
                      '&:hover': {
                        bgcolor: 'rgba(249, 115, 22, 0.03)',
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        color: '#64748b',
                        fontSize: '12px',
                      }}
                    >
                      {row.date}
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: '12px',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.thread}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.subreddit}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '10px',
                          bgcolor: 'rgba(249, 115, 22, 0.1)',
                          color: '#f97316',
                          border: '1px solid rgba(249, 115, 22, 0.2)',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '10px',
                          fontWeight: 600,
                          bgcolor:
                            row.status === 'pushed'
                              ? 'rgba(16, 185, 129, 0.1)'
                              : 'rgba(100, 116, 139, 0.1)',
                          color:
                            row.status === 'pushed' ? '#10b981' : '#64748b',
                          border: `1px solid ${row.status === 'pushed' ? 'rgba(16, 185, 129, 0.3)' : '#334155'}`,
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={activityLog.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={5}
            rowsPerPageOptions={[5]}
            sx={{
              color: '#64748b',
              '& .MuiTablePagination-actions button': {
                color: '#64748b',
              },
              '& .MuiTablePagination-selectIcon': {
                color: '#64748b',
              },
            }}
          />
        </CardContent>
      </Card>
    </Box>
  )
}
