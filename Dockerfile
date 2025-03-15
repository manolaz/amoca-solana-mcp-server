FROM node:22.12-alpine AS builder

COPY . /app

WORKDIR /app

# Install dependencies using npm ci
COPY package.json package-lock.json ./
RUN npm ci

# Build the project
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Final stage: lightweight image for running the app
FROM node:22.12-alpine

WORKDIR /app

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Install only production dependencies
RUN npm install --production

# Expose the port your app runs on (if necessary)
EXPOSE 3000

# Command to start the application
CMD ["node", "dist/index.js"]