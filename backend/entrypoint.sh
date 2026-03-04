#!/bin/sh
set -e

echo "[Entrypoint] Ensuring data directory exists..."
mkdir -p /app/data

echo "[Entrypoint] Running Prisma DB push..."
npx prisma db push --accept-data-loss 2>&1 || echo "[Entrypoint] WARNING: prisma db push failed (may be first run)"

echo "[Entrypoint] Starting backend..."
exec node dist/index.js
