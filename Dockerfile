# Multi-stage Dockerfile for Lombok Garden Hotel on NevaCloud VPS
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock* ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install tsx globally in container
RUN npm install -g tsx

# Copy built application and node_modules
COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

EXPOSE 3000

CMD ["tsx", "server.ts"]
