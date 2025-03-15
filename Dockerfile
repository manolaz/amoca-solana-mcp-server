FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Set executable permissions
RUN chmod +x build/index.js

# Run the server
CMD ["node", "build/index.js"]