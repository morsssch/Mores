# Lightweight Node image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package.json package-lock.json* ./

# Install only production deps first to keep image small
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory for sqlite DBs
RUN mkdir -p /data
VOLUME ["/data"]

# Environment: use small memory footprint; override in runtime if needed
ENV NODE_ENV=production
# Recommend limiting heap to 256MB on 500MB host
ENV NODE_OPTIONS=--max-old-space-size=256
ENV DATA_DIR=/data

# Expose nothing (bot uses outgoing connections)

# Start the compiled bot
CMD ["node", "dist/bot.js"]
