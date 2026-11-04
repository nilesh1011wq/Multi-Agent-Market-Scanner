# ----------------------------------------------------
# Multi-stage Dockerfile for Multi-Agent Market Scanner
# ----------------------------------------------------

# Stage 1: Full-stack Node & Python base
FROM node:22-bookworm-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Backend runtime
FROM base AS backend
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8000
CMD ["node", "--loader", "tsx", "server.ts"]

# Stage 3: Frontend builder & server
FROM base AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "dev"]
