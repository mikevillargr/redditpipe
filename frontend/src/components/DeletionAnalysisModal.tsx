import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Checkbox,
  LinearProgress,
  useTheme,
} from '@mui/material'
import { AlertCircleIcon, LightbulbIcon, TrashIcon, CheckIcon } from 'lucide-react'

interface DeletionAnalysisModalProps {
  open: boolean
  onClose: () => void
  loading: boolean
  data: any
  selectedRecommendations: Set<number>
  onToggleRecommendation: (index: number) => void
  onApply: () => void
}

export function DeletionAnalysisModal({
  open,
  onClose,
  loading,
  data,
  selectedRecommendations,
  onToggleRecommendation,
  onApply,
}: DeletionAnalysisModalProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const reasonColors: Record<string, string> = {
    'spam': '#ef4444',
    'self-promotion': '#f59e0b',
    'off-topic': '#3b82f6',
    'rule-violation': '#8b5cf6',
    'low-quality': '#6b7280',
    'other': '#64748b',
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <TrashIcon size={20} color="#ef4444" />
        <Typography sx={{ fontWeight: 700, fontSize: '18px', color: 'text.primary' }}>
          Deletion Analysis
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={40} sx={{ color: '#f97316', mb: 2 }} />
            <Typography sx={{ fontSize: '14px', color: 'text.secondary' }}>
              AI is analyzing why this comment was deleted...
            </Typography>
          </Box>
        )}

        {!loading && data?.error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AlertCircleIcon size={40} color="#ef4444" style={{ marginBottom: 12 }} />
            <Typography sx={{ fontSize: '14px', color: '#ef4444' }}>
              {data.error}
            </Typography>
          </Box>
        )}

        {!loading && data && !data.error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Analysis Summary */}
            <Box
              sx={{
                p: 2,
                bgcolor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
                border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '8px',
              }}
            >
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary', mb: 1 }}>
                Likely Reason: <span style={{ color: reasonColors[data.likelyReason] || '#f97316', textTransform: 'capitalize' }}>
                  {data.likelyReason?.replace('-', ' ')}
                </span>
              </Typography>
              <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 1 }}>
                Confidence: {(data.confidence * 100).toFixed(0)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={data.confidence * 100}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: reasonColors[data.likelyReason] || '#f97316',
                    borderRadius: 1,
                  },
                }}
              />
            </Box>

            {/* Detailed Analysis */}
            {data.aiAnalysis && JSON.parse(data.aiAnalysis).detailed_analysis && (
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary', mb: 1 }}>
                  Analysis
                </Typography>
                <Typography sx={{ fontSize: '13px', color: 'text.secondary', lineHeight: 1.6 }}>
                  {JSON.parse(data.aiAnalysis).detailed_analysis}
                </Typography>
              </Box>
            )}

            {/* Recommendations */}
            {data.recommendations && JSON.parse(data.recommendations).length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <LightbulbIcon size={16} color="#f97316" />
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary' }}>
                    Recommendations
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 1.5 }}>
                  Select recommendations to apply to your <strong>Special Instructions for AI Generation</strong> setting:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {JSON.parse(data.recommendations).map((rec: string, i: number) => {
                    const isSelected = selectedRecommendations.has(i)
                    return (
                      <Box
                        key={i}
                        onClick={() => onToggleRecommendation(i)}
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
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
          Close
        </Button>
        {!loading && data && !data.error && selectedRecommendations.size > 0 && (
          <Button
            onClick={onApply}
            variant="contained"
            startIcon={<CheckIcon size={14} />}
            sx={{
              bgcolor: '#f97316',
              textTransform: 'none',
              '&:hover': { bgcolor: '#ea580c' },
            }}
          >
            Apply {selectedRecommendations.size} to Settings
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
