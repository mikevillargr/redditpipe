# RedditPipe

Reddit outreach automation tool — discover relevant Reddit posts, score opportunities using AI, and generate context-aware reply drafts for your clients.

## Features

- **Multi-client management** — Manage multiple clients with distinct keywords, subreddits, and business contexts
- **Reddit account pool** — Assign Reddit accounts to clients; accounts rotate for natural engagement
- **AI-powered scoring** — Anthropic Claude evaluates thread relevance with explainable scores
- **Draft reply generation** — AI generates Reddit-native replies mentioning client services naturally
- **Rate-limit-aware search** — Continuous polling that respects Reddit API limits automatically
- **Publish & verify workflow** — Track reply status from draft → published → verified with permalink
- **Insights engine** — Auto-generates keyword and scoring rules from dismissed opportunities

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Framework   | Next.js 16 (App Router), TypeScript           |
| UI          | React 19, MUI 6, Tailwind CSS                 |
| Database    | Prisma 7, SQLite (file-based, Docker volume)  |
| AI          | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Deployment  | Docker multi-stage, GitHub Actions, VPS       |

## Local Development

```bash
# Install dependencies
npm install

# Push schema to local SQLite
npx prisma db push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default login: `admin` / `admin` (change via env vars).

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/           # Login, session check
│   │   ├── clients/        # CRUD + keyword detection
│   │   ├── accounts/       # Reddit account management
│   │   ├── opportunities/  # Opportunity CRUD, verify, rewrite
│   │   ├── search/run/     # Search pipeline (main engine)
│   │   └── settings/       # App config + API key testing
│   └── page.tsx            # SPA entry point
├── lib/                    # Core logic
│   ├── prisma.ts           # DB client (uses DATABASE_URL)
│   ├── reddit.ts           # Reddit API (OAuth + public JSON)
│   ├── ai.ts               # Reply drafts, rewriting
│   ├── ai-scoring.ts       # AI relevance scoring
│   ├── scoring.ts          # Heuristic scoring
│   ├── matching.ts         # Account-to-client matching
│   └── verification.ts     # Comment verification
├── views/                  # Page components
│   ├── Dashboard.tsx        # Opportunities + cards
│   ├── Clients.tsx          # Client management
│   ├── Accounts.tsx         # Reddit accounts
│   └── Settings.tsx         # Configuration
└── components/             # Shared UI components
```

## Environments

| Environment | Branch    | Port | URL                          |
|-------------|-----------|------|------------------------------|
| Local       | any       | 3000 | http://localhost:3000         |
| Staging     | `staging` | 3100 | http://76.13.191.149:3100    |
| Production  | `main`    | 3200 | http://76.13.191.149:3200    |

## Deployment

### How it works

1. Push to `staging` or `main` triggers GitHub Actions
2. Workflow SSHs into the VPS and pulls the latest code
3. Docker image is built (multi-stage with Prisma caching)
4. Container starts, `entrypoint.sh` runs `prisma db push` for migrations
5. Health check confirms the app is running
6. **Staging**: Commit comment posted with deploy details
7. **Production**: GitHub Release created with changelog

### Required GitHub Secrets

Go to **https://github.com/mikevillargr/redditpipe/settings/secrets/actions** and add:

| Secret            | Description                                                    | How to get it                                               |
|-------------------|----------------------------------------------------------------|-------------------------------------------------------------|
| `VPS_SSH_KEY`     | Private SSH key for `root@76.13.191.149`                       | `cat ~/.ssh/id_ed25519` — paste the entire private key      |
| `REPO_URL`        | Git clone URL                                                  | `https://github.com/mikevillargr/redditpipe.git`            |
| `STAGING_ENV`     | Contents of `.env.staging`                                     | See env format below                                        |
| `PRODUCTION_ENV`  | Contents of `.env.production`                                  | See env format below                                        |

### Env File Format

Paste the full file contents as the secret value:

```
AUTH_USERNAME=admin
AUTH_PASSWORD=your-secure-password
SECURE_COOKIES=false
```

> **Note**: `DATABASE_URL` is set in `docker-compose.*.yml`, not in the env file. API keys (Anthropic, Reddit) are managed in the Settings UI and stored in the database.

### Manual Deploy (SSH)

```bash
# SSH into VPS
ssh root@76.13.191.149

# Staging
cd /docker/redditpipe-staging
git fetch origin staging && git reset --hard origin/staging
docker compose -f docker-compose.staging.yml build
docker compose -f docker-compose.staging.yml up -d

# Production
cd /docker/redditpipe-production
git fetch origin main && git reset --hard origin/main
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

### Database

SQLite is stored on a Docker volume (`staging-data` / `production-data`). Migrations run automatically via `entrypoint.sh` on every container start using `prisma db push`.

To reset a database:
```bash
docker compose -f docker-compose.staging.yml down -v   # deletes volume
docker compose -f docker-compose.staging.yml up -d      # recreates fresh
```

## Git Workflow

```
main ←── production deploys (auto on push)
  │
  └── staging ←── staging deploys (auto on push)
```

- Develop on `main` or feature branches
- Merge to `staging` to test on the staging server
- Merge `staging` to `main` (or push directly) for production
