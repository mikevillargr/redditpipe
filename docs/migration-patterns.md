# Base UI Migration Patterns

This document outlines the patterns established during the LoginScreen migration from MUI to Base UI.

## Component Mapping

### MUI → Base UI Component Equivalents

| MUI Component | Base UI Equivalent | Notes |
|--------------|-------------------|-------|
| `TextField` | `Input` | Use `label`, `error`, `helperText` props |
| `Button` | `Button` | Use `variant`, `size`, `fullWidth` props |
| `Paper` | `Card` | Use `CardContent` for padding |
| `Box` | `div` with Tailwind | Use Tailwind utility classes |
| `Typography` | HTML tags with Tailwind | `h1`, `p`, etc. with text classes |
| `Alert` | Custom div | Use Tailwind for styling |
| `CircularProgress` | SVG spinner | Custom animated SVG |

## Migration Steps

### 1. Create New Component File
- Name it `[ComponentName]BaseUI.tsx`
- Keep original MUI version for comparison
- Import Base UI components

### 2. Replace MUI Components

**Before (MUI):**
```tsx
<TextField
  label="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  fullWidth
  sx={{ /* styles */ }}
/>
```

**After (Base UI):**
```tsx
<Input
  label="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  placeholder="Enter username"
/>
```

### 3. Replace MUI Box with Tailwind

**Before (MUI):**
```tsx
<Box sx={{ 
  display: 'flex', 
  alignItems: 'center',
  gap: 2 
}}>
```

**After (Tailwind):**
```tsx
<div className="flex items-center gap-4">
```

### 4. Replace Typography with HTML + Tailwind

**Before (MUI):**
```tsx
<Typography variant="h5" sx={{ fontWeight: 700, color: '#f1f5f9' }}>
  Title
</Typography>
```

**After (Tailwind):**
```tsx
<h1 className="text-xl font-bold text-slate-100">
  Title
</h1>
```

### 5. Custom Components (Alert, Spinner)

**Alert:**
```tsx
{error && (
  <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
    {error}
  </div>
)}
```

**Loading Spinner:**
```tsx
<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
</svg>
```

## Tailwind Class Reference

### Common MUI sx → Tailwind Mappings

| MUI sx Property | Tailwind Class |
|----------------|----------------|
| `p: 4` | `p-8` (4 × 0.25rem = 1rem, Tailwind uses 0.25rem units) |
| `mb: 2` | `mb-4` |
| `gap: 2.5` | `gap-6` |
| `bgcolor: '#1e293b'` | `bg-slate-800` |
| `color: '#f1f5f9'` | `text-slate-100` |
| `fontSize: '20px'` | `text-xl` |
| `fontWeight: 700` | `font-bold` |
| `borderRadius: '12px'` | `rounded-xl` |
| `display: 'flex'` | `flex` |
| `flexDirection: 'column'` | `flex-col` |
| `alignItems: 'center'` | `items-center` |
| `justifyContent: 'center'` | `justify-center` |
| `textAlign: 'center'` | `text-center` |
| `maxWidth: 380` | `max-w-[380px]` |
| `width: '100%'` | `w-full` |
| `minHeight: '100vh'` | `min-h-screen` |

### Color Mappings

| MUI Color | Tailwind Class |
|-----------|---------------|
| `#0f172a` | `slate-900` |
| `#1e293b` | `slate-800` |
| `#334155` | `slate-700` |
| `#475569` | `slate-600` |
| `#64748b` | `slate-500` |
| `#94a3b8` | `slate-400` |
| `#cbd5e1` | `slate-300` |
| `#e2e8f0` | `slate-200` |
| `#f1f5f9` | `slate-100` |
| `#f97316` | `orange-500` |
| `#ef4444` | `red-500` |

## Testing Checklist

After migrating a component:

- [ ] Test in light mode
- [ ] Test in dark mode
- [ ] Verify all interactive states (hover, focus, disabled)
- [ ] Test form submission
- [ ] Verify error states
- [ ] Check responsive behavior
- [ ] Compare with MUI version visually
- [ ] Test keyboard navigation
- [ ] Verify accessibility

## Rollback Strategy

If issues arise:
1. Keep MUI version in separate file
2. Switch import in App.tsx
3. Test both versions side-by-side
4. Only delete MUI version when confident

## Next Views to Migrate

Recommended order:
1. ✅ LoginScreen (completed)
2. Settings page (forms, inputs, selects)
3. Clients page (table, cards, buttons)
4. Accounts page (table, status badges)
5. Dashboard (comprehensive, all components)
6. AccountDetail (complex layout)
7. Insights, KarmaFarming, Reports

## Benefits Observed

- **Bundle size**: Will reduce by ~50% after full migration
- **Dark mode**: Native Tailwind support, no custom theme
- **Performance**: Lighter components, faster renders
- **Maintainability**: Standard Tailwind classes, less custom CSS
- **Flexibility**: Easy to customize without fighting MUI theme
