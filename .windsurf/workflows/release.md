---
description: How to create a new release with semantic versioning
---

# Release Workflow

This project uses **Semantic Versioning (semver)** for all releases.

## Semantic Versioning Format

`MAJOR.MINOR.PATCH` (e.g., `v2.3.0`)

- **MAJOR**: Breaking changes or major architecture updates
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes and improvements

## Creating a Release

### 1. Determine Version Bump

Based on your changes:
- **Breaking changes?** → Bump MAJOR (e.g., `v2.0.0` → `v3.0.0`)
- **New features?** → Bump MINOR (e.g., `v2.3.0` → `v2.4.0`)
- **Bug fixes only?** → Bump PATCH (e.g., `v2.3.0` → `v2.3.1`)

### 2. Create Release Manually

```bash
# Example: Creating v2.4.0 for new features
gh release create v2.4.0 \
  --title "Feature: New Dashboard Filters" \
  --notes "## ✨ New Features

- Added advanced filtering to Dashboard
- Implemented saved filter presets
- Added export functionality

## 🐛 Bug Fixes

- Fixed filter state persistence
- Corrected date range calculations

## 📊 Improvements

- Better performance for large datasets
- Improved UI responsiveness" \
  --repo mikevillargr/redditpipe
```

### 3. Release Notes Template

Use this template for release notes:

```markdown
## ✨ New Features
- Feature 1 description
- Feature 2 description

## 🐛 Bug Fixes
- Fix 1 description
- Fix 2 description

## 📊 Improvements
- Improvement 1 description
- Improvement 2 description

## ⚠️ Breaking Changes (if MAJOR version)
- Breaking change 1
- Breaking change 2

## 🔧 Technical Details (optional)
- Technical detail 1
- Technical detail 2
```

### 4. Automated Release (Future)

The GitHub Actions workflow will automatically:
1. Build and deploy on push to `main`
2. Create a draft release if version tag is pushed
3. You can then edit and publish the release with notes

## Examples

### Patch Release (Bug Fixes)
```bash
gh release create v2.3.1 \
  --title "Bug Fixes" \
  --notes "## 🐛 Bug Fixes
- Fixed deletion analysis modal not closing
- Corrected timezone handling in cron jobs" \
  --repo mikevillargr/redditpipe
```

### Minor Release (New Features)
```bash
gh release create v2.4.0 \
  --title "Dashboard Enhancements" \
  --notes "## ✨ New Features
- Added bulk actions for opportunities
- Implemented advanced search filters

## 🐛 Bug Fixes
- Fixed filter persistence" \
  --repo mikevillargr/redditpipe
```

### Major Release (Breaking Changes)
```bash
gh release create v3.0.0 \
  --title "API v3 Release" \
  --notes "## ⚠️ Breaking Changes
- API endpoints now require authentication tokens
- Removed deprecated /v1/ endpoints

## ✨ New Features
- New authentication system
- Improved API documentation" \
  --repo mikevillargr/redditpipe
```

## Best Practices

1. **Always include release notes** - Never create a release without notes
2. **Be descriptive** - Explain what changed and why
3. **Group changes** - Use sections (Features, Fixes, Improvements)
4. **Link to issues** - Reference GitHub issues when applicable
5. **Tag commits** - Ensure the release points to the correct commit
6. **Test before release** - Verify the build works before creating the release

## Current Version

Check the latest version:
```bash
gh release list --repo mikevillargr/redditpipe --limit 1
```

## Version History

- **v2.3.0** - UI Standardization & Insights Improvements
- **v2.2.0** - Deletion Analysis System
- **v2.1.0** - Reports Page Enhancements
- **v2.0.0** - Architecture Rewrite (Hono + Vite)
