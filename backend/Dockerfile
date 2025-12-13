# ============================================
# Backend Dockerfile - RetroTrade API Server
# ============================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# ============================================
# Stage 2: Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dependencies for native modules (canvas, sharp, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./
COPY --from=builder /app/vie.traineddata ./

# Create uploads directory
RUN mkdir -p uploads/userAvatars

# Set environment variables
ENV NODE_ENV=production
ENV PORT=9999

# Expose port
EXPOSE 9999

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9999/api/v1/test-cors || exit 1

# Start the application
CMD ["node", "server.js"]

# ============================================
# Development stage (for docker-compose.dev.yml)
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Set environment variables
ENV NODE_ENV=development
ENV PORT=9999

# Expose port
EXPOSE 9999

# Start with nodemon for hot-reload
CMD ["npm", "run", "start"]

