FROM node:20 AS builder

# Copy package files first for better layer caching
WORKDIR /app

# Must be entire project because `prepare` script is run during `npm install` and requires all files.
COPY src/ /app
COPY package.json bun.lock ./
COPY tsconfig.json /tsconfig.json

# Install dependencies
RUN apt-get update
RUN npm install

# Copy source code after installing dependencies
COPY . .

# Build the TypeScript project
RUN npm build

FROM node:20 AS release

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml* /app/pnpm-lock.yaml*


RUN npm ci --ignore-scripts --omit-dev

ENTRYPOINT ["node", "dist/index.js"]