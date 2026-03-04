import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material'
import { LockIcon } from 'lucide-react'

interface LoginScreenProps {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (res.ok) {
        onLogin()
      } else {
        setError('Invalid username or password')
      }
    } catch {
      setError('Login failed — server unreachable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0f172a',
        p: 2,
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 4,
          maxWidth: 380,
          width: '100%',
          bgcolor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              bgcolor: '#f97316',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
            }}
          >
            <Box
              component="span"
              sx={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}
            >
              RP
            </Box>
          </Box>
          <Typography
            sx={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#f1f5f9',
              mb: 0.5,
            }}
          >
            RedditPipe
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#64748b' }}>
            Sign in to access the dashboard
          </Typography>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              bgcolor: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
              '& .MuiAlert-icon': { color: '#ef4444' },
            }}
          >
            {error}
          </Alert>
        )}

        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          size="small"
          autoFocus
          autoComplete="username"
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#334155' },
              '&:hover fieldset': { borderColor: '#475569' },
              '&.Mui-focused fieldset': { borderColor: '#f97316' },
            },
            '& .MuiInputLabel-root': { color: '#64748b' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
            '& .MuiOutlinedInput-input': { color: '#f1f5f9' },
          }}
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          size="small"
          autoComplete="current-password"
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#334155' },
              '&:hover fieldset': { borderColor: '#475569' },
              '&.Mui-focused fieldset': { borderColor: '#f97316' },
            },
            '& .MuiInputLabel-root': { color: '#64748b' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
            '& .MuiOutlinedInput-input': { color: '#f1f5f9' },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading || !username || !password}
          startIcon={
            loading ? (
              <CircularProgress size={16} sx={{ color: '#fff' }} />
            ) : (
              <LockIcon size={16} />
            )
          }
          sx={{
            bgcolor: '#f97316',
            color: '#fff',
            py: 1,
            fontSize: '14px',
            fontWeight: 600,
            '&:hover': { bgcolor: '#ea6c0a' },
            '&:disabled': { bgcolor: '#334155', color: '#64748b' },
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>

        <Typography
          sx={{ fontSize: '11px', color: '#475569', textAlign: 'center' }}
        >
          Set AUTH_USERNAME and AUTH_PASSWORD in .env
        </Typography>
      </Paper>
    </Box>
  )
}
