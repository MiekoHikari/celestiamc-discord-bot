# Use Node.js LTS version as the base image
FROM node:20-slim

# Install Python and build essentials
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build TypeScript code
RUN pnpm build

# Expose any necessary ports (if your bot uses any)
EXPOSE 31885

# Start the bot
CMD ["pnpm", "start"] 