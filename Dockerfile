FROM oven/bun:1 as base

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Development stage
FROM base as development
COPY . .
RUN mkdir -p src/views/layouts src/views/partials src/views/home
RUN bun install
CMD ["bun", "run", "dev"]

# Production stage
FROM base as production
COPY . .
RUN mkdir -p src/views/layouts src/views/partials src/views/home
RUN bun install
RUN bun run build
CMD ["bun", "run", "start"]