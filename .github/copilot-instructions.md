<!-- .github/copilot-instructions.md
Guidance for AI coding agents to be productive in this repository.
Keep this file short (20–50 lines) and actionable. Reference key files and examples.
-->

# Copilot instructions (repo-specific)

This repository is a Nuxt 4 application (see `nuxt.config.ts`) that uses `@nuxt/content` for content-driven pages and follows a component/composable-first design. Use the notes below to make targeted, small changes that match the project's conventions.

- Project entry points & scripts
  - Root: `package.json` scripts: `dev` (nuxt dev), `build` (nuxt build), `preview` (nuxt preview). Use pnpm/npm/yarn consistently with repo tooling.

- Architecture & important dirs
  - `app/` — layouts, pages and components; `app.vue` wraps `NuxtLayout`/`NuxtPage`.
  - `content/` + `content.config.ts` — content collections (Zod schemas defined in `content.config.ts`). Follow existing collection schemas when adding frontmatter.
  - `composables/` — reusable logic (auto-imported). Prefer adding `useXxx` composables for shared behavior.
  - `server/` — server API endpoints (Nuxt server routes) and mocks. Use `defineEventHandler` for endpoints.
  - `types/` — TypeScript types used across the app.

- Conventions & patterns (use these exactly)
  - Vue components use `<script setup lang="ts">` and leverage auto-imports. Keep props/types precise and export minimal public API (emits/events).
  - State: prefer Pinia or Nuxt `useState` (file examples in other projects under workspace). Keep stores small and composable.
  - Content: add content files under `content/` following the collection `source` names (e.g., `index.yml`, `home.yml`); content is validated by Zod schemas in `content.config.ts`.
  - Styling: Tailwind is used (see Tailwind config). Use utility classes, avoid global CSS changes unless necessary.

- Integration & external dependencies
  - `@nuxt/content` powers content queries; prefer composables that wrap content queries (avoid ad-hoc content logic in pages).
  - Runtime configuration / secrets should use Nuxt `runtimeConfig` (no hardcoded keys in code).

- Developer workflows (how to run and validate changes)
  - Install: `pnpm install` (or `npm install`).
  - Dev server: `pnpm dev` (runs `nuxt dev`).
  - Build & preview: `pnpm build` then `pnpm preview`.
  - Postinstall: repo runs `nuxt prepare` on postinstall — keep in mind when adding tooling that requires prepare steps.

- Examples & reference files
  - `nuxt.config.ts` — top-level configuration and modules.
  - `content.config.ts` — canonical example of collection schemas (Zod). Mirror schema shapes when creating new content collections.
  - `app/app.vue` — basic layout wrapper.

- Small guidance for PRs from AI
  - Make a single, small change per PR (one file or a tight set of related files).
  - Include tests or a local smoke-check where feasible (Vitest recommended if adding logic).
  - When adding content, ensure frontmatter validates against `content.config.ts` Zod schemas.

If any instruction is unclear or you need a pattern example (component, composable, or server route), ask for which file to generate and provide a minimal acceptance test or usage example.
