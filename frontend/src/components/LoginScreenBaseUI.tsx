import React, { useState } from 'react'
import { Button } from './base/Button'
import { Input } from './base/Input'
import { Card, CardContent } from './base/Card'
import { LockIcon } from 'lucide-react'

interface LoginScreenProps {
  onLogin: () => void
}

export function LoginScreenBaseUI({ onLogin }: LoginScreenProps) {
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-[380px]">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Header */}
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-xl bg-orange-500 inline-flex items-center justify-center mb-3 p-2">
                <img
                  src="/favicon.svg"
                  alt="RedditPipe"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-xl font-bold text-slate-100 mb-1">
                RedditPipe
              </h1>
              <p className="text-[10px] text-slate-500 mb-2">
                by Growth Rocket AI Labs
              </p>
              <p className="text-[13px] text-slate-400">
                Sign in to access the dashboard
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Username Input */}
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="Enter username"
            />

            {/* Password Input */}
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter password"
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading || !username || !password}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <LockIcon size={16} className="mr-2" />
                  Sign In
                </>
              )}
            </Button>

            {/* Footer */}
            <p className="text-[11px] text-slate-500 text-center">
              Set AUTH_USERNAME and AUTH_PASSWORD in .env
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
