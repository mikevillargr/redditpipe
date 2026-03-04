# RedditPipe

Reddit outreach automation tool — discover relevant posts, score opportunities, and generate context-aware reply drafts.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, MUI, Tailwind CSS
- **Database**: Prisma 7 + SQLite
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **Deployment**: Docker, GitHub Actions

## Local Development

```bash
cp .env.example .env.local
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environments

| Environment | Branch    | Port | URL                          |
|-------------|-----------|------|------------------------------|
| Local       | any       | 3000 | http://localhost:3000         |
| Staging     | `staging` | 3100 | http://76.13.191.149:3100    |
| Production  | `main`    | 3200 | http://76.13.191.149:3200    |

## Deployment

Deployments are automated via GitHub Actions:
- **Staging**: Push to `staging` branch triggers deploy to VPS port 3100
- **Production**: Push to `main` branch triggers deploy to VPS port 3200

### Required GitHub Secrets

Set these in your repo under **Settings → Secrets and variables → Actions**:

| Secret            | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `VPS_SSH_KEY`     | Private SSH key for root access to the VPS (76.13.191.149)                  |
| `REPO_URL`        | Git clone URL for the repo (e.g. `https://github.com/user/redditpipe.git`) |
| `STAGING_ENV`     | Full contents of `.env.staging` (all env vars, one per line)                |
| `PRODUCTION_ENV`  | Full contents of `.env.production` (all env vars, one per line)             |

> **Note**: `PRODUCTION_ENV` and the production deploy workflow use a GitHub **environment** called `production`. Create it under **Settings → Environments** to enable approval gates if desired.

### Env File Format

Use `.env.example` as a template. The `STAGING_ENV` / `PRODUCTION_ENV` secrets should contain the full file contents:

```
DATABASE_URL=file:/app/data/staging.db
AUTH_USERNAME=admin
AUTH_PASSWORD=your-staging-password
ANTHROPIC_API_KEY=sk-ant-...
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USERNAME=...
REDDIT_PASSWORD=...
```

### Manual Docker Deploy

```bash
# Staging
docker compose -f docker-compose.staging.yml build --no-cache
docker compose -f docker-compose.staging.yml up -d

# Production
docker compose -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.production.yml up -d
```

Database migrations run automatically on container startup via `entrypoint.sh`.
