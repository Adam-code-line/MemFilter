# AI 指导文档：用 AI 辅助完成 **AI 遗忘引擎** 前端（Nuxt4）

> 目标：为**代码编辑器内置 AI 助手**编写指导文档。文档需要给出 **完整的项目规划 + 标准文件结构 + 每个文件的实现要点和提示模板**，让编辑器内的 AI 可以逐步生成符合 **Nuxt4 官方规范** 的前端代码，最终产出可运行的完整项目。

---

## 1. 项目概述
- 项目名称：**忆滤(AI遗忘引擎)**（基于 Nuxt4 的 Web 前端）
- 目标功能：
  - 输入笔记 → 调用 AI 进行“重要度”标注 → 随时间笔记逐渐淡出或折叠 → 提供“遗忘日志”用于恢复。
- 技术要求：严格遵循 **Nuxt4 官方目录结构与规范**。

---

## 2. Nuxt4 官方规范要求
1. **目录结构**：
   - `app/`：页面、布局、组件（推荐结构）
   - `server/`：API 路由与服务端逻辑
   - `composables/`：可复用逻辑（useXxx）
   - `types/`：TypeScript 类型声明
   - `public/`：静态资源
   - `tests/`：Vitest 测试

2. **代码风格**：
   - Vue 组件使用 `<script setup lang="ts">`
   - API 使用 Nuxt4 `defineEventHandler`
   - 状态管理推荐使用 **Pinia**（或 Nuxt 内置 useState）
   - 样式工具：**TailwindCSS**（通过 Nuxt 官方插件集成）

3. **最佳实践**：
   - 使用 composables 管理逻辑
   - 使用 runtimeConfig 管理 API 密钥等敏感信息
   - 使用 ESLint + Prettier 格式化
   - 使用 Vitest 编写单元测试

---

## 3. 项目结构
```
ai-forget-engine/
├─ app/
│  ├─ layouts/
│  │  └─ default.vue           # 全局布局（头部、导航）
│  ├─ pages/
│  │  ├─ index.vue             # 首页：笔记输入与展示
│  │  ├─ review.vue            # 笔记回顾（遗忘效果）
│  │  ├─ log.vue               # 遗忘日志页
│  │  └─ settings.vue          # 设置页
│  ├─ components/
│  │  ├─ NoteItem.vue          # 单条笔记组件
│  │  ├─ NoteEditor.vue        # 笔记输入组件
│  │  └─ Timeline.vue          # 遗忘日志时间轴
├─ composables/
│  ├─ useNotes.ts              # 笔记管理与遗忘逻辑
│  └─ useAI.ts                 # AI 标注封装
├─ server/
│  └─ api/
│     ├─ notes.ts              # 笔记 CRUD API
│     └─ ai-label.ts           # AI 标注 API（mock/代理）
├─ types/
│  └─ note.ts                  # 笔记类型定义
├─ tests/
│  └─ NoteItem.spec.ts         # 示例单元测试
├─ nuxt.config.ts               # Nuxt 配置
├─ tailwind.config.js           # Tailwind 配置
└─ package.json
```

---

## 4. 开发阶段计划
- **阶段 1：基础环境**
  - 初始化 Nuxt4 项目
  - 安装 TailwindCSS, Pinia
  - 设置 ESLint + Prettier
- **阶段 2：数据结构与 API mock**
  - 定义 `types/note.ts`
  - 实现 `server/api/notes.ts` 与 `server/api/ai-label.ts`（mock 版）
- **阶段 3：核心页面与组件**
  - `NoteEditor.vue`（输入）
  - `NoteItem.vue`（展示 + 状态样式）
  - `index.vue`（组合输入与列表）
- **阶段 4：遗忘逻辑与日志**
  - `useNotes.ts` 实现定时更新 status
  - `review.vue` 与 `log.vue`
- **阶段 5：增强功能**
  - `settings.vue`（遗忘周期设置）
  - LocalStorage / 后端持久化
- **阶段 6：测试与优化**
  - 单元测试（Vitest）
  - UI 优化与演示脚本

---

## 5. 文件生成任务（AI 提示模板）

> 以下模板直接提供给编辑器里的 AI，一次生成一个文件。

### 模板 A — 类型定义
```
任务：生成文件 types/note.ts，仅返回 TypeScript 代码。
要求：
- 定义 Note 接口，包含 id、text、importance、status、createdAt。
- importance: 'core' | 'secondary' | 'noise'
- status: 'active' | 'fading' | 'forgotten'
- 时间字段使用 ISO 字符串。
```

### 模板 B — 组件
```
任务：生成文件 app/components/NoteItem.vue。
要求：
- 使用 <script setup lang="ts">
- 接收 prop note: Note
- 根据 note.importance 与 note.status 应用不同 Tailwind 样式
- 提供恢复按钮 emit('recover', note.id)
- 使用 <Transition> 添加渐隐动画
```

### 模板 C — API 路由
```
任务：生成文件 server/api/notes.ts。
要求：
- 使用 defineEventHandler
- 支持 GET 返回 Note[]，POST 新建 Note，PATCH 更新，DELETE 软删除（修改 status 为 forgotten）
- 数据可先存储在内存数组中
```

### 模板 D — 测试
```
任务：生成文件 tests/NoteItem.spec.ts。
要求：
- 使用 Vitest + @vue/test-utils
- 挂载 NoteItem.vue
- 验证当 note.status='forgotten' 时，包含 line-through class
```

---

## 6. 验收标准
- `pnpm dev` 启动无错误
- 首页能新增笔记并显示不同 importance 样式
- 笔记随时间变为 fading/forgotten
- 遗忘日志可恢复笔记
- Vitest 测试全部通过

---

## 7. 提示编写规范
1. **一次一个文件**，不要混合多个任务。
2. **明确上下文**：在提示中附上已有的 types 或接口约束。
3. **设定验收条件**：告诉 AI 输出必须符合 Nuxt4 官方结构与语法。
4. **错误修复**：将报错日志反馈给 AI，让其基于上下文给出修正文件。

---

## 8. Demo 演示流程
1. 输入笔记并保存
2. 展示 AI 标注结果（mock）
3. 演示笔记淡出过程
4. 展示遗忘日志恢复功能
5. 总结亮点：AI 辅助、渐隐体验、可回溯日志

---

👉 本文档即为**代码编辑器 AI 的使用说明书**：你可以逐个复制模板给编辑器里的 AI，让它生成对应文件，最终拼接成一个完整的 Nuxt4 项目。

