# Stage 1: Build static SPA bundle with Node
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .
RUN npm run build

# Stage 2: Serve static files with Caddy
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
