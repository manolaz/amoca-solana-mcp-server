FROM node:22.12-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install

# Copy source code and configuration files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:22.12-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

# Copy built JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Run the compiled JavaScript
ENTRYPOINT ["node", "dist/index.js"]

