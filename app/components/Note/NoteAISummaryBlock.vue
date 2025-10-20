<template>
  <div class="space-y-4">
    <p
      v-if="hasSummary"
      class="rounded-lg bg-slate-100/70 p-3 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 whitespace-pre-line"
    >
      {{ summaryContent }}
    </p>

    <ul
      v-if="hasBullets"
      class="list-disc space-y-2 pl-4 text-sm text-slate-600 dark:text-slate-300"
    >
      <li v-for="point in bulletItems" :key="point">
        {{ point }}
      </li>
    </ul>

    <UAlert
      v-if="!hasSummary && !hasBullets"
      color="neutral"
      variant="subtle"
      icon="i-lucide-sparkles"
    >
      <template #description>
        {{ emptyMessage }}
      </template>
    </UAlert>

    <div
      v-if="metaEntries.length"
      class="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400"
    >
      <span v-for="entry in metaEntries" :key="entry.label">
        {{ entry.label }}：{{ entry.value }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NoteAIUsageSummary } from '~/composables/note/types'

const props = withDefaults(defineProps<{
  summary?: string | null
  bullets?: string[] | null
  tokensSaved?: number | null
  usage?: NoteAIUsageSummary | null
  emptyMessage?: string
}>(), {
  summary: '',
  bullets: null,
  tokensSaved: null,
  usage: null,
  emptyMessage: '暂无 AI 摘要，生成后会自动展示。'
})

const summaryContent = computed(() => (props.summary ?? '').trim())
const hasSummary = computed(() => summaryContent.value.length > 0)

const bulletItems = computed(() => {
  if (!Array.isArray(props.bullets)) {
    return [] as string[]
  }
  return props.bullets
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(item => item.length > 0)
})
const hasBullets = computed(() => bulletItems.value.length > 0)

const promptTokens = computed(() => props.usage?.promptTokens ?? null)
const completionTokens = computed(() => props.usage?.completionTokens ?? null)
const totalTokens = computed(() => props.usage?.totalTokens ?? null)

const metaEntries = computed(() => {
  const entries: Array<{ label: string; value: string | number }> = []

  if (typeof props.tokensSaved === 'number' && props.tokensSaved > 0) {
    entries.push({ label: '节省 Tokens', value: props.tokensSaved })
  }
  if (typeof promptTokens.value === 'number') {
    entries.push({ label: 'Prompt', value: promptTokens.value })
  }
  if (typeof completionTokens.value === 'number') {
    entries.push({ label: 'Completion', value: completionTokens.value })
  }
  if (typeof totalTokens.value === 'number') {
    entries.push({ label: '总计', value: totalTokens.value })
  }

  return entries
})
</script>
