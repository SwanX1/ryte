FROM oven/bun:1 AS base

WORKDIR /app

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