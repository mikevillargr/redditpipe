import React, { useMemo, useState, useEffect, useCallback, createContext } from 'react'
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  IconButton,
} from '@mui/material'
import { MenuIcon } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { Accounts } from './pages/Accounts'
import { AccountDetail } from './pages/AccountDetail'
import { Settings } from './pages/Settings'
import { LoginScreen } from './components/LoginScreen'
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
})
type Page = 'dashboard' | 'clients' | 'accounts' | 'account-detail' | 'settings'
export function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  )
  const [mode, setMode] = useState<'light' | 'dark'>('light')

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check')
      setAuthenticated(res.ok)
    } catch {
      setAuthenticated(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAuthenticated(false)
  }

  if (authenticated === null) {
    return null // Loading
  }
  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />
  }
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [],
  )
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          background: {
            default: mode === 'dark' ? '#0f172a' : '#f1f5f9',
            paper: mode === 'dark' ? '#1e293b' : '#ffffff',
          },
          primary: {
            main: '#f97316',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#3b82f6',
          },
          success: {
            main: '#10b981',
          },
          warning: {
            main: '#f59e0b',
          },
          error: {
            main: '#ef4444',
          },
          text: {
            primary: mode === 'dark' ? '#f1f5f9' : '#0f172a',
            secondary: mode === 'dark' ? '#94a3b8' : '#475569',
          },
          divider: mode === 'dark' ? '#334155' : '#e2e8f0',
        },
        typography: {
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                backgroundImage: 'none',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                fontWeight: 500,
              },
            },
          },
        },
      }),
    [mode],
  )
  const handleNavigate = (page: Page) => {
    setActivePage(page)
    setMobileOpen(false)
  }
  const handleViewAccount = (id: string) => {
    setSelectedAccountId(id)
    setActivePage('account-detail')
    setMobileOpen(false)
  }
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'clients':
        return <Clients />
      case 'accounts':
        return <Accounts onViewAccount={handleViewAccount} />
      case 'account-detail':
        return (
          <AccountDetail
            accountId={selectedAccountId}
            onBack={() => setActivePage('accounts')}
          />
        )
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }
  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <Sidebar
            activePage={activePage}
            onNavigate={handleNavigate}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            mode={mode}
            onToggleMode={colorMode.toggleColorMode}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            onLogout={handleLogout}
          />

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              ml: {
                xs: 0,
                md: collapsed ? '64px' : '240px',
              },
              transition: 'margin-left 0.2s ease',
              minHeight: '100vh',
              bgcolor: 'background.default',
              overflow: 'auto',
            }}
          >
            {/* Mobile top bar */}
            <Box
              sx={{
                display: {
                  xs: 'flex',
                  md: 'none',
                },
                alignItems: 'center',
                px: 1.5,
                py: 1,
                borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                bgcolor: 'background.paper',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                gap: 1.5,
              }}
            >
              <IconButton
                size="small"
                onClick={() => setMobileOpen(true)}
                sx={{
                  color: 'text.secondary',
                }}
              >
                <MenuIcon size={20} />
              </IconButton>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  bgcolor: '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '11px',
                  }}
                >
                  RP
                </Box>
              </Box>
            </Box>

            {renderPage()}
          </Box>
        </Box>
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
