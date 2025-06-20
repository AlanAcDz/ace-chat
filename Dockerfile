# ------ Build stage ------
FROM oven/bun:alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for building)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build


# ------ Production stage ------
FROM oven/bun:alpine AS production
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies including drizzle-kit for migrations
RUN bun install --frozen-lockfile --production
RUN bun add drizzle-kit --dev

# Copy built application from builder stage
COPY --from=builder /app/build ./build

# Copy drizzle configuration and migrations
COPY drizzle.config.ts ./
COPY drizzle ./drizzle

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R bun:bun /app/uploads

# Switch to non-root user for security
USER bun

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/uploads
ENV BODY_SIZE_LIMIT=5M

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Set entrypoint and default command
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "run", "build/index.js", "--host", "0.0.0.0", "--port", "3000"] 