FROM node:22-alpine AS builder

# Install pnpm only (removed redundant yarn)
RUN npm install -g pnpm@latest

# Must be entire project because `prepare` script is run during `npm install` and requires all files.
COPY src/ /app
COPY tsconfig.json /tsconfig.json

COPY package.json pnpm-lock.yaml* ./

# Copy package files first for better layer caching
WORKDIR /app

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
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml* /app/pnpm-lock.yaml*


RUN npm ci --ignore-scripts --omit-dev

ENTRYPOINT ["node", "dist/index.js"]