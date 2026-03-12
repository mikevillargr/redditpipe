# Semantic Versioning Migration Steps

## Current Status
✅ Migration scripts created
✅ Release workflow documentation added
⏳ Waiting for GitHub CLI authentication

## Complete the Migration

### Step 1: Authenticate GitHub CLI with workflow scope

Run this command and follow the browser authentication:

```bash
gh auth refresh -h github.com -s workflow
```

### Step 2: Run the migration script

```bash
cd /Users/mike/Documents/RedditPipe/reddit-outreach
python3 scripts/migrate_to_semver.py
```

When prompted, type `y` to confirm.

### Step 3: Verify the migration

```bash
gh release list --repo mikevillargr/redditpipe
```

You should see:
- v2.3.0 (Latest) - UI Standardization & Insights Improvements
- v2.2.0 - Deletion Analysis System
- v2.1.0 - Reports Page Enhancements
- v2.0.0 - Architecture Rewrite (Hono + Vite)

## What the Migration Does

1. **Deletes all old calendar-based releases** (v2026.03.x)
2. **Creates 4 new semantic version releases** with detailed release notes:
   - **v2.0.0**: Architecture Rewrite (Hono + Vite) - commit 8e87bc6
   - **v2.1.0**: Reports Page Enhancements - commit 96c0629
   - **v2.2.0**: Deletion Analysis System - commit f5ad9d1
   - **v2.3.0**: UI Standardization & Insights Improvements - commit 472ecc0

## Going Forward

Use the `/release` workflow command or refer to `.windsurf/workflows/release.md` for creating new releases.

### Quick Reference

**Patch Release (Bug Fixes):**
```bash
gh release create v2.3.1 \
  --title "Bug Fixes" \
  --notes "## 🐛 Bug Fixes
- Fixed issue 1
- Fixed issue 2" \
  --repo mikevillargr/redditpipe
```

**Minor Release (New Features):**
```bash
gh release create v2.4.0 \
  --title "New Features" \
  --notes "## ✨ New Features
- Feature 1
- Feature 2" \
  --repo mikevillargr/redditpipe
```

**Major Release (Breaking Changes):**
```bash
gh release create v3.0.0 \
  --title "Major Update" \
  --notes "## ⚠️ Breaking Changes
- Breaking change 1
- Breaking change 2" \
  --repo mikevillargr/redditpipe
```
