# MemFilter — AI Assisted Forgetting Platform

MemFilter 是一款基于 Nuxt 4 + @nuxt/ui 的全栈应用，通过 AI 帮助用户管理“主动遗忘”，聚焦真正重要的信息。系统支持内容价值评估、遗忘曲线可视化，以及带有流式渲染和 Markdown 支持的 AI 对话体验。

## 功能亮点

- **主动遗忘引擎**：按照艾宾浩斯遗忘曲线逐步模糊、折叠或归档低价值内容。
- **AI 会话中心**：SSE 流式输出 + Markdown 渲染，提供接近 ChatGPT 的实时交互体验。
- **会话管理**：多会话持久化、重命名、删除，全部通过 Pinia + localStorage 自动同步。
- **遗忘日志**：记录所有淡化 / 删除动作，允许随时回溯或恢复。
- **AI 助手深度整合**：支持记忆保存、重要度评估与信息压缩，帮助用户构建高价值知识库。

## 技术栈

- **前端框架**：Nuxt 4 (Vue 3, Vite)
- **UI 组件**：@nuxt/ui, Tailwind CSS
- **状态管理**：Pinia
- **Markdown 渲染**：自研 `useMarkdownRenderer` 钩子
- **后端 & API**：Nuxt Nitro，SSE 代理第三方模型
- **数据库**：MySQL（通过 `mysql2/promise` 连接）

## 先决条件

- Node.js 18+
- pnpm 8+
- MySQL 8.0（或兼容版本）
- 配置 `.env` 文件，包含以下变量：
  - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
  - `AUTH_SESSION_COOKIE`, `AUTH_SESSION_TTL`
  - `TIAN_API_KEY`
  - `AI_API_BASE_URL`, `AI_API_KEY`, `AI_DEFAULT_MODEL`, `AI_TEMPERATURE`, `AI_AVAILABLE_MODELS`

> 提示：`pnpm install` 会自动执行 `nuxt prepare`，确保模块与类型声明保持最新。

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发环境（http://localhost:3000）
pnpm dev

# 构建生产包
pnpm build

# 生产资源预览
pnpm preview
```

### 常用脚本

- `pnpm generate`：预渲染静态页面（如需 SSG）。
- `pnpm postinstall`：安装阶段自动执行 `nuxt prepare`。

## 目录结构速览

```
app/            # Vue 组件、页面、布局及样式
	components/   # 复用组件（含 AI Chat 相关）
	composables/  # 自定义 hooks（useAIChat、useMarkdownRenderer 等）
	pages/        # Nuxt 页面路由
server/         # Nitro API、服务端逻辑、数据库工具
stores/         # Pinia store（auth、notes、chat sessions）
content/        # 营销站点/文档内容（Nuxt Content）
scripts/        # 构建与运维脚本
```

## 开发提示

- **AI 会话开发**：`app/composables/chat/useAIChat.ts` 是流式核心，`ChatMessage.vue` 负责渲染逻辑。
- **Markdown 扩展**：如需新增语法，可在 `useMarkdownRenderer.ts` 中添加解析规则。
- **会话菜单**：`useChatSessionMenu.ts` 集中处理重命名 / 删除逻辑，方便复用。
- **数据库 Schema**：`server/utils/db.ts` 提供 schema 初始化工具，首次运行前确保执行。

## 部署建议

- 使用 `pnpm build` 生成 Nitro 输出，配合 Node 运行或部署到支持 Nitro 的平台（如 Vercel、Netlify、Cloudflare）。
- 生产环境需要配置持久化 MySQL 及安全的环境变量注入方式。

## 许可证

暂无声明，敬请期待。
