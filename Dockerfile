FROM oven/bun:1 AS base

WORKDIR /app

# Install FFmpeg and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Development stage
FROM base AS development
COPY . .
RUN mkdir -p src/views/layouts src/views/partials src/views/home
RUN bun install
CMD ["bun", "run", "dev"]

# Production stage
FROM base AS production
COPY . .
RUN mkdir -p src/views/layouts src/views/partials src/views/home
RUN bun install
RUN bun run build
CMD ["bun", "run", "start"]