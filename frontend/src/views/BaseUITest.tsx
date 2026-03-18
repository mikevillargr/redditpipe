import React, { useContext, useState } from 'react'
import { Button } from '../components/base/Button'
import { Card, CardHeader, CardContent, CardFooter } from '../components/base/Card'
import { Input } from '../components/base/Input'
import { Select } from '../components/base/Select'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '../components/base/Dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/base/Tabs'
import { ColorModeContext } from '../App'
import { Box, Typography, Card as MuiCard, CardContent as MuiCardContent, Button as MuiButton } from '@mui/material'
import { SunIcon, UserIcon, MailIcon, BuildingIcon } from 'lucide-react'

export function BaseUITest() {
  const { toggleColorMode } = useContext(ColorModeContext)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
  })

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Base UI Component Test
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Testing Base UI Button component with Tailwind CSS
          </Typography>
        </Box>
        <MuiButton
          onClick={toggleColorMode}
          variant="outlined"
          startIcon={<SunIcon size={16} />}
        >
          Toggle Theme
        </MuiButton>
      </Box>

      {/* Buttons */}
      <MuiCard sx={{ mb: 3 }}>
        <MuiCardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Buttons</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outlined">Outlined</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </Box>
        </MuiCardContent>
      </MuiCard>

      {/* Cards */}
      <MuiCard sx={{ mb: 3 }}>
        <MuiCardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Cards</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserIcon size={20} className="text-[#f97316]" />
                  <h3 className="text-lg font-semibold text-[#0f172a] dark:text-[#f1f5f9]">User Profile</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#475569] dark:text-[#94a3b8]">John Doe</p>
                <p className="text-sm text-[#475569] dark:text-[#94a3b8]">john@example.com</p>
                <p className="text-sm text-[#475569] dark:text-[#94a3b8] mt-2">Admin Role</p>
              </CardContent>
              <CardFooter>
                <Button variant="outlined" size="sm">Edit Profile</Button>
              </CardFooter>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BuildingIcon size={20} className="text-[#3b82f6]" />
                  <h3 className="text-lg font-semibold text-[#0f172a] dark:text-[#f1f5f9]">Company Stats</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#475569] dark:text-[#94a3b8]">Active Clients</span>
                    <span className="text-sm font-semibold text-[#0f172a] dark:text-[#f1f5f9]">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#475569] dark:text-[#94a3b8]">Opportunities</span>
                    <span className="text-sm font-semibold text-[#0f172a] dark:text-[#f1f5f9]">156</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Box>
        </MuiCardContent>
      </MuiCard>

      {/* Form Inputs */}
      <MuiCard sx={{ mb: 3 }}>
        <MuiCardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Form Inputs</Typography>
          <Box sx={{ display: 'grid', gap: 3, maxWidth: 600 }}>
            <Input
              label="Full Name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              helperText="We'll never share your email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error="Password must be at least 8 characters"
            />
            <Input
              label="Disabled Input"
              value="Cannot edit this"
              disabled
            />
          </Box>
        </MuiCardContent>
      </MuiCard>

      {/* Select Dropdown */}
      <MuiCard sx={{ mb: 3 }}>
        <MuiCardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Select Dropdown</Typography>
          <Box sx={{ display: 'grid', gap: 3, maxWidth: 600 }}>
            <Select
              label="User Role"
              placeholder="Select a role"
              value={formData.role}
              onChange={(val) => setFormData({ ...formData, role: val || '' })}
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'operator', label: 'Operator' },
                { value: 'viewer', label: 'Viewer' },
              ]}
            />
            <Select
              label="Client Status"
              placeholder="Choose status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'paused', label: 'Paused' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </Box>
        </MuiCardContent>
      </MuiCard>

      {/* Dialog */}
      <MuiCard sx={{ mb: 3 }}>
        <MuiCardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Dialog / Modal</Typography>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button variant="primary">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Client</DialogTitle>
                <DialogDescription>
                  Add a new client to your RedditPipe workspace. Fill in the details below.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="space-y-4">
                  <Input
                    label="Client Name"
                    placeholder="Acme Corp"
                  />
                  <Input
                    label="Website"
                    placeholder="https://example.com"
                  />
                  <Select
                    label="Industry"
                    placeholder="Select industry"
                    options={[
                      { value: 'tech', label: 'Technology' },
                      { value: 'finance', label: 'Finance' },
                      { value: 'healthcare', label: 'Healthcare' },
                    ]}
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setDialogOpen(false)}>Create Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </MuiCardContent>
      </MuiCard>

      {/* Tabs */}
      <MuiCard sx={{ mb: 3 }}>
        <MuiCardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Tabs</Typography>
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Account</TabsTrigger>
              <TabsTrigger value="tab2">Settings</TabsTrigger>
              <TabsTrigger value="tab3">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Account Information</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Manage your account settings and preferences here.</p>
              </div>
            </TabsContent>
            <TabsContent value="tab2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Settings</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Configure your application settings.</p>
              </div>
            </TabsContent>
            <TabsContent value="tab3">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Billing</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">View and manage your billing information.</p>
              </div>
            </TabsContent>
          </Tabs>
        </MuiCardContent>
      </MuiCard>

      {/* Info */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>✅ Phase 4 Progress</Typography>
        <Typography variant="body2" color="text.secondary">
          Building additional components needed for Settings page migration: Tabs, Toggle, etc.
        </Typography>
      </Box>
    </Box>
  )
}
