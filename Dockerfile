FROM node:22.12-alpine AS builder

COPY . /app
# Move tsconfig.json to the correct location
COPY tsconfig.json /app/tsconfig.json

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm npm install

# Add the build step to compile TypeScript to JavaScript
RUN npm run build

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts --omit-dev

FROM node:22-alpine AS release

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

WORKDIR /app

RUN npm ci --ignore-scripts --omit-dev

# Fix the entrypoint to use compiled JavaScript instead of TypeScript
ENTRYPOINT ["node", "dist/index.js"]

