# mcp-api-gateway

集中管理个人 API 接口，并将其封装转化为 MCP (Model Context Protocol) 服务的全栈网关应用。

## 功能亮点

- **API 项目集管理**：支持自定义接口、OpenAPI 托管、文件系统集成和视觉智能四种项目类型
- **MCP 服务引擎**：基于 Streamable HTTP 协议，自动将注册的 API 节点暴露为标准 MCP 工具
- **项目级 MCP 动态网关**：每个项目可独立启用 MCP 服务，通过 `/:slug/mcp` 端点对外提供工具调用
- **文件系统原子能力**：内置 Glob 匹配、目录检索、正则搜索、文件读写等 7 种文件系统工具
- **多模态视觉引擎**：支持 UI 还原、OCR 识别、图像分析、视频分析等 5 种视觉 AI 能力
- **AI SDK 统一网关**：集成 OpenAI、Google、Anthropic 及 Ollama 等多模型提供商
- **全局设置持久化**：加密存储 API 密钥与 AI 提供商/模型配置
- **在线调试沙箱**：在浏览器中直接测试 API 节点与文件系统能力
- **多模态媒体输入**：支持 URL 输入、本地文件选择和剪贴板粘贴三种模式的媒体文件选择
- **审计日志**：记录所有操作行为，支持 7 天滚动轮转
- **暗黑模式 UI**：极简科技感设计，前后端分离架构

## 系统要求

- **Node.js** >= 18
- **浏览器**: 支持 ES2022 的现代浏览器

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（前后端并发，支持 HMR）
npm run dev
```

后端服务默认运行在 `http://localhost:3000`，前端开发服务器默认运行在 `http://localhost:5173`（自动代理 `/internal` 和 `/api` 请求到后端）。

## 构建与生产运行

```bash
# 类型检查 + 前端构建 + 后端编译
npm run build

# 构建产物输出至 dist/（后端）和 public/（前端）
# 使用 Node 直接运行编译后的服务端
node server/index.js
```

## 测试

```bash
# 运行全部单元测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告（要求总体 ≥ 70%，核心业务 ≥ 80%）
npm run test:coverage
```

## Docker 部署

项目提供多阶段 Dockerfile 构建轻量级生产镜像：

```bash
# 构建 Docker 镜像
docker build -t mcp-api-gateway .

# 运行容器（数据持久化挂载 .data 目录）
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/.data:/app/.data \
  -e GATEWAY_SECRET=your-encryption-secret \
  --name mcp-gateway \
  mcp-api-gateway

# 使用 Docker Compose（需自行编写 docker-compose.yml）
```

容器默认监听 `3000` 端口，内置健康检查端点 `GET /internal/health`。

## CI/CD 自动化

推送语义化版本标签（`v*.*.*` 或 `V*.*.*`）时自动触发 GitHub Actions 流水线：

1. **类型检查** — TypeScript 编译验证
2. **单元测试** — 全量测试 + 覆盖率报告
3. **构建验证** — 前后端完整构建
4. **Docker 镜像构建与推送** — 推送至 GitHub Container Registry
5. **GitHub Release 创建** — 自动提取 CHANGELOG 生成发布说明

## 项目结构

```
├── src/
│   ├── server/              # 后端服务 (Express + MCP)
│   │   ├── index.ts         # 服务入口，注册路由与中间件
│   │   ├── routes/          # 路由定义（/internal 内部管理接口）
│   │   │   └── api/         # 路由定义（/api 外部接口）
│   │   ├── middleware/      # 中间件（日志、限流、错误处理、MCP 守卫）
│   │   └── services/        # 业务服务层（存储、持久化、MCP、AI 等）
│   ├── web/                 # 前端 SPA (React 19)
│   │   ├── main.tsx         # 前端入口
│   │   ├── App.tsx          # 根组件（侧边栏导航 + 视图路由）
│   │   ├── components/      # 可复用 UI 组件
│   │   ├── pages/           # 页面组件（工作台、项目、节点、文件系统、视觉、设置）
│   │   └── styles.ts        # 暗黑模式设计系统（CSS 变量 + 布局对象）
│   └── shared/              # 前后端共享类型与契约
├── public/                  # 前端构建产物
├── .data/                   # 运行时数据持久化目录（自动生成）
├── .github/workflows/       # CI/CD 流水线定义
├── Dockerfile               # 多阶段 Docker 构建
└── .dockerignore            # Docker 构建上下文排除规则
```

## 技术栈

| 类别           | 技术                                                  |
| -------------- | ----------------------------------------------------- |
| 运行时         | Node.js >= 18                                         |
| 语言           | TypeScript (strict) / ES Modules                      |
| 后端框架       | Express 4                                             |
| 前端框架       | React 19                                              |
| 构建工具       | Vite 6                                                |
| 测试框架       | Vitest 3（globals: true）                              |
| MCP SDK        | @modelcontextprotocol/sdk 1.29 (Streamable HTTP)      |
| AI SDK         | ai 6 + @ai-sdk/openai / google / anthropic            |
| 数据校验       | Zod 4                                                 |
| 代码执行       | tsx (TypeScript 直接运行)                             |
| 容器化         | Docker (Multi-stage)                                  |
| CI/CD          | GitHub Actions                                        |
