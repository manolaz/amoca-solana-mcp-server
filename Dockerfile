FROM node:22-alpine AS builder

# Install pnpm only (removed redundant yarn)
RUN npm install -g pnpm@latest

# Copy package files first for better layer caching
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy source code after installing dependencies
COPY . .

# Build the TypeScript project
RUN pnpm build

FROM node:22-alpine AS release

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/build /app/build
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml* /app/pnpm-lock.yaml*

# Install production dependencies only
RUN npm install -g pnpm@latest && pnpm install --prod

ENTRYPOINT ["node", "build/index.js"]