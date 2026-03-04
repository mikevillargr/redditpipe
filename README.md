# RedditPipe

Reddit outreach tool: discover relevant threads, generate AI replies, manage multi-account campaigns.

## Architecture

```
backend/    Hono + Node.js + Prisma 7 (SQLite) — API on port 8000
frontend/   Vite + React + MUI — nginx on port 3200, proxies /api to backend
```

## Local Development

```bash
cp .env.example .env    # edit with your credentials
docker compose -f docker-compose.local.yml up --build
```

Open http://localhost:3200 — no cron jobs, use **Run Search** button manually.

## Production

Auto-deploys on push to `main` via GitHub Actions (SSH → git pull → docker compose build → up).

```bash
docker compose -f docker-compose.production.yml up --build -d
```

URL: http://76.13.191.149:3200 — cron runs at 6am + 2pm UTC.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH_USERNAME` | Dashboard login |
| `AUTH_PASSWORD` | Dashboard password |
| `ANTHROPIC_API_KEY` | Anthropic API key (or set in Settings UI) |
| `ENABLE_CRON` | `true` for production, `false` for local |

## Database

SQLite stored in `./data/`. Schema syncs on container start via `prisma db push` in entrypoint.

Reset: `rm -f data/*.db` then restart containers.
