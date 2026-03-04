#!/bin/sh
set -e

echo "Running database migrations..."
node ./node_modules/prisma/build/index.js db push 2>&1 || echo "Warning: prisma db push failed, continuing..."

echo "Starting server..."
exec node server.js
