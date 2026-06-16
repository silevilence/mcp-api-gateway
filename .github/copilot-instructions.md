
# mcp-api-gateway — AI 开发者指南

> 本文档面向 AI 编码助手（GitHub Copilot 等）及项目贡献者。
> 所有约束均可从实际代码库验证，请勿臆测不存在的特性。

---

## 1. 项目概述

**mcp-api-gateway** 是一个集中管理个人 API 接口，并将其封装转化为 MCP (Model Context Protocol) 服务的全栈网关应用。

### 架构模式

```
┌──────────────────────────────────────────────────┐
│              前端 (React SPA)                      │
│      src/web/  —  Vite 开发服务器 :5173            │
└──────────────────┬───────────────────────────────┘
                   │ HTTP REST (JS fetch)
                   ▼
┌──────────────────────────────────────────────────┐
│           后端 (Express 服务) :3000                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ /internal/*│  │   /api/*   │  │/api/:slug  │ │
│  │ 管理接口   │  │ 外部/服务  │  │ /mcp       │ │
│  └─────┬──────┘  └─────┬──────┘  │项目级MCP   │ │
│        │               │         └────────────┘ │
│        ▼               ▼                         │
│  ┌───────────────────────────────────────────────┤
│  │           Services 业务层                      │
│  │  store → persistence  JSON 文件持久化         │
│  │  settingsStore → 加密 API 密钥存储            │
│  │  mcpService → Streamable HTTP 会话管理       │
│  │  aiGatewayService → AI SDK 客户端缓存         │
│  │  visionService → 多模态推理                   │
│  │  fileSystemService → 文件原子能力              │
│  │  auditService → 审计日志 + 7天轮转            │
│  │  sandboxService → HTTP 请求引擎               │
│  └───────────────────────────────────────────────┘
└──────────────────────────────────────────────────┘
```

### 各层职责

| 层 | 目录 | 职责 |
|---|---|---|
| **共享类型** | `src/shared/` | 前后端共用的接口/类型定义、能力元数据常量 |
| **后端服务** | `src/server/` | Express 路由、中间件、业务服务、MCP 引擎 |
| **前端 SPA** | `src/web/` | React 组件、页面、API 客户端、暗黑模式设计系统 |
| **数据持久** | `.data/` (自动生成) | JSON 文件存储、加密密钥文件 |

---

## 2. 技术栈

| 类别 | 技术 | 版本约束 |
|---|---|---|
| 运行时 | Node.js | >= 18 |
| 语言 | TypeScript | ^5.7，strict 模式，ES2022 target |
| 模块规范 | ES Modules (ESM) | `"type": "module"` in package.json |
| 后端框架 | Express | ^4.21 |
| 前端框架 | React | ^19，使用 react-jsx runtime |
| 构建工具 | Vite | ^6，使用 @vitejs/plugin-react |
| 测试框架 | Vitest | ^3，环境 node，globals: true |
| MCP SDK | @modelcontextprotocol/sdk | ^1.29 (Streamable HTTP) |
| AI SDK | ai + @ai-sdk/openai / google / anthropic | ^6 / ^3 |
| 数据校验 | Zod | ^4 |
| TypeScript 执行 | tsx | ^4 (非 tsc，dev 模式下直接运行 .ts) |

**硬约束**:
- 禁止降级 `@modelcontextprotocol/sdk` 低于 1.29 — Streamable HTTP 需要此版本
- 所有文件必须使用 ESM 语法（`import`/`export`），不可使用 `require`
- `tsconfig.json` 中 `moduleResolution` 为 `bundler`

---

## 3. 目录结构

