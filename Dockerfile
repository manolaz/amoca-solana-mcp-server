FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install pnpm
# RUN wget -qO- https://get.pnpm.io/install.sh | sh -

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Set executable permissions
RUN chmod +x build/index.js

# Run the server
CMD ["node", "build/index.js"]