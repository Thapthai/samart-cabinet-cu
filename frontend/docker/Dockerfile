# ================================
# Multi-stage Dockerfile for Next.js Frontend (Smart Cabinet CU)
# ================================
# ตัวแปร build ตรงกับ frontend/.env.example (NEXT_PUBLIC_BASE_PATH, NEXT_PUBLIC_API_URL)

# --------------------------------
# Stage 1: Dependencies
# --------------------------------
FROM node:20-alpine AS deps
LABEL stage=deps

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for build stage
RUN if [ -f package-lock.json ]; then \
    npm ci; \
    else \
    npm install; \
    fi && \
    npm cache clean --force

# --------------------------------
# Stage 2: Builder
# --------------------------------
FROM node:20-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build args — ตรงกับ .env.example (Smart Cabinet CU), API path: /api/smart-cabinet-cu/v1
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/smart-cabinet-cu/v1
ARG NEXT_PUBLIC_BASE_PATH=/smart-cabinet-cu
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

# Next.js 15 build ใช้ RAM สูง — default heap ~512MB ใน container มัก OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build Next.js application
RUN npm run build

# --------------------------------
# Stage 3: Production Runner
# --------------------------------
FROM node:20-alpine AS production
LABEL stage=production

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4100
ENV HOSTNAME=0.0.0.0

# Runtime env (ต้องตรงกับ build time สำหรับ Next.js public vars)
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/smart-cabinet-cu/v1
ARG NEXT_PUBLIC_BASE_PATH=/smart-cabinet-cu
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}



# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 4100

# Health check — ตรงกับ NEXT_PUBLIC_BASE_PATH (/smart-cabinet-cu)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4100/smart-cabinet-cu', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application — ใช้ 0.0.0.0 เพื่อให้รับ connection จากนอก container
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]

