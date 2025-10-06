<script setup lang="ts">
import { computed } from 'vue'

interface HistoryRecordCardProps {
  title: string
  snippet?: string
  icon?: string
  status?: 'recoverable' | 'archived' | 'purged'
  importanceLabel?: string
  importanceScore?: number
  forgettingProgress?: number
  daysUntilForgotten?: number
  lastAccessed?: string
  restorable?: boolean
}

const props = withDefaults(defineProps<HistoryRecordCardProps>(), {
  snippet: '',
  icon: '🗒️',
  status: 'recoverable',
  importanceLabel: '普通',
  importanceScore: 0,
  forgettingProgress: 0,
  daysUntilForgotten: 0,
  lastAccessed: '',
  restorable: true
})

const emit = defineEmits<{
  restore: []
  inspect: []
}>()

const statusBadgeProps: Record<string, { label: string; color: string }> = {
  recoverable: { label: '等待决策', color: 'warning' },
  archived: { label: '已折叠', color: 'neutral' },
  purged: { label: '已清理', color: 'error' }
}

const displaySnippet = computed(() => {
  if (!props.snippet) {
    return '内容已模糊，但仍可恢复查看。'
  }
  if (props.snippet.length <= 140) {
    return props.snippet
  }
  return `${props.snippet.slice(0, 140)}...`
})
</script>

<template>
  <UCard class="h-full border border-gray-200/70 dark:border-white/10">
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ icon }}</span>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
            <p v-if="lastAccessed" class="text-xs text-gray-400">最后访问 {{ lastAccessed }}</p>
          </div>
        </div>
        <UBadge
          :label="statusBadgeProps[status]?.label || '已淡化'"
          :color="statusBadgeProps[status]?.color || 'neutral'"
          variant="soft"
        />
      </div>
    </template>

    <div class="space-y-3">
      <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        {{ displaySnippet }}
      </p>

      <div class="grid gap-3 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-3">
        <div>重要度：<span class="font-medium text-gray-700 dark:text-gray-200">{{ importanceLabel }} · {{ importanceScore }}%</span></div>
        <div>淡化进度：<span class="font-medium text-amber-600 dark:text-amber-300">{{ forgettingProgress }}%</span></div>
        <div v-if="status === 'recoverable'">剩余窗口：<span class="font-medium text-rose-500 dark:text-rose-300">{{ daysUntilForgotten }} 天</span></div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-eye"
          @click="emit('inspect')"
        >
          查看详情
        </UButton>
        <UButton
          v-if="restorable"
          color="primary"
          variant="solid"
          size="sm"
          icon="i-lucide-rotate-ccw"
          @click="emit('restore')"
        >
          恢复记忆
        </UButton>
      </div>
    </template>
  </UCard>
</template>
