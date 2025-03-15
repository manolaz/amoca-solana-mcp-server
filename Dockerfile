FROM node:23-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

RUN curl -fsSL https://bun.sh/install | bash

# Install dependencies
RUN bun install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Set executable permissions
RUN chmod +x build/index.js

# Run the server
CMD ["node", "build/index.js"]