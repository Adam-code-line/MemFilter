<!-- .github/copilot-instructions.md
Guidance for AI coding agents to be productive in this repository.
Keep this file short (20–50 lines) and actionable. Reference key files and examples.
-->

# Copilot instructions (repo-specific)

MemFilter is a Nuxt 4 + `@nuxt/ui` app that pairs a content-driven landing page with an authenticated workspace. Use the notes below to stay aligned with existing patterns.

- **Run & verify**
  - Install with `pnpm install`; `postinstall` already runs `nuxt prepare`.
  - `pnpm dev` serves the app with Nuxt DevTools; `pnpm build` → `pnpm preview` for production smoke checks.

- **Architecture**
  - `app/layouts/default.vue` handles the marketing shell, while `app/layouts/app.vue` wires the dashboard header/sidebar; pick the right layout via `definePageMeta`.
  - Page copy comes from `@nuxt/content` (`queryCollection('index'|'home'|'login')`); schemas live in `content.config.ts`, so keep YAML in `content/*.yml` within those constraints.
  - `/login` and `/signup` redirect to `/auth/[mode]` through `nitro.routeRules` in `nuxt.config.ts`.

- **UI primitives**
  - `@nuxt/ui` auto-imports all `U*` components; theme colors are configured in `app/app.config.ts`.
  - Landing visuals rely on `app/components/Floating/**` and `CommonFloatingCard` for glassmorphism effects—reuse these wrappers instead of bespoke sections.
  - Auth/dashboard screens pair `UCard`, `UModal`, `UForm`, and `UBadge`; see `app/pages/note.vue` and `NoteEditor.vue` for standard button groups and badge usage.

- **Auth flow**
  - `app/pages/auth/[mode].vue` delegates to composables in `app/composables/auth/*` (`useAuthRoute`, `useAuthConfig`, `useAuthForm`, `useAuthValidation`); extend auth logic inside these composables, not inside the page.
  - `useAuth` currently mocks network calls—swap in your API fetch here and keep router navigation within the composable.

- **Content rendering**
  - Hero sections render markdown via `<MDC>` inside `FloatingHeroSection.vue`; use the same approach for new content-driven blocks.
  - Button/link metadata from content must respect the Zod enums (`variant`, `color`, `size`, etc.) in `content.config.ts` to avoid validation failures.

- **Notes & memory domain**
  - `app/pages/note.vue` expects note objects with `importance`, `fadeLevel` (0–4), and `forgettingProgress`; normalize API payloads to that shape before rendering.
  - Note surfaces reuse `MemoryCard.vue`, `MemoryItem.vue`, and `NoteEditor.vue`, which emit events such as `@restore`, `@accelerate-forgetting`, and `@save`—wire new features through those events.

- **Conventions**
  - Components follow `<script setup lang="ts">`, `withDefaults(defineProps())`, and explicit `defineEmits`; match that structure when adding UI.
  - Styling lives in scoped blocks or Tailwind utilities (`app/assets/css/main.css` contains any globals).
  - Add shared logic inside `app/composables/**` so Nuxt auto-imports it across pages.

If you hit an unfamiliar pattern, inspect the nearest existing component/composable and mirror its structure before extending it—ping maintainers when something stays unclear.
