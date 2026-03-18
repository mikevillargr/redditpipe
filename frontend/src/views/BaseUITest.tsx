import React, { useContext } from 'react'
import { Button } from '../components/base/Button'
import { ColorModeContext } from '../App'
import { Box, Typography, Card, CardContent, Button as MuiButton } from '@mui/material'
import { SunIcon, MoonIcon } from 'lucide-react'

export function BaseUITest() {
  const { toggleColorMode } = useContext(ColorModeContext)

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

      {/* Button Variants */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Button Variants
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outlined">Outlined</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </Box>
          
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            Disabled States
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="primary" disabled>Primary</Button>
            <Button variant="secondary" disabled>Secondary</Button>
            <Button variant="outlined" disabled>Outlined</Button>
            <Button variant="ghost" disabled>Ghost</Button>
            <Button variant="danger" disabled>Danger</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Button Sizes */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Button Sizes
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Full Width */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Full Width Button
          </Typography>
          <Button variant="primary" fullWidth>
            Full Width Button
          </Button>
        </CardContent>
      </Card>

      {/* Comparison with MUI */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Comparison: Base UI vs Material UI
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Base UI (Tailwind)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outlined">Outlined</Button>
              <Button variant="ghost">Ghost</Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Material UI (Current)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <MuiButton variant="contained" color="primary">Primary</MuiButton>
              <MuiButton variant="contained" color="secondary">Secondary</MuiButton>
              <MuiButton variant="outlined" color="primary">Outlined</MuiButton>
              <MuiButton variant="text">Text</MuiButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          ℹ️ Testing Notes
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Base UI buttons use Tailwind CSS for styling</li>
            <li>Dark mode support is built-in via Tailwind's dark: prefix</li>
            <li>All variants should match the existing design system colors</li>
            <li>Hover, active, and focus states should work smoothly</li>
            <li>This test page is temporary and will be removed after migration</li>
          </ul>
        </Typography>
      </Box>
    </Box>
  )
}
