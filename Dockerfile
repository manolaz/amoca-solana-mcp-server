# Stage 1: Build
FROM node:22.14-alpine AS builder

# Enable corepack and use pnpm
RUN npm install --global corepack@latest
RUN corepack enable pnpm
RUN corepack enable yarn
RUN corepack use pnpm@latest-10

# Copy project files
COPY . /app
COPY tsconfig.json /app/tsconfig.json

# Set working directory
WORKDIR /app

# Install dependencies
RUN pnpm install

# Build project (assuming you have a build script in package.json)
# If not, you need to add a build command here, e.g., RUN pnpm run build

# Stage 2: Release
FROM node:22.14-alpine AS release

# Copy necessary files from builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

# Set environment variable
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# This command is unnecessary since dependencies are already installed in the build stage
# RUN pnpm ci --ignore-scripts --omit-dev

# Set entrypoint
ENTRYPOINT ["node", "dist/index.js"]