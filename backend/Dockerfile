FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production=false

# Copy prisma schema and generate client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Copy entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Prune dev deps (keep prisma CLI for db push at startup)
RUN npm prune --production && npm install -g prisma@7.4.2

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
