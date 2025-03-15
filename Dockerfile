FROM node:22.14.0-alpine

WORKDIR /app

RUN curl -fsSL https://bun.sh/install | bash

# Copy package files
COPY package.json bun.lock ./

# Install pnpm and dependencies
RUN bun install

# Copy application code
COPY . .

# Build TypeScript
RUN bun run build

# Command will be provided by smithery.yaml
CMD ["node", "dist/index.js"] 