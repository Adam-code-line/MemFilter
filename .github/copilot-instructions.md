<!-- .github/copilot-instructions.md
Guidance for AI coding agents to be productive in this repository.
Keep this file short (20–50 lines) and actionable. Reference key files and examples.
-->

# Copilot instructions (repo-specific)

MemFilter is a Nuxt 4 + `@nuxt/ui` workspace that blends a content-driven landing page with an authenticated “memory” dashboard. Use the points below to stay aligned.

- **Run & verify**
  - Install with `pnpm install` (runs `nuxt prepare` automatically). Use `pnpm dev` for local work, and `pnpm build` (via `scripts/build.mjs` to silence Node warnings) followed by `pnpm preview` for production smoke tests.

- **Runtime config**
  - `.env` must provide `MYSQL_*`, `AUTH_SESSION_*`, `TIAN_API_KEY`, and `AI_*` values (`nuxt.config.ts` maps them into `runtimeConfig`). Missing AI keys trigger a mock response in `server/api/chat/complete.post.ts`; keep it intact for offline demos.

- **Layouts & navigation**
  - Marketing pages default to `app/layouts/default.vue`; authenticated routes declare `definePageMeta({ layout: 'app' })`. `app/middleware/auth.global.ts` restores the session (via the `plugins/auth.ts` bootstrap) and reroutes guests to `/auth/login` unless a page sets `meta.auth.public`.
  - Route aliases for `/login` and `/signup` are handled by Nitro `routeRules`; don’t register duplicate routes.

- **Content-first landing**
  - Landing copy lives in YAML under `content/*.yml`. Every field is validated against `content.config.ts`; keep new enums in sync or the build fails. Pages fetch data with `queryCollection()` (see `app/pages/index.vue`) and pass it into floating hero/section components instead of hard-coding markup.

- **Auth & persistence**
  - `stores/auth.ts` drives auth state; API calls go through `app/composables/auth/useAuthApi.ts`, and server handlers use `useAuthService` + MySQL (`server/utils/db.ts`) to hash passwords (`usePasswordHash`) and mint cookies. Rely on `useAuthStore().initialize()` rather than duplicating session reads.

- **Notes domain**
  - The Pinia `notes` store (`stores/notes.ts`) owns note hydration, fading math, and AI-derived metadata. Use `useNotesApi` for CRUD so data flows through `server/api/notes/**` and `useNotesService`, which enforces ownership and serializes JSON columns.
  - UI surfaces (`app/components/Note/**`, `app/pages/note.vue`, `app/pages/memory/*.vue`) expect `NoteRecord` shapes with fields like `fadeLevel`, `forgettingProgress`, and `aiEvaluation`; use store helpers (`upsertNote`, `restoreNote`, etc.) to keep that logic consistent.

- **AI chat surface**
  - `app/pages/ai-chat.vue` combines `useAIChat` (streaming SSE client) with `useAIChatSessions` (localStorage persistence). Server streaming runs through `/api/chat/complete`, which proxies BigModel or emits mock chunks—maintain SSE formatting if you adjust either side.

- **Ingestion pipeline**
  - Memory sources and raw items live in MySQL via `useIngestionService`; TianAPI pulls require `TIAN_API_KEY`, otherwise fallback demo items fill the list. Promoting an item calls `useNotesService.create`, so ingestion must stay in sync with note schemas.

- **UI conventions**
  - Components follow `<script setup lang="ts">`, rely on auto-imported `U*` controls, and keep shared helpers in `app/composables/**`. Styling sticks to Tailwind utilities plus scoped CSS (global tweaks reside in `app/assets/css/main.css`). Floating glassmorphism blocks come from `app/components/Floating/**`—reuse them for new marketing sections.

Cross-check nearby files before deviating from these patterns, and surface any missing context so we can expand this guide.
