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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { RefreshCwIcon, CheckIcon, XIcon, LinkIcon, ExternalLinkIcon } from 'lucide-react';

interface Account {
  id: string;
  username: string;
  status: string;
}

interface PileOnDialogProps {
  open: boolean;
  onClose: () => void;
  opportunityId: string;
  opportunityTitle: string;
  threadUrl: string;
  onSuccess: () => void;
}

export function PileOnDialog({
  open,
  onClose,
  opportunityId,
  opportunityTitle,
  threadUrl,
  onSuccess,
}: PileOnDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [draftReply, setDraftReply] = useState('');
  const [pileOnId, setPileOnId] = useState<string | null>(null);
  const [permalinkUrl, setPermalinkUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAccounts();
    } else {
      // Reset state when dialog closes
      setSelectedAccountId('');
      setDraftReply('');
      setPileOnId(null);
      setPermalinkUrl('');
      setError(null);
    }
  }, [open]);

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        const activeAccounts = data.filter((a: Account) => a.status === 'active');
        setAccounts(activeAccounts);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
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
        setPileOnId(data.opportunityId || data.pileOnId);
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

  const handleDismiss = async () => {
    if (!pileOnId) return;

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/pile-on/${pileOnId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError('Failed to dismiss pile-on');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleMarkAsPublished = async () => {
    if (!pileOnId) return;
    if (!permalinkUrl.trim()) {
      setError('Please enter the permalink URL');
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/pile-on/${pileOnId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permalinkUrl }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to mark as published');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        Add Pile-On Comment
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary', flex: 1 }}>
            Thread: <strong>{opportunityTitle}</strong>
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ExternalLinkIcon size={12} />}
            onClick={() => window.open(threadUrl, '_blank')}
            sx={{
              fontSize: '11px',
              textTransform: 'none',
              borderColor: '#334155',
              color: 'text.secondary',
              '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' },
            }}
          >
            Go to Thread
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '13px' }}>
            {error}
          </Alert>
        )}

        {/* Account Selection */}
        {!draftReply && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel sx={{ fontSize: '13px' }}>Select Account</InputLabel>
            <Select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              label="Select Account"
              sx={{ fontSize: '13px' }}
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id} sx={{ fontSize: '13px' }}>
                  u/{account.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Draft Reply */}
        {draftReply && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
              AI-Generated Response
            </Typography>
            <TextField
              multiline
              rows={6}
              fullWidth
              value={draftReply}
              onChange={(e) => setDraftReply(e.target.value)}
              placeholder="Pile-on comment text..."
              sx={{
                mb: 2,
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
            <TextField
              fullWidth
              value={permalinkUrl}
              onChange={(e) => setPermalinkUrl(e.target.value)}
              placeholder="Paste permalink URL after posting to Reddit..."
              label="Permalink URL"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#334155' },
                  '&:hover fieldset': { borderColor: '#475569' },
                  '&.Mui-focused fieldset': { borderColor: '#f97316' },
                },
                '& .MuiInputBase-input': {
                  fontSize: '13px',
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          Close
        </Button>

        {draftReply && (
          <Button
            onClick={handleDismiss}
            startIcon={<XIcon size={14} />}
            sx={{
              textTransform: 'none',
              color: '#ef4444',
              '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' },
            }}
          >
            Dismiss
          </Button>
        )}

        {!draftReply && (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || !selectedAccountId}
            startIcon={generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <RefreshCwIcon size={14} />}
            sx={{
              textTransform: 'none',
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              '&:disabled': { bgcolor: '#475569' },
            }}
          >
            {generating ? 'Generating...' : 'Generate Response'}
          </Button>
        )}

        {draftReply && (
          <Button
            variant="contained"
            onClick={handleMarkAsPublished}
            disabled={publishing || !permalinkUrl.trim()}
            startIcon={publishing ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckIcon size={14} />}
            sx={{
              textTransform: 'none',
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              '&:disabled': { bgcolor: '#475569' },
            }}
          >
            {publishing ? 'Saving...' : 'Mark as Published'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
