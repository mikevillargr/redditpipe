import React, { useState } from 'react'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material'
import {
  LayoutDashboardIcon,
  Building2Icon,
  SettingsIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  BarChart3Icon,
  FlameIcon,
  FileTextIcon,
  DownloadIcon,
  PuzzleIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { RedditIcon } from './RedditIcon'
import type { Page } from '../App'
interface SidebarProps {
  activePage: Page
  onNavigate: (page: Page) => void
  collapsed: boolean
  onToggleCollapse: () => void
  mode: 'light' | 'dark'
  onToggleMode: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  onLogout?: () => void
  userRole?: 'admin' | 'operator'
}
const COLLAPSED_WIDTH = 64
const EXPANDED_WIDTH = 240
const navItems = [
  {
    id: 'dashboard' as Page,
    label: 'Opportunities',
    icon: LayoutDashboardIcon,
  },
  {
    id: 'clients' as Page,
    label: 'Clients',
    icon: Building2Icon,
  },
  {
    id: 'accounts' as Page,
    label: 'Reddit Accounts',
    icon: null,
    isReddit: true,
  },
  {
    id: 'karma-farming' as Page,
    label: 'Karma Farming',
    icon: FlameIcon,
  },
  {
    id: 'reports' as Page,
    label: 'Reports',
    icon: FileTextIcon,
  },
  {
    id: 'insights' as Page,
    label: 'Insights',
    icon: BarChart3Icon,
  },
  {
    id: 'base-ui-test' as Page,
    label: '🧪 Base UI Test',
    icon: PuzzleIcon,
  },
]
export function Sidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mode,
  onToggleMode,
  mobileOpen,
  onMobileClose,
  onLogout,
  userRole = 'admin',
}: SidebarProps) {
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isDark = mode === 'dark'
  const sidebarBg = isDark ? '#020617' : '#1e293b'
  const borderColor = isDark ? '#1e293b' : '#334155'
  const activeIconColor = '#f97316'
  const inactiveIconColor = isDark ? '#64748b' : '#94a3b8'
  const activeBg = 'rgba(249, 115, 22, 0.08)'
  const hoverBg = isDark ? '#1e293b' : '#334155'
  // On mobile, always show full-width expanded. On desktop, respect collapsed state.
  const effectiveCollapsed = isMobile ? false : collapsed
  const width = effectiveCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
  const isActive = (page: Page) =>
    activePage === page ||
    (page === 'accounts' && activePage === 'account-detail')
  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: effectiveCollapsed ? 1.5 : 2,
          py: 2,
          minHeight: 64,
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            bgcolor: '#f97316',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            p: 0.5,
          }}
        >
          <img
            src="/favicon.svg"
            alt="RedditPipe"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </Box>
        {!effectiveCollapsed && (
          <Box>
            <Typography
              sx={{
                color: '#f1f5f9',
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '-0.3px',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              RedditPipe
            </Typography>
            <Typography
              sx={{
                color: '#475569',
                fontSize: '9px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
            >
              by Growth Rocket AI Labs
            </Typography>
          </Box>
        )}
      </Box>

      {/* Toggle Button — desktop only */}
      {!isMobile && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: effectiveCollapsed ? 'center' : 'flex-end',
            px: 1,
            mb: 1,
          }}
        >
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: inactiveIconColor,
              '&:hover': {
                bgcolor: hoverBg,
                color: '#94a3b8',
              },
              width: 28,
              height: 28,
            }}
          >
            {effectiveCollapsed ? (
              <ChevronRightIcon size={16} />
            ) : (
              <ChevronLeftIcon size={16} />
            )}
          </IconButton>
        </Box>
      )}

      {/* Main Nav */}
      <List
        sx={{
          px: 1,
          flexGrow: 1,
        }}
        disablePadding
      >
        {navItems.map((item) => {
          const active = isActive(item.id)
          const Icon = item.icon
          return (
            <Tooltip
              key={item.id}
              title={effectiveCollapsed ? item.label : ''}
              placement="right"
              arrow
            >
              <ListItemButton
                onClick={() => onNavigate(item.id)}
                sx={{
                  borderRadius: '8px',
                  mb: 0.5,
                  px: 1.5,
                  py: 1,
                  minHeight: 40,
                  justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                  borderLeft: active
                    ? '3px solid #f97316'
                    : '3px solid transparent',
                  bgcolor: active ? activeBg : 'transparent',
                  '&:hover': {
                    bgcolor: active ? 'rgba(249, 115, 22, 0.12)' : hoverBg,
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: effectiveCollapsed ? 0 : 36,
                    color: active ? activeIconColor : inactiveIconColor,
                    justifyContent: 'center',
                  }}
                >
                  {item.isReddit ? (
                    <RedditIcon
                      size={18}
                      variant={active ? 'color' : 'mono'}
                      style={{
                        opacity: active ? 1 : 0.55,
                      }}
                    />
                  ) : (
                    Icon && <Icon size={18} />
                  )}
                </ListItemIcon>
                {!effectiveCollapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '14px',
                      fontWeight: active ? 600 : 400,
                      color: active ? activeIconColor : '#94a3b8',
                      whiteSpace: 'nowrap',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          )
        })}
      </List>

      {/* Bottom Section */}
      <Box>
        <Divider
          sx={{
            borderColor,
            mx: 1,
          }}
        />

        {/* Settings - Admin Only */}
        {userRole === 'admin' && (
          <List
            sx={{
              px: 1,
              py: 1,
            }}
            disablePadding
          >
            <Tooltip
              title={effectiveCollapsed ? 'Settings' : ''}
              placement="right"
              arrow
            >
              <ListItemButton
                onClick={() => onNavigate('settings')}
                sx={{
                  borderRadius: '8px',
                  mb: 0.5,
                  px: 1.5,
                  py: 1,
                  minHeight: 40,
                  justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                  borderLeft: isActive('settings')
                    ? '3px solid #f97316'
                    : '3px solid transparent',
                  bgcolor: isActive('settings') ? activeBg : 'transparent',
                  '&:hover': {
                    bgcolor: isActive('settings')
                      ? 'rgba(249, 115, 22, 0.12)'
                      : hoverBg,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: effectiveCollapsed ? 0 : 36,
                    color: isActive('settings')
                      ? activeIconColor
                      : inactiveIconColor,
                    justifyContent: 'center',
                  }}
                >
                  <SettingsIcon size={18} />
                </ListItemIcon>
                {!effectiveCollapsed && (
                  <ListItemText
                    primary="Settings"
                    primaryTypographyProps={{
                      fontSize: '14px',
                      fontWeight: isActive('settings') ? 600 : 400,
                      color: isActive('settings') ? activeIconColor : '#94a3b8',
                      whiteSpace: 'nowrap',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </List>
        )}

        {/* Chrome Extension Download */}
        <List sx={{ px: 1, py: 0 }} disablePadding>
          <Tooltip
            title={effectiveCollapsed ? 'Chrome Extension' : ''}
            placement="right"
            arrow
          >
            <ListItemButton
              onClick={() => setExtensionDialogOpen(true)}
              sx={{
                borderRadius: '8px',
                mb: 0.5,
                px: 1.5,
                py: 1,
                minHeight: 40,
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                borderLeft: '3px solid transparent',
                '&:hover': { bgcolor: hoverBg },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: effectiveCollapsed ? 0 : 36,
                  color: inactiveIconColor,
                  justifyContent: 'center',
                }}
              >
                <PuzzleIcon size={18} />
              </ListItemIcon>
              {!effectiveCollapsed && (
                <ListItemText
                  primary="Chrome Extension"
                  primaryTypographyProps={{
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </List>

        {/* Dark/Light Mode Toggle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
            px: effectiveCollapsed ? 1.5 : 2,
            pb: 1,
          }}
        >
          <Tooltip
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            placement="right"
            arrow
          >
            <IconButton
              onClick={onToggleMode}
              size="small"
              sx={{
                color: inactiveIconColor,
                bgcolor: isDark ? '#1e293b' : '#334155',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                width: effectiveCollapsed ? 32 : 'auto',
                px: effectiveCollapsed ? 0 : 1.5,
                gap: 1,
                '&:hover': {
                  bgcolor: hoverBg,
                  color: '#f97316',
                },
              }}
            >
              {isDark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
              {!effectiveCollapsed && (
                <Typography
                  sx={{
                    fontSize: '12px',
                    color: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  {isDark ? 'Light mode' : 'Dark mode'}
                </Typography>
              )}
            </IconButton>
          </Tooltip>
        </Box>

        <Divider
          sx={{
            borderColor,
            mx: 1,
          }}
        />

        {/* Logout */}
        {onLogout && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: effectiveCollapsed ? 1.5 : 2,
              py: 1.5,
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
            }}
          >
            <Tooltip
              title="Sign out"
              placement={effectiveCollapsed ? 'right' : 'top'}
              arrow
            >
              <IconButton
                onClick={onLogout}
                size="small"
                sx={{
                  color: inactiveIconColor,
                  '&:hover': {
                    color: '#ef4444',
                    bgcolor: 'rgba(239,68,68,0.08)',
                  },
                  width: 28,
                  height: 28,
                }}
              >
                <LogOutIcon size={15} />
              </IconButton>
            </Tooltip>
            {!effectiveCollapsed && (
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                Sign out
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
  const extensionDialog = (
    <Dialog
      open={extensionDialogOpen}
      onClose={() => setExtensionDialogOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          borderRadius: '12px',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PuzzleIcon size={20} color="#fff" />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '18px' }}>
            RedditPipe Chrome Extension
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ color: 'text.secondary', fontSize: '14px', mb: 2 }}>
          Post and verify comments directly from Reddit. The extension detects your
          logged-in account, shows pending opportunities, and lets you mark comments
          as published with one click.
        </Typography>

        <Box
          sx={{
            bgcolor: isDark ? '#0f172a' : '#f8fafc',
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            borderRadius: '8px',
            p: 2,
            mb: 1,
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: '14px', mb: 1.5 }}>
            Installation Steps
          </Typography>
          {[
            'Click the Download button below to get the .zip file',
            'Unzip the downloaded file',
            'Open Chrome and go to chrome://extensions',
            'Enable "Developer mode" (top-right toggle)',
            'Click "Load unpacked" and select the unzipped redditpipe-extension folder',
            'The RedditPipe icon will appear in your toolbar — pin it for easy access',
          ].map((step, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: '#f97316',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: '1px',
                }}
              >
                {i + 1}
              </Box>
              <Typography sx={{ fontSize: '13px', color: 'text.secondary', lineHeight: 1.6 }}>
                {step}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={() => setExtensionDialogOpen(false)}
          sx={{ color: 'text.secondary' }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          href="/redditpipe-extension.zip"
          download
          startIcon={<DownloadIcon size={16} />}
          sx={{
            bgcolor: '#f97316',
            '&:hover': { bgcolor: '#ea580c' },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Download Extension
        </Button>
      </DialogActions>
    </Dialog>
  )

  return (
    <>
      {extensionDialog}

      {/* Mobile: temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: {
            xs: 'block',
            md: 'none',
          },
          '& .MuiDrawer-paper': {
            width: EXPANDED_WIDTH,
            boxSizing: 'border-box',
            bgcolor: sidebarBg,
            border: 'none',
            borderRight: `1px solid ${borderColor}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop: permanent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: {
            xs: 'none',
            md: 'block',
          },
          width,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            bgcolor: sidebarBg,
            border: 'none',
            borderRight: `1px solid ${borderColor}`,
            transition: 'width 0.2s ease',
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  )
}
