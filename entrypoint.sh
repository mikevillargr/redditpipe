#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate 2>&1 || echo "Warning: prisma db push failed, continuing..."

echo "Starting server..."
exec node server.js
