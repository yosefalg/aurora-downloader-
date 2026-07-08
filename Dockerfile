FROM python:3.11-slim AS yt-dlp
RUN pip install --no-cache-dir yt-dlp

FROM node:18-alpine AS builder
RUN apk add --no-cache python3 make g++ ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
RUN apk add --no-cache ffmpeg python3
COPY --from=yt-dlp /usr/local/bin/yt-dlp /usr/local/bin/yt-dlp
WORKDIR /app
ENV NODE_ENV=production
ENV DOWNLOAD_PATH=/downloads
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /downloads && chown nextjs:nodejs /downloads
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
