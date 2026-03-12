#!/usr/bin/env python3
"""
Migration script to convert calendar versioning to semantic versioning.
This script will:
1. Delete all old calendar-based releases
2. Create new releases with proper semver tags and release notes
"""

import subprocess
import sys

# Define releases to create (in chronological order)
RELEASES = [
    {
        "version": "v2.0.0",
        "commit": "8e87bc6",
        "title": "Architecture Rewrite (Hono + Vite)",
        "notes": """## 🚀 Architecture Rewrite (Option B)

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
- Improved rate limiting"""
    },
    {
        "version": "v2.1.0",
        "commit": "96c0629",
        "title": "Reports Page Enhancements",
        "notes": """## 📊 Reports Page Enhancements

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
- Clickable thread titles"""
    },
    {
        "version": "v2.2.0",
        "commit": "f5ad9d1",
        "title": "Deletion Analysis System",
        "notes": """## 🤖 Deletion Analysis System

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
- Better error handling and UI feedback"""
    },
    {
        "version": "v2.3.0",
        "commit": "472ecc0",
        "title": "UI Standardization & Insights Improvements",
        "notes": """## 🎨 UI Standardization & Insights Improvements

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
- Consistent interaction patterns across the app"""
    }
]

def run_command(cmd, check=True):
    """Run a shell command and return output."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=check
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {cmd}")
        print(f"Error: {e.stderr}")
        if check:
            raise
        return None

def delete_old_releases():
    """Delete all calendar-based releases."""
    print("🗑️  Deleting old calendar-based releases...")
    
    # Get list of all releases
    output = run_command("gh release list --repo mikevillargr/redditpipe --limit 100")
    
    if not output:
        print("  No releases found")
        return
    
    # Parse and delete calendar-based releases
    for line in output.split('\n'):
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) >= 3:
            tag = parts[2]  # Tag is the 3rd column
            if tag.startswith('v2026.'):
                print(f"  Deleting {tag}...")
                run_command(f"gh release delete {tag} --yes --repo mikevillargr/redditpipe", check=False)
                run_command(f"git push --delete origin {tag}", check=False)

def create_release(version, commit, title, notes):
    """Create a new release with semver tag and notes."""
    print(f"📦 Creating release {version} at commit {commit}...")
    
    # Write notes to temp file
    with open('/tmp/release_notes.md', 'w') as f:
        f.write(notes)
    
    # Create release
    cmd = f'gh release create {version} --target {commit} --title "{title}" --notes-file /tmp/release_notes.md --repo mikevillargr/redditpipe'
    run_command(cmd)
    print(f"✅ Created release {version}")

def main():
    print("🔄 Starting migration to semantic versioning...")
    print()
    print("⚠️  This will delete all existing releases and create new semver releases.")
    print("📋 New releases to create:")
    for release in RELEASES:
        print(f"  - {release['version']}: {release['title']}")
    print()
    
    response = input("Continue? (y/N) ")
    if response.lower() != 'y':
        print("❌ Aborted")
        sys.exit(1)
    
    # Delete old releases
    delete_old_releases()
    
    # Create new semver releases
    for release in RELEASES:
        create_release(
            release['version'],
            release['commit'],
            release['title'],
            release['notes']
        )
    
    print()
    print("✅ Migration complete!")
    print("📦 New releases created with semantic versioning")
    print("📝 All releases include detailed release notes")
    print()
    print("Going forward, use semantic versioning:")
    print("  - MAJOR: Breaking changes")
    print("  - MINOR: New features (backwards compatible)")
    print("  - PATCH: Bug fixes and improvements")

if __name__ == '__main__':
    main()
