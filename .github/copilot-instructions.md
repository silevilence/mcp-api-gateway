
# mcp-api-gateway 项目规范与开发指南

## 1. 项目背景与目标
- **项目名称**: mcp-api-gateway
- **项目描述**: 集中管理个人 API 接口，并将其封装转化为 MCP (Model Context Protocol) 服务的全栈网关应用。

---

## 2. 技术栈与核心依赖
- **运行环境**: Node.js (>= 18) / Web 浏览器
- **开发语言**: TypeScript (严格模式)
- **前端框架**: React (SPA)
- **后端框架**: Express
- **模块规范**: ES Modules (ESM)

---

## 3. 目录结构规范
项目采用清晰的模块化架构，严格落实前后端物理隔离与解耦：

```text
├── src/
│   ├── server/              # 后端服务层 (Express API & MCP 逻辑)
│   │   ├── index.ts         # 服务入口
│   │   ├── routes/          # API 路由定义
│   │   ├── middleware/      # 自定义中间件
│   │   └── services/        # 核心业务逻辑服务
│   ├── web/                 # 前端视图层 (React SPA)
│   │   ├── index.html       # 入口 HTML
│   │   ├── main.tsx         # 前端入口
│   │   ├── components/      # 可复用 UI 组件
│   │   ├── pages/           # 页面级组件
│   │   └── assets/          # 静态资源
│   └── shared/              # 前后端共享层
│       └── types.ts         # 共享接口契约与类型定义
├── public/                  # 前端构建产物输出目录
├── package.json
└── tsconfig.json
```

---

## 4. 架构与编码规范

### 4.1 全栈架构规范
- **前后端解耦**: 后端逻辑限制在 `src/server`，前端资产限制在 `src/web`。
- **通信机制**: 前端与后端通过 REST API 或 WebSocket 通信，接口契约（Interface/Type）必须在 `src/shared` 中明确定义。
- **独立运行**: 前端具备独立的构建机制与开发服务器，后端独立提供 API 服务。

### 4.2 TypeScript 编码风格
- **类型安全**: 启用 `strict: true`，绝不滥用 `any`。优先使用 `interface` 定义对象形状，`type` 用于联合类型或别名。充分利用泛型提升代码复用性。
- **变量声明**: 强制使用 `const` 和 `let`，绝对禁止使用 `var`。
- **模块化**: 文件职责单一；推荐使用 Barrel Exports (`index.ts`) 简化多模块导入路径。

### 4.3 异步与 I/O 处理
- **异步优先**: 所有 I/O 操作强制使用 `async/await`。
- **并发优化**: 独立的异步操作应使用 `Promise.all` 进行并行处理。
- **异常捕获**: 必须对 Promise 进行正确的错误处理（try/catch）。

---

## 5. 测试要求 (Test Coverage)

- **基本原则**: 所有新增功能必须配套相应的单元测试。遵循 AAA 模式（Arrange, Act, Assert），且每个测试用例只验证单一行为。
- **框架选择**: 采用与项目技术栈匹配的主流测试框架（如 Vitest / Jest）。
- **覆盖率指标**: 
  - 核心业务逻辑覆盖率 ≥ 80%
  - 总体代码覆盖率 ≥ 70%
- **测试数据**: 使用具有实际意义的 Mock 数据，优先覆盖核心业务链路与边界异常情况。

---

## 6. ⚠️ 文档与 Git 规范 (CRITICAL AI INSTRUCTIONS)

> **[注意]** 以下是协助开发本工具时的**红线原则**，所有 AI 助手及自动化脚本必须严格遵守：

### 6.1 核心文档防篡改
- 除非对话中明确收到**“允许/要求更新文档”**的指令，否则**绝对禁止**自动修改项目的核心文档（包括但不限于 `README.md`、`ROADMAP.md` 及 `.github/copilot-instructions.md` 等）。
- 即使收到修改请求，也**严格限制**只允许修改指令中**明确指定的文档**。绝不允许因内容相关性而擅自修改其他未被提及的文档。

### 6.2 Git 操作权限隔离
- **禁止写入（Write）**：绝对禁止自动执行任何改变 Git 状态的操作（严禁调用 `git add`、`git commit`、`git push`、`git checkout` 等命令）。所有代码库的变更同步操作完全由用户手动完成。
- **允许读取（Read）**：允许且仅允许使用安全的只读命令（如 `git status`、`git diff`、`git log`）来获取代码变更上下文。
