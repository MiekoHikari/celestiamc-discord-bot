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

# Copy all necessary files for building
COPY . .

# Install all dependencies
RUN pnpm install

# Clean dist directory and build TypeScript code
RUN rm -rf dist && \
    pnpm build && \
    echo "Listing contents of /app:" && \
    ls -la /app && \
    echo "Listing contents of /app/dist:" && \
    ls -la /app/dist || true

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

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Verify the files were copied correctly
RUN echo "Listing contents of /app:" && \
    ls -la /app && \
    echo "Listing contents of /app/dist:" && \
    ls -la /app/dist || true

# Install only production dependencies
RUN pnpm install --prod

# Expose any necessary ports (if your bot uses any)
EXPOSE 31885

# Start the bot
CMD ["node", "dist/index.js"] 