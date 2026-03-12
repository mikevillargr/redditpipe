#!/bin/bash
set -e

# Migration script to convert calendar versioning to semantic versioning
# This script will:
# 1. Delete all old calendar-based releases
# 2. Analyze git history to create meaningful semantic versions
# 3. Create new releases with proper semver tags and release notes

echo "🔄 Starting migration to semantic versioning..."

# Current state: v2026.03.78 (latest)
# Target state: v2.3.0 (using semver)

# Strategy:
# - Major version 2: Represents the Hono + Vite rewrite (Option B)
# - Minor version increments: New features
# - Patch version increments: Bug fixes and improvements

# Function to create release with notes
create_release() {
  local version=$1
  local commit=$2
  local title=$3
  
  echo "📦 Creating release $version at commit $commit..."
  
  # Get commit message and details
  local commit_msg=$(git log --format=%B -n 1 $commit)
  
  # Create release notes based on version
  local notes=""
  
  case $version in
    "v2.3.0")
      notes="## 🎨 UI Standardization & Insights Improvements

### ✨ New Features
- **Insights Page Modernization**
  - Tab interface: Dismissal Insights vs Deletion Patterns
  - Individual recommendation selection with checkboxes
  - Renamed 'AI-Generated Recommendations' to 'Recommendations'
  - Clear messaging about Special Instructions setting
  - Stats cards and visualizations

- **Automated Deletion Analysis**
  - Daily cron job at 8 PM UTC
  - Analyzes up to 50 deletions per run
  - Zero manual work required
  - Continuous learning from deletions

- **UI Standardization**
  - Clear distinction between status pills and action buttons
  - Status pills: Non-interactive indicators (✓ Published, ● New, etc.)
  - Action buttons: Proper Button components with icons and hover states
  - Modern Material Design patterns

### 🐛 Bug Fixes
- Fixed dismiss functionality (HTTP method mismatch)
- Corrected Deleted tab count to respect client filter

### 📊 Improvements
- Better UX with inline deletion analysis modal
- Loading states and error handling
- Consistent interaction patterns across the app"
      ;;
      
    "v2.2.0")
      notes="## 🤖 Deletion Analysis System

### ✨ New Features
- **AI-Powered Deletion Analysis**
  - Analyzes why comments were deleted by moderators
  - Provides actionable recommendations
  - Tracks deletion patterns by subreddit
  - Confidence scoring for deletion reasons

- **Deletion Detection**
  - Automated daily checks for deleted comments
  - False positive prevention with author verification
  - Restore functionality for deleted opportunities
  - Deletion filters on Dashboard and Reports

### 🐛 Bug Fixes
- Fixed account age display accuracy
- Improved deletion detection query logic
- Dark mode styling for Reports tabs

### 📊 Improvements
- Expandable text in Reports table
- Better error handling and UI feedback"
      ;;
      
    "v2.1.0")
      notes="## 📊 Reports Page Enhancements

### ✨ New Features
- **Pile-On System**
  - Complete pile-on redesign
  - Secondary account support
  - Pile-on filter and reporting
  - AI-generated +1 responses

- **Special Instructions**
  - Override default URL requirements
  - Live AI preview
  - Citation tracking
  - Priority handling

- **Account Management**
  - Auto-assignment features
  - Bulk assign capabilities
  - Manual account assignment
  - Reassign functionality

### 🐛 Bug Fixes
- Fixed copy to clipboard functionality
- Improved account verification
- Activity log improvements

### 📊 Improvements
- Published timestamp tracking
- Better reports UX
- Clickable thread titles"
      ;;
      
    "v2.0.0")
      notes="## 🚀 Architecture Rewrite (Option B)

### ✨ Major Changes
- **Backend**: Migrated to Hono + Node.js + Prisma 7
- **Frontend**: Migrated to Vite + React + MUI
- **Database**: SQLite via libsql adapter
- **Deployment**: GitHub Actions with GHCR

### 🏗️ Architecture
- Hono backend at port 8000
- Vite frontend served via nginx at port 3200
- Docker Compose for production
- Automated CI/CD pipeline

### 📦 Key Components
- RESTful API routes
- Prisma 7 ORM with SQLite
- Modern React with MUI components
- Optimized build process

### ⚡ Performance
- Faster deployments (~1 minute)
- Better caching strategies
- Optimized Docker builds
- Improved rate limiting"
      ;;
  esac
  
  # Create the release
  gh release create "$version" \
    --target "$commit" \
    --title "$title" \
    --notes "$notes" \
    --repo mikevillargr/redditpipe
    
  echo "✅ Created release $version"
}

# Main execution
echo "⚠️  This will delete all existing releases and create new semver releases."
echo "📋 New releases to create:"
echo "  - v2.3.0: UI Standardization & Insights Improvements"
echo "  - v2.2.0: Deletion Analysis System"
echo "  - v2.1.0: Reports Page Enhancements"
echo "  - v2.0.0: Architecture Rewrite"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted"
  exit 1
fi

# Delete all old releases
echo "🗑️  Deleting old calendar-based releases..."
gh release list --repo mikevillargr/redditpipe --limit 100 | awk '{print $3}' | while read tag; do
  if [[ $tag =~ ^v2026\. ]]; then
    echo "  Deleting $tag..."
    gh release delete "$tag" --yes --repo mikevillargr/redditpipe 2>/dev/null || true
    git push --delete origin "$tag" 2>/dev/null || true
  fi
done

# Create new semver releases in chronological order
create_release "v2.0.0" "8e87bc6" "Architecture Rewrite (Hono + Vite)"
create_release "v2.1.0" "96c0629" "Reports Page Enhancements"
create_release "v2.2.0" "f5ad9d1" "Deletion Analysis System"
create_release "v2.3.0" "472ecc0" "UI Standardization & Insights Improvements"

echo ""
echo "✅ Migration complete!"
echo "📦 New releases created with semantic versioning"
echo "📝 All releases include detailed release notes"
echo ""
echo "Going forward, use semantic versioning:"
echo "  - MAJOR: Breaking changes"
echo "  - MINOR: New features (backwards compatible)"
echo "  - PATCH: Bug fixes and improvements"
