FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 appuser
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY drizzle/ ./drizzle/
COPY --from=builder /app/src/utils/logger.ts ./src/utils/logger.ts
RUN mkdir -p logs && chown appuser:appuser logs
USER appuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1
CMD ["node", "dist/index.js"]
