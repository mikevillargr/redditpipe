import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import { RefreshCwIcon, SendIcon, UserIcon } from 'lucide-react';

interface PileOnAccount {
  id: string;
  username: string;
  commentKarma: number | null;
}

interface PileOnComment {
  id: string;
  aiDraftReply: string;
  pileOnAccount: PileOnAccount;
  status: string;
  postedAt?: string;
  pileOnCommentId?: string;
}

interface PileOnDialogProps {
  open: boolean;
  onClose: () => void;
  opportunityId: string;
  opportunityTitle: string;
  onSuccess: () => void;
}

export function PileOnDialog({
  open,
  onClose,
  opportunityId,
  opportunityTitle,
  onSuccess,
}: PileOnDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pileOns, setPileOns] = useState<PileOnComment[]>([]);
  const [draftReply, setDraftReply] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [availableAccounts, setAvailableAccounts] = useState<PileOnAccount[]>([]);

  useEffect(() => {
    if (open) {
      loadAvailableAccounts();
      loadPileOns();
    }
  }, [open, opportunityId]);

  const loadAvailableAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        // Filter to active accounts only
        const activeAccounts = data.filter((a: any) => a.status === 'active');
        setAvailableAccounts(activeAccounts.map((a: any) => ({
          id: a.id,
          username: a.username,
          commentKarma: a.commentKarma,
        })));
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadPileOns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/pile-on`);
      if (res.ok) {
        const data = await res.json();
        setPileOns(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to load pile-ons');
      }
    } catch (err) {
      setError('Network error loading pile-ons');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAccountId) {
      setError('Please select an account first');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/pile-on/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setDraftReply(data.draftReply);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to generate pile-on');
      }
    } catch (err) {
      setError('Network error generating pile-on');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!draftReply || !selectedAccountId) {
      setError('Please generate a response first');
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/pile-on/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: selectedAccountId,
          draftReply: draftReply,
        }),
      });

      if (res.ok) {
        setDraftReply('');
        setSelectedAccountId('');
        await loadPileOns();
        onSuccess();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to publish pile-on');
      }
    } catch (err) {
      setError('Network error publishing pile-on');
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    setDraftReply('');
    setSelectedAccountId('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: '17px',
          color: 'text.primary',
          borderBottom: '1px solid #1e293b',
          pb: 2,
        }}
      >
        Pile-On Comments
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 2 }}>
          Thread: <strong>{opportunityTitle}</strong>
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '13px' }}>
            {error}
          </Alert>
        )}

        {/* Existing pile-ons */}
        {pileOns.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
              Existing Pile-Ons ({pileOns.length})
            </Typography>
            {pileOns.map((pileOn) => (
              <Box
                key={pileOn.id}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: '8px',
                  bgcolor: pileOn.status === 'posted' ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
                  border: `1px solid ${pileOn.status === 'posted' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <UserIcon size={14} />
                  <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                    u/{pileOn.pileOnAccount.username}
                  </Typography>
                  <Chip
                    label={pileOn.status === 'posted' ? '✓ Posted' : 'Draft'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '11px',
                      bgcolor: pileOn.status === 'posted' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: pileOn.status === 'posted' ? '#10b981' : '#f59e0b',
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: '13px', color: 'text.primary', lineHeight: 1.6 }}>
                  {pileOn.aiDraftReply}
                </Typography>
              </Box>
            ))}
            <Divider sx={{ my: 2, borderColor: '#1e293b' }} />
          </Box>
        )}

        {/* Current draft */}
        {currentDraft && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
              New Pile-On Draft
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <UserIcon size={14} />
                <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                  u/{currentDraft.pileOnAccount.username}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                  ({currentDraft.pileOnAccount.commentKarma || 0} karma)
                </Typography>
              </Box>
            </Box>
            <TextField
              multiline
              rows={4}
              fullWidth
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Pile-on comment text..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#334155' },
                  '&:hover fieldset': { borderColor: '#475569' },
                  '&.Mui-focused fieldset': { borderColor: '#f97316' },
                },
                '& .MuiInputBase-input': {
                  fontSize: '13px',
                  lineHeight: 1.6,
                },
              }}
            />
          </Box>
        )}

        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          Close
        </Button>

        {!currentDraft && (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || loading}
            startIcon={generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <RefreshCwIcon size={14} />}
            sx={{
              textTransform: 'none',
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              '&:disabled': { bgcolor: '#475569' },
            }}
          >
            {generating ? 'Generating...' : 'Generate Pile-On'}
          </Button>
        )}

        {currentDraft && (
          <Button
            variant="contained"
            onClick={handlePublish}
            disabled={publishing || !editedText.trim()}
            startIcon={publishing ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SendIcon size={14} />}
            sx={{
              textTransform: 'none',
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              '&:disabled': { bgcolor: '#475569' },
            }}
          >
            {publishing ? 'Publishing...' : 'Publish to Reddit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
