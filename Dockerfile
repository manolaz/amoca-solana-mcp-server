# syntax=docker/dockerfile:1

# Define build arguments for Node.js and pnpm versions
ARG NODE_VERSION=22.14.0
ARG PNPM_VERSION=10.4.1

# Base image for development and building
FROM node:${NODE_VERSION} AS base

# Update Corepack and enable pnpm
RUN npm install --global corepack@latest && corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Set working directory
WORKDIR /app

# Builder stage for installing dependencies and building the application
FROM base AS builder

# Copy package manager files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with pnpm
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install --frozen-lockfile

# Copy application source code
COPY src ./src
COPY tsconfig.json ./

# Build the TypeScript application
RUN pnpm run build

# Production stage with minimal image
FROM node:${NODE_VERSION}-slim AS final

# Enable pnpm in the production image
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Set working directory
WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment to production
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/index.js"]