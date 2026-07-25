FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/
RUN mkdir -p logs
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser
EXPOSE 4000
ENV NODE_OPTIONS="--max-old-space-size=512"
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1
CMD ["npx", "tsx", "src/index.ts"]
