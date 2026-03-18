# RedditPipe

**Intelligent Reddit outreach automation** — discover relevant threads, generate AI-powered replies, and manage multi-account campaigns with advanced scoring, scheduling, and analytics.

## 🚀 Features

### Core Functionality
- **AI-Powered Thread Discovery** — Automated Reddit search with heuristic pre-filtering and AI scoring
- **Multi-Model Support** — Choose between Claude (Haiku, Sonnet, Opus) and Z.ai GLM models for different tasks
- **Smart Scheduling** — Configurable search frequency (once/twice daily) with timezone support
- **Multi-Account Management** — Assign accounts to clients, track karma, manage verification
- **Pile-On Comments** — Automatically create follow-up opportunities from verified primary comments
- **Deletion Detection** — Monitor and track deleted comments with daily checks

### AI Configuration
- **Model Selection by Activity**:
  - **Scoring Model** — High-volume thread evaluation (Haiku/GLM-Flash recommended)
  - **Reply Generation** — Quality content creation (Sonnet 4.5+ recommended)
  - **Client Detection** — Auto-match threads to clients (Sonnet recommended)
- **Special Instructions** — Custom prompts for reply generation
- **AI Search Tuning** — Relevance threshold and scoring instructions
- **Test Endpoints** — Live testing for each model with sample data

### Analytics & Insights
- **Dismissal Analysis** — Pattern recognition from rejected opportunities
- **Deletion Patterns** — Track and analyze comment deletions
- **Success Metrics** — Monitor published comments and engagement
- **Auto-Apply Rules** — Generate filtering rules from insights

### Settings Organization
Tabbed interface for easy configuration:
- **API Keys** — Reddit (OAuth/Public JSON), Anthropic, Z.ai
- **AI Functions** — Model selection, special instructions, search tuning
- **Search & Scheduling** — Frequency, times, pipeline limits
- **Advanced** — Pile-on settings, deletion detection, dangerous actions

## 🏗️ Architecture

```
backend/     Hono + Node.js + Prisma 7 (SQLite via libsql) — API on port 8000
frontend/    Vite + React + MUI + TypeScript — nginx on port 3200, proxies /api to backend
```

**Tech Stack:**
- **Backend**: Hono, Prisma 7, SQLite, Node.js 20
- **Frontend**: React, MUI, Vite, TypeScript
- **AI**: Anthropic Claude API, Z.ai GLM API
- **Deployment**: Docker Compose, GitHub Actions, nginx

## 📦 Quick Start

### Local Development

```bash
# Clone and setup
git clone https://github.com/mikevillargr/redditpipe.git
cd redditpipe
cp .env.example .env    # edit with your credentials

# Start services
docker compose -f docker-compose.local.yml up --build
```

Open http://localhost:3200 — default login: `admin` / `admin`

**Local mode**: No cron jobs, use **Run Search** button manually in Dashboard.

### Production Deployment

Auto-deploys on push to `main` via GitHub Actions:
1. SSH to VPS
2. Git pull latest changes
3. Docker compose build & restart
4. Health check verification

```bash
# Manual production deploy
docker compose -f docker-compose.production.yml up --build -d
```

**Production URL**: http://76.13.191.149:3200  
**Cron Schedule**: 6am + 2pm UTC

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_USERNAME` | Dashboard login username | Yes |
| `AUTH_PASSWORD` | Dashboard login password | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key (or set in Settings UI) | No* |
| `ZAI_API_KEY` | Z.ai API key (or set in Settings UI) | No* |
| `ENABLE_CRON` | `true` for production, `false` for local | Yes |
| `DATABASE_URL` | SQLite database path | No (defaults to `file:./data/production.db`) |

*At least one AI provider API key required

### Pipeline Limits

Configurable in Settings → Search & Scheduling:
- **Max Keywords Per Client**: 5 (longest/most specific selected)
- **Max Results Per Keyword**: 10
- **Max AI Calls Per Client**: 10 (top candidates only)
- **Max Opportunities Per Client**: 15 (drip limit per run)
- **Heuristic Threshold**: 0.35
- **Thread Max Age**: 2 days

### Rate Limits

- **Reddit Public JSON**: 3s base delay between requests
- **Reddit OAuth**: 1.5s base delay
- **Max Retries**: 3 with exponential backoff

## 🗄️ Database

**SQLite** stored in `./data/` directory. Schema auto-syncs on container start via `prisma db push`.

**Models:**
- `Client` — Outreach clients with keywords and context
- `RedditAccount` — Reddit accounts with karma tracking
- `AccountClientAssignment` — Account-to-client mappings
- `Opportunity` — Discovered threads with scores and status
- `DismissalLog` — Tracking for dismissed opportunities
- `Settings` — Global configuration (API keys, models, schedules)

**Reset database:**
```bash
rm -f data/*.db
docker compose restart
```

## 🔄 Releases

Automated semantic versioning via GitHub Actions:
- `feat:` commits → Minor version bump (v2.x.0)
- `fix:` commits → Patch version bump (v2.x.x)
- `feat!:` or `BREAKING CHANGE:` → Major version bump (vX.0.0)

Latest release: **v2.5.0**

## 📝 API Endpoints

### Core Routes
- `GET /api/opportunities` — List opportunities with filtering
- `GET /api/clients` — List clients
- `GET /api/accounts` — List Reddit accounts
- `GET /api/settings` — Get configuration
- `PUT /api/settings` — Update configuration
- `POST /api/search/run` — Trigger manual search
- `GET /api/search/status` — Get pipeline status

### Test Endpoints
- `POST /api/settings/test-anthropic` — Test Anthropic connection
- `POST /api/settings/test-zai` — Test Z.ai connection
- `POST /api/settings/test-model-scoring` — Test scoring model
- `POST /api/settings/test-model-replies` — Test reply generation
- `POST /api/settings/test-model-detection` — Test client detection

## 🛠️ Development

### Project Structure
```
reddit-outreach/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Hono server entry
│   │   ├── routes/               # API routes
│   │   └── lib/                  # Business logic
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main app
│   │   ├── views/                # Page components
│   │   └── components/           # Reusable components
│   ├── nginx.conf                # SPA routing + API proxy
│   └── Dockerfile
├── docker-compose.local.yml      # Local development
├── docker-compose.production.yml # Production deployment
└── .github/workflows/            # CI/CD pipelines
```

### Key Files
- `backend/src/lib/search-pipeline.ts` — 4-phase search pipeline
- `backend/src/lib/ai-scoring.ts` — AI-powered thread scoring
- `backend/src/lib/cron.ts` — Scheduled search execution
- `frontend/src/views/Settings.tsx` — Tabbed settings interface
- `frontend/src/views/Dashboard.tsx` — Main dashboard with pipeline status

## 📊 Monitoring

- **Pipeline Status** — Real-time progress in Dashboard
- **Health Check** — `GET /api/health` endpoint
- **Docker Logs** — `docker logs redditpipe-backend` / `redditpipe-frontend`
- **Database Size** — Monitor `./data/*.db` file size

## 🔐 Security

- Cookie-based authentication with in-memory session tokens
- API keys stored encrypted in database
- Environment variables for sensitive credentials
- No hardcoded secrets in codebase

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. For access or questions, contact the repository owner.
