import React from 'react'
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
}: SidebarProps) {
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
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '-0.5px',
            }}
          >
            RP
          </Typography>
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
  return (
    <>
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
