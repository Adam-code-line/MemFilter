<template>
  <div class="space-y-4">
  <UCard class="border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-activity" class="text-primary" />
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">记忆指标</h3>
          </div>
          <UBadge v-if="status" :label="status.label" :color="status.color" variant="soft" />
        </div>
      </template>
      <div class="grid gap-4">
        <div class="insight-row">
          <span class="insight-label">重要度</span>
          <UBadge :label="importanceLabel" :color="importanceColor" variant="soft" />
        </div>
        <div class="insight-row">
          <span class="insight-label">淡化进度</span>
          <div class="flex items-center gap-2">
            <UProgress :value="Number(progressValue)" color="primary" class="w-28" />
            <span class="font-medium text-gray-900 dark:text-white min-w-[3rem] text-right">{{ progressValue }}%</span>
          </div>
        </div>
        <div class="insight-row">
          <span class="insight-label">最近访问</span>
          <span class="insight-value">{{ lastAccessedText }}</span>
        </div>
        <div class="insight-row">
          <span class="insight-label">预计完全遗忘</span>
          <span class="insight-value">{{ forgetEstimate }}</span>
        </div>
      </div>
    </UCard>

    <UCard v-if="note?.description" class="border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-slate-900/50">
      <template #header>
        <div class="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <UIcon name="i-lucide-align-left" class="text-primary" />
          <span>摘要备注</span>
        </div>
      </template>
      <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-line">
        {{ note?.description }}
      </p>
    </UCard>

    <slot name="extra" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DetailStatus } from '~/composables/memory/useMemoryDetailHelpers'
import type { NoteRecord } from '~/composables/note/types'
import { useMemoryMeta } from '~/composables/memory/useMemoryMeta'

const props = defineProps<{
  note: NoteRecord | null
  status: DetailStatus | null
}>()

const detail = computed(() => props.note ?? null)

const {
  importanceLabel,
  importanceColor,
  displayDate,
  forgettingStatus
} = useMemoryMeta(
  {
    title: computed(() => detail.value?.title ?? ''),
    snippet: computed(() => detail.value?.content ?? ''),
    date: computed(() => detail.value?.lastAccessed ?? detail.value?.date ?? ''),
    icon: computed(() => detail.value?.icon ?? '📝'),
    importance: computed(() => detail.value?.importance ?? 'medium'),
    fadeLevel: computed(() => detail.value?.fadeLevel ?? 0),
    forgettingProgress: computed(() => detail.value?.forgettingProgress ?? 0)
  },
  {
    snippetLimit: 120
  }
)

const progressValue = computed(() => Math.min(100, Math.max(0, detail.value?.forgettingProgress ?? 0)).toFixed(0))

const lastAccessedText = computed(() => displayDate.value || '暂无访问记录')

const forgetEstimate = computed(() => {
  const days = detail.value?.daysUntilForgotten
  if (days === undefined || days === null) {
    return forgettingStatus.value ? `状态：${forgettingStatus.value}` : '暂无预测'
  }
  if (days <= 0) {
    return '即将遗忘'
  }
  return `约 ${days} 天`
})

</script>

<style scoped>
.insight-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.insight-label {
  font-size: 0.875rem;
  color: rgb(100 116 139);
}

:global(.dark) .insight-label {
  color: rgb(148 163 184);
}

.insight-value {
  font-size: 0.875rem;
  color: rgb(71 85 105);
}

:global(.dark) .insight-value {
  color: rgb(203 213 225);
}
</style>
