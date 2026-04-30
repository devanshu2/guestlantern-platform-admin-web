# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install -g npm@11.6.1
RUN npm ci

FROM base AS development
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm install -g npm@11.6.1
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "scripts/run-next.mjs", "dev", "docker.mocked"]

FROM base AS builder
ARG NEXT_PUBLIC_JOB_POLL_INTERVAL_MS=5000
ENV NEXT_PUBLIC_JOB_POLL_INTERVAL_MS=${NEXT_PUBLIC_JOB_POLL_INTERVAL_MS}
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
