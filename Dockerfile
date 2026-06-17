# ============================================================
# mcp-api-gateway · Multi-stage Docker 构建
# ============================================================

# ---- Stage 1: 前端编译 (Vite) ----
FROM node:22-alpine AS web-build
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:web

# ---- Stage 2: 后端编译 (tsc) ----
FROM node:22-alpine AS server-build
WORKDIR /build
COPY package*.json tsconfig*.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build:server

# ---- Stage 3: 运行镜像 ----
FROM node:22-alpine
WORKDIR /app

# 仅安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 复制编译产物
COPY --from=server-build /build/dist/server/ ./server/
COPY --from=web-build   /build/public/        ./public/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/internal/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
