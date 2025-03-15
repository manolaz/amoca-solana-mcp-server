# Builder stage
FROM node:22.12-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies with caching
RUN --mount=type=cache,target=/root/.npm npm install

# Copy source code and configuration files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:22.12-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies with caching
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

# Copy built JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Set the entry point to run the application
ENTRYPOINT ["node", "dist/index.js"]