```
mcp-api-gateway/
├── src/
│   ├── server/                         # 【后端】Express 服务层
│   │   ├── index.ts                    # 入口：注册中间件 + 路由 + 启动
│   │   ├── routes/
│   │   │   ├── index.ts                # Barrel export 所有路由
│   │   │   ├── health.ts               # GET /internal/health
│   │   │   ├── projects.ts             # CRUD /internal/projects
│   │   │   ├── nodes.ts                # CRUD /internal/nodes
│   │   │   ├── openapi.ts              # /internal/openapi 导入解析
│   │   │   ├── audit.ts                # GET /internal/audit-logs
│   │   │   └── api/                    # 【/api 命名空间路由】
│   │   │       ├── index.ts            # Barrel export
│   │   │       ├── projects.ts         # CRUD /api/projects
│   │   │       ├── nodes.ts            # CRUD /api/nodes
│   │   │       ├── audit.ts            # GET /api/audit-logs
│   │   │       ├── mcp.ts              # POST /api/mcp (MCP 端点)
│   │   │       ├── projectMcp.ts       # 项目级 MCP 动态路由 + mcpGuard
│   │   │       ├── sandbox.ts          # POST /api/sandbox/execute 调试
│   │   │       ├── fileSystem.ts       # POST /api/filesystem/* 能力调用
│   │   │       ├── vision.ts           # POST /api/vision/* 视觉分析
│   │   │       └── settings.ts         # GET/PUT /api/settings 配置管理
│   │   ├── middleware/
│   │   │   ├── index.ts                # Barrel export
│   │   │   ├── errorHandler.ts         # 全局错误处理
│   │   │   ├── requestLogger.ts        # 请求日志
│   │   │   ├── rateLimiter.ts          # 简易令牌桶限流
│   │   │   └── mcpGuard.ts             # MCP 动态网关守卫
│   │   └── services/
│   │       ├── store.ts                # 内存数据存储层（Map-based）
│   │       ├── persistence.ts          # JSON 文件持久化（debounce 500ms）
│   │       ├── projectService.ts       # 项目集业务逻辑
│   │       ├── nodeService.ts          # 节点业务逻辑
│   │       ├── mcpService.ts           # MCP 引擎（会话管理 + 工具注册）
│   │       ├── settingsStore.ts        # 全局设置 + AES-256-GCM 加密
│   │       ├── aiGatewayService.ts     # AI SDK 统一网关 + 客户端缓存
│   │       ├── visionService.ts        # 视觉智能推理服务
│   │       ├── fileSystemService.ts    # 文件系统原子能力（7 种）
│   │       ├── sandboxService.ts       # HTTP 请求沙箱执行引擎
│   │       ├── auditService.ts         # 审计日志服务
│   │       ├── auditStore.ts           # 审计日志按天分片存储
│   │       ├── openapiParser.ts        # OpenAPI 规范解析器
│   │       ├── slugService.ts          # Slug 生成与唯一性校验
│   │       └── projectMcpService.ts    # 项目级 MCP 工具工厂
│   ├── web/                            # 【前端】React SPA
│   │   ├── index.html                  # HTML 入口
│   │   ├── main.tsx                    # React 入口注入
│   │   ├── App.tsx                     # 根组件：侧边栏导航 + 视图切换
│   │   ├── apiClient.ts                # 统一 API 客户端（/internal 调用）
│   │   ├── styles.ts                   # CSS 变量 + 布局系统（暗黑模式）
│   │   ├── components/                 # 可复用 UI 组件
│   │   │   ├── AuditLogViewer.tsx      # 审计日志表格
│   │   │   ├── ConfirmDialog.tsx       # 确认弹窗
│   │   │   ├── FieldHint.tsx           # 字段提示
│   │   │   ├── JsonViewer.tsx          # JSON 查看器
│   │   │   ├── NodeForm.tsx            # 节点编辑表单
│   │   │   ├── OpenApiImport.tsx       # OpenAPI 导入面板
│   │   │   ├── ParamEditor.tsx         # 参数编辑器
│   │   │   ├── ProjectForm.tsx         # 项目编辑表单
│   │   │   ├── SandboxPanel.tsx        # 在线调试面板
│   │   │   └── Toast.tsx               # 轻提示组件
│   │   └── pages/                      # 页面组件
│   │       ├── DashboardPage.tsx       # 工作台看板
│   │       ├── NodesPage.tsx           # 节点管理
│   │       ├── ProjectsPage.tsx        # 项目管理
│   │       ├── FileSystemPage.tsx      # 文件系统能力面板
│   │       ├── VisionPage.tsx          # 视觉智能调试面板
│   │       └── SettingsPage.tsx        # 提供商/模型设置
│   └── shared/
│       └── types.ts                    # 全部共享类型/接口/常量
├── public/                             # Vite 构建输出
├── .data/                              # 运行时持久化数据（自动生成）
│   ├── projects.json
│   ├── nodes.json
│   ├── settings.json
│   └── .encryption-key
├── docs/superpowers/                   # 设计文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 4. 核心架构与约束

### 4.1 路由双层命名空间

- **`/internal/*`** — 内部管理接口（供前端 SPA 调用）。路由定义在 `src/server/routes/`。
- **`/api/*`** — 外部服务接口（预留对外暴露）。路由定义在 `src/server/routes/api/`。
- **`/api/:slug/mcp`** — 项目级 MCP 端点（动态路由，必须在其他 `/api/*` 之后注册）。
- 两套路由的业务逻辑完全复用同一套 `services/`，仅路由定义分离。

### 4.2 数据持久化架构

- **运行时存储**: `store.ts` 使用 `Map<string, T>` 内存存储。
- **磁盘持久化**: `persistence.ts` 通过 debounce (500ms) 自动刷入 JSON 文件。
- **写操作** (insert/update/delete) 后必须调用 `scheduleFlush()`。
- **启动流程**: `store.init()` 异步加载 → 数据写入内存后服务才监听端口。
- **设置存储**: 独立于主存储，使用 `settingsStore.ts` 管理，API 密钥使用 AES-256-GCM 加密。
- 加密密钥来源（优先级）: `GATEWAY_SECRET` 环境变量 > `/.data/.encryption-key` 持久化文件 > 运行时生成。

### 4.3 MCP 服务引擎

- 使用 `@modelcontextprotocol/sdk` 的 `StreamableHTTPServerTransport`。
- 每个会话有独立的 `McpServer` + `Transport` 配对（协议限制：一个 Server 只连一个 Transport）。
- 会话超时 30 分钟无活动自动销毁。
- 全局 MCP 端点: `POST /api/mcp`（项目集级别工具）。
- 项目级 MCP 端点: `POST /api/:slug/mcp`（每个项目的独立 MCP Server）。
- 项目级 MCP 需要经过 `mcpGuard` 中间件校验 slug 有效性和 mcpEnabled 状态。

### 4.4 AI 网关与视觉服务

- `aiGatewayService.ts` 维护 `clientCache`（Map），按 modelId 缓存 AI SDK 客户端实例。
- `resolveClient(modelDbId)` 自动查找模型 → 查找提供商 → 创建/返回缓存客户端。
- `visionService.ts` 调用 `ai` 包的 `generateText`，通过 `resolveClient` 获取模型客户端。
- 支持四种提供商类型: `openai`、`google`、`anthropic`、`ollama`。

### 4.5 文件系统服务安全约束

- 所有操作强制进行**工作区根路径作用域校验**（`FileSystemError` with code 403）。
- 黑名单目录自动跳过: `node_modules`、`dist`、`.git` 等。
- 危险操作 (`edit`、`write`、`delete`) 标记 `danger: true`，前端会额外确认。

### 4.6 项目类型 (ProjectType)

当前支持四种类型: `'custom' | 'openapi' | 'filesystem' | 'vision'`。
- `custom`: 手动添加的 REST API 接口
- `openapi`: 从 OpenAPI 规范导入
- `filesystem`: 提供文件系统原子能力
- `vision`: 提供多模态视觉 AI 能力

### 4.7 已知陷阱

- **ESM 路径**: 所有本地 `import` 必须包含 `.js` 扩展名（如 `'./services/store.js'`），TypeScript 编译时自动处理。
- **tsx 执行**: 开发模式使用 `tsx` 直接运行 TypeScript，不使用 `tsc` 编译。
- **Vite proxy**: 前端开发服务器 `:5173` 代理 `/internal` 和 `/api` 到 `:3000`。
- **Settings API 密钥**: 返回时自动掩码（显示前 8 位 + `****`），解密需调用 `getDecryptedApiKey()`。
- **双向绑定**: `boundModelId` 字段在节点层和服务层均需传递，内部路由和外部 API 路由需同步更新。

---

## 5. API / 接口参考

### 5.1 内部管理接口 (`/internal`)

| 方法 | 路径 | 描述 |
|---|---|---|
| GET | `/internal/health` | 健康检查 |
| GET | `/internal/projects` | 项目列表 |
| POST | `/internal/projects` | 创建项目 |
| GET | `/internal/projects/:id` | 获取项目详情 |
| PUT | `/internal/projects/:id` | 更新项目 |
| DELETE | `/internal/projects/:id` | 删除项目 |
| GET | `/internal/nodes?projectId=` | 节点列表（按项目过滤） |
| POST | `/internal/nodes` | 创建节点 |
| GET | `/internal/nodes/:id` | 获取节点详情 |
| PUT | `/internal/nodes/:id` | 更新节点 |
| DELETE | `/internal/nodes/:id` | 删除节点 |
| POST | `/internal/nodes/:id/archive` | 归档节点 |
| POST | `/internal/nodes/:id/unarchive` | 取消归档 |
| POST | `/internal/openapi/parse` | 解析 OpenAPI 文档 |
| POST | `/internal/openapi/sync` | 同步 OpenAPI 变更 |
| GET | `/internal/audit-logs` | 查询审计日志 |

### 5.2 外部服务接口 (`/api`)

| 方法 | 路径 | 描述 |
|---|---|---|
| POST | `/api/mcp` | MCP Streamable HTTP 端点 |
| POST | `/api/:slug/mcp` | 项目级 MCP 端点 |
| POST | `/api/sandbox/execute` | 沙箱执行 |
| POST | `/api/filesystem/:action` | 文件系统能力 (glob/ls/grep/read/edit/write/delete) |
| POST | `/api/vision/:tool` | 视觉分析 (ui_to_artifact/ocr/ui_diff_check/image_analysis/video_analysis) |
| GET | `/api/settings` | 获取全局设置 |
| PUT | `/api/settings` | 更新全局设置 |
| CRUD | `/api/projects/*` | 项目集接口（同 /internal 逻辑） |
| CRUD | `/api/nodes/*` | 节点接口（同 /internal 逻辑） |

### 5.3 统一响应格式

```typescript
interface ApiResponse<T = unknown> {
  code: number;    // 0 = 成功, 非 0 = 错误
  message: string; // 提示信息
  data: T;         // 响应数据
}
```

---

## 6. 编码规范

### 6.1 TypeScript 严格模式

- `strict: true`，禁止使用 `any`。优先 `interface` 定义对象形状，`type` 用于联合/别名。
- 使用 `const` 和 `let`，禁止 `var`。
- 文件职责单一，使用 Barrel Export (`index.ts`) 简化导入。

### 6.2 异步风格

```
// ✅ 正确：所有 I/O 使用 async/await
const data = await readFile(path, 'utf8');

// ✅ 正确：独立操作并行执行
const [projects, nodes] = await Promise.all([loadProjects(), loadNodes()]);

// ✅ 正确：Promise 必须有错误处理
try { await riskyOperation(); } catch (err) { ... }
```

### 6.3 文件命名

- 服务文件: `camelCase` (`projectService.ts`, `settingsStore.ts`)
- 路由文件: `camelCase` (`health.ts`, `projects.ts`)
- 组件文件: `PascalCase` (`DashboardPage.tsx`, `NodeForm.tsx`)
- 测试文件: `<name>.test.ts` 或 `<name>.test.tsx`，与源文件同级

### 6.4 前端样式约定

- 使用 CSS 变量（定义在 `styles.ts` 的 `CSS_VARS` 常量中）而非内联固定值。
- 组件样式通过 `layout` 对象（`styles.ts`）导出，使用 `React.CSSProperties`。
- 新增 UI 组件必须匹配现有暗黑科技感设计风格。

---

## 7. 测试规则

### 7.1 基本原则

- 所有新增功能必须配套单元测试，遵循 **AAA 模式** (Arrange, Act, Assert)。
- 每个测试用例只验证单一行为。

### 7.2 框架与配置

- 测试框架: **Vitest** (v3)，配置在 `vitest.config.ts`。
- 全局模式: `globals: true`（无需显式导入 describe/it/expect）。
- 环境: `node`（非 jsdom）。
- 文件匹配: `src/**/*.test.ts` 和 `src/**/*.test.tsx`。

### 7.3 覆盖率目标

- 核心业务逻辑（services/）: ≥ 80%
- 总体代码覆盖率: ≥ 70%
- 排除文件: `main.tsx`、`server/index.ts` 及所有 `*.test.*` 文件

### 7.4 禁止事项

- ❌ 禁止在单元测试中发起真实网络请求（优先 mock `fetch`/`http`）。
- ❌ 禁止依赖外部文件系统状态（测试数据通过 mock 提供）。
- ❌ 禁止测试与 MCP 协议的实际通信握手（mock `McpServer`/`Transport`）。

### 7.5 运行命令

```
npm test              # 单次运行
npm run test:watch    # 监听模式
npm run test:coverage # 覆盖率报告
```

---

## 8. ⚠️ 文档更新规则 (CRITICAL)

> AI 必须严格遵守以下规则，不可绕过。

### 8.1 核心文档防篡改

- 除非对话中明确收到**"允许/要求更新文档"**的指令，否则**绝对禁止**自动修改:
  - `README.md`
  - `ROADMAP.md`
  - `.github/copilot-instructions.md` （本文件）
  - `CHANGELOG.md`
- 即使收到修改请求，也**严格限制**只允许修改**明确指定**的文档，不得因内容相关性擅自修改其他文档。

### 8.2 Git 操作权限

- **禁止**: `git add`、`git commit`、`git push`、`git checkout` 等写操作。
- **允许**: `git status`、`git diff`、`git log` 等只读命令。

### 8.3 提交信息规范

所有 Git 提交信息必须使用 Emoji 前缀:

| Emoji | 类型 |
|-------|------|
| `✨` | 新功能 (feat) |
| `🐛` | 修复 (fix) |
| `🔧` | 工程配置/依赖 (chore) |
| `💎` | 样式/UI 优化 (style) |
| `♻️` | 重构 (refactor) |
| `🚨` | 测试 (test) |
| `📚` | 文档 (docs) |

格式: `✨ feat(routes): add /api/settings endpoint`（scope 小写括号，使用中文祈使句描述）。

---

## 9. 默认 AI 行为指南

### 9.1 常见任务处理模式

| 任务类型 | 推荐策略 |
|---|---|
| 新增路由 | 先在 `src/server/routes/` (或 `routes/api/`) 新建文件 → 在对应 `index.ts` 添加 barrel export → 在 `server/index.ts` 注册路由 |
| 新增服务 | 在 `src/server/services/` 新建文件 → 引用 `store.ts` 或 `persistence.ts` 数据层 → 导出纯函数式接口 |
| 新增前端页面 | 在 `src/web/pages/` 新建组件 → 在 `App.tsx` 添加 View 类型和导航项 |
| 新增共享类型 | 在 `src/shared/types.ts` 添加 `interface`/`type` → 两端分别 import |
| 修改数据模型 | 同步更新 `store.ts` 的 Map 操作 + `persistence.ts` 的 flush → 确保 `scheduleFlush()` 被调用 |

### 9.2 数据流检查清单

修改涉及数据持久化时，确认:
1. ✅ 写操作调用了 `scheduleFlush()`
2. ✅ 新字段在 `ApiResponse<T>` 信封中正确传递
3. ✅ 前端 `apiClient.ts` 有对应的请求函数
4. ✅ 共享类型在 `types.ts` 中定义
5. ✅ 内部路由 (`/internal`) 和外部路由 (`/api`) 都更新了

### 9.3 新增文件注意事项

- ESM 必须加 `.js` 扩展名（如 `import { ... } from './foo.js'`）
- 测试文件与源文件同目录，命名 `<name>.test.ts`
- 前端组件使用 `.tsx` 扩展名，服务层使用 `.ts`
- 新组件样式通过 `styles.ts` 的 `CSS_VARS` 或 `layout` 对象引用现有设计令牌
