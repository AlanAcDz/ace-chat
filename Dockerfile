# ------ Build stage ------
FROM oven/bun:1 AS builder
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
FROM oven/bun:1 AS production
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Copy built application from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# Copy any other necessary files (like static assets if not in build)
COPY --from=builder /app/static ./static

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R bun:bun /app/uploads

# Switch to non-root user for security
USER bun

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/uploads

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "3000"] 