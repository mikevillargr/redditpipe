# Base UI Migration Documentation

## Phase 1: Setup & Proof of Concept ✅

**Status:** Complete  
**Date:** March 18, 2026  
**Branch:** `feature/base-ui-migration`

### What Was Implemented

1. **Dependencies Installed**
   - `@base-ui/react` - Unstyled React components
   - `tailwindcss` v4 - Utility-first CSS framework
   - `@tailwindcss/postcss` - PostCSS plugin for Tailwind v4
   - `clsx` & `tailwind-merge` - Class name utilities

2. **Configuration Files**
   - `tailwind.config.js` - Tailwind configuration with custom colors
   - `postcss.config.js` - PostCSS configuration
   - `src/styles/globals.css` - Global styles and CSS variables

3. **Utilities Created**
   - `src/utils/cn.ts` - Class name merging utility

4. **Components Built**
   - `src/components/base/Button.tsx` - Base UI Button wrapper with Tailwind

5. **Test Page**
   - `src/views/BaseUITest.tsx` - Component showcase and comparison

### Design System

**Colors (Preserved from MUI):**
- Primary: Orange (#f97316)
- Secondary: Blue (#3b82f6)
- Success: Green (#10b981)
- Warning: Amber (#f59e0b)
- Danger: Red (#ef4444)

**Typography:**
- Font Family: Inter, system-ui, -apple-system, sans-serif

**Dark Mode:**
- Implemented via Tailwind's `dark:` class prefix
- Controlled by existing MUI theme toggle

### Button Component API

```tsx
import { Button } from './components/base/Button'

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outlined">Outlined</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Full width
<Button fullWidth>Full Width</Button>

// Disabled
<Button disabled>Disabled</Button>
```

### Testing Instructions

1. **Start Development Server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Access Test Page:**
   - Navigate to the app at `http://localhost:5173`
   - Login with credentials
   - Click "🧪 Base UI Test" in the sidebar

3. **What to Test:**
   - [ ] All button variants render correctly
   - [ ] Dark/light mode toggle works
   - [ ] Hover states are smooth
   - [ ] Active states work
   - [ ] Disabled states are visible
   - [ ] Button sizes are consistent
   - [ ] Compare with MUI buttons

### Bundle Size Impact

**Before Base UI:**
- Main bundle: ~1,034 KB

**After Base UI (Phase 1):**
- Main bundle: ~1,071 KB (+37 KB)
- CSS bundle: ~9.46 KB (new)

**Note:** Bundle size increased slightly because:
1. Both MUI and Tailwind are present (temporary)
2. Tailwind CSS added (~9 KB)
3. Base UI components added (~7 KB)

**Expected after full migration:** ~500-600 KB (50% reduction when MUI is removed)

### Known Issues

- CSS linter warnings for `@import "tailwindcss"` - these are expected and can be ignored
- Test page is temporary and should be removed after migration
- MUI and Tailwind coexist (intentional for gradual migration)

### Next Steps (Phase 2)

1. Create remaining base components:
   - Card
   - Input/TextField
   - Select
   - Dialog/Modal
   - Tooltip
   - Chip/Badge

2. Migrate first view (LoginScreen)

3. Establish migration patterns

4. Continue testing locally before deployment

### Files Modified

**New Files:**
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/src/styles/globals.css`
- `frontend/src/utils/cn.ts`
- `frontend/src/components/base/Button.tsx`
- `frontend/src/views/BaseUITest.tsx`
- `docs/base-ui-migration.md`

**Modified Files:**
- `frontend/package.json`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/Sidebar.tsx`

### Rollback Instructions

If needed, to rollback Phase 1:

```bash
git checkout main
git branch -D feature/base-ui-migration
```

Or to keep the branch but revert changes:

```bash
git reset --hard origin/main
```

---

**Migration Progress:** Phase 1 of 6 ✅
