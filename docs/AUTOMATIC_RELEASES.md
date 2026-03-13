# Automatic Release Management

RedditPipe now automatically creates releases based on commit messages using **Conventional Commits** and **Semantic Versioning**.

## How It Works

Every push to `main` triggers the CI/CD workflow which:

1. **Analyzes the commit message** to determine the type of change
2. **Calculates the next version** based on semantic versioning rules
3. **Creates a git tag and GitHub release** (if applicable)
4. **Deploys to production** regardless of release creation

## Commit Message Format

Use **Conventional Commits** format to control versioning:

### Minor Version Bump (New Features)
```bash
git commit -m "feat: Add operator view with role-based access control"
git commit -m "feature: Implement dashboard filters"
```
**Result:** v2.4.0 → v2.5.0

### Patch Version Bump (Bug Fixes)
```bash
git commit -m "fix: Operator role not being fetched after login"
git commit -m "bugfix: Correct deletion count"
git commit -m "hotfix: Emergency authentication fix"
```
**Result:** v2.4.0 → v2.4.1

### Major Version Bump (Breaking Changes)
```bash
git commit -m "feat!: Redesign API with breaking changes"
git commit -m "feat: New auth system

BREAKING CHANGE: Old tokens no longer work"
```
**Result:** v2.4.0 → v3.0.0

### No Release (Other Changes)
```bash
git commit -m "docs: Update README"
git commit -m "chore: Update dependencies"
git commit -m "style: Fix formatting"
git commit -m "refactor: Restructure code"
```
**Result:** Deployment only, no release created

## Release Notes

Release notes are **automatically generated** from commit history using GitHub's `--generate-notes` feature, which:
- Groups commits by type (features, fixes, etc.)
- Links to pull requests and issues
- Credits contributors
- Shows full changelog since last release

## Current Versioning

**Format:** `vMAJOR.MINOR.PATCH`

**Latest Releases:**
- v2.4.0 - Operator View - Role-Based Access Control
- v2.3.0 - UI Standardization & Insights Improvements
- v2.2.0 - Deletion Analysis System
- v2.1.0 - Reports Page Enhancements
- v2.0.0 - Architecture Rewrite (Hono + Vite)

## Best Practices

1. **Use descriptive commit messages** - They become your release notes
2. **Follow conventional commits** - Ensures correct version bumping
3. **One logical change per commit** - Makes releases clearer
4. **Test before pushing** - Releases are automatic
5. **Use feat: for features** - Even small ones deserve a version bump
6. **Use fix: for bug fixes** - Keeps patch versions meaningful

## Examples

### Good Commit Messages
```bash
✅ feat: Add bulk delete functionality to Dashboard
✅ fix: Prevent duplicate opportunities from being created
✅ feat!: Remove deprecated API endpoints
✅ docs: Add operator view documentation
```

### Bad Commit Messages
```bash
❌ "updates"
❌ "fix stuff"
❌ "WIP"
❌ "asdf"
```

## Troubleshooting

### Release wasn't created
- Check if commit message follows conventional commits format
- Verify commit starts with `feat:`, `fix:`, or `feat!:`
- Other prefixes (`docs:`, `chore:`, etc.) don't trigger releases

### Wrong version number
- Ensure latest tag is a valid semver (v2.4.0, not v2026.03.77)
- Old calendar-based tags should be deleted
- Contact admin if version calculation seems incorrect

### Manual release needed
You can still create releases manually:
```bash
gh release create v2.5.0 \
  --title "Feature: New Dashboard" \
  --generate-notes \
  --repo mikevillargr/redditpipe
```

## Technical Details

**Workflow:** `.github/workflows/deploy-production.yml`
- Job 1: `create-release` - Analyzes commits and creates releases
- Job 2: `deploy` - Deploys to production (runs regardless of release)

**Version Detection:**
- Finds latest semver tag: `git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname`
- Parses MAJOR.MINOR.PATCH components
- Increments based on commit message pattern
- Creates new tag and release

**Deployment:**
- Always runs after release creation (or skip)
- SSH to VPS, git pull, docker compose rebuild
- Health check verification
- ~40-60 seconds total time
