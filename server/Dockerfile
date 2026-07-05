# Stage 1: Build base and configure Node.js
FROM node:22-alpine AS base
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm install

# Stage 3: Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN test -f dist/main.js || test -f dist/src/main.js || (echo "main entrypoint not found in dist" && ls -R dist && exit 1)
RUN npm prune --omit=dev

# Stage 4: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy compiled files, production node_modules, and package configuration
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "dist/main"]