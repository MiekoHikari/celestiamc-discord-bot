# Use Node.js LTS version as the base image
FROM node:20-slim AS builder

# Install Python and build essentials
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install specific version of pnpm
RUN corepack enable && corepack prepare pnpm@10.9.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy source code and config files
COPY src/ ./src/
COPY tsconfig.json .swcrc ./

# Install dependencies
RUN pnpm install

# Build TypeScript code
RUN pnpm build

# Production image
FROM node:20-slim

# Install Python and build essentials
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install specific version of pnpm
RUN corepack enable && corepack prepare pnpm@10.9.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy built files and install production dependencies
COPY --from=builder /app/dist ./dist
RUN pnpm install --prod

# Expose any necessary ports (if your bot uses any)
EXPOSE 31885

# Start the bot
CMD ["pnpm", "start"] 