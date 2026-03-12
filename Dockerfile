# ============================================================
# Stage 1 — Builder (install deps, prune dev dependencies)
# ============================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (leverage Docker layer cache)
COPY app/package*.json ./

# Install ALL dependencies (including devDependencies for potential build steps)
RUN npm install --only=production

# ============================================================
# Stage 2 — Production image (lean, Alpine-based)
# ============================================================
FROM node:18-alpine AS production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source code
COPY app/ .

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Health check for Kubernetes liveness/readiness probes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

# Environment variables
ENV NODE_ENV=production \
    PORT=3000

# Start the application
CMD ["node", "index.js"]
