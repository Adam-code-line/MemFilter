<template>
  <div class="space-y-5" v-if="hasNote">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div class="flex items-start gap-3">
        <div class="text-3xl leading-none">{{ displayIcon }}</div>
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
              {{ detail.title || '未命名记忆' }}
            </h2>
            <UBadge
              :label="importanceLabel"
              :color="importanceColor"
              variant="solid"
            />
            <UBadge
              v-if="statusLabel"
              :label="statusLabel"
              :color="statusColor ?? 'neutral'"
              variant="soft"
            />
          </div>
          <div class="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="detail.date" class="flex items-center gap-1">
              <UIcon name="i-lucide-calendar" />
              创建 {{ detail.date }}
            </span>
            <span v-if="detail.lastAccessed" class="flex items-center gap-1">
              <UIcon name="i-lucide-clock-8" />
              最后访问 {{ detail.lastAccessed }}
            </span>
            <span class="flex items-center gap-1">
              <UIcon :name="forgettingIcon" />
              {{ forgettingStatus || '清晰' }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2 items-end text-right min-w-[140px]">
        <div class="text-sm text-gray-500 dark:text-gray-300">淡化进度</div>
        <div class="flex items-center gap-2">
          <UProgress :value="progressValue" :max="100" size="xs" class="w-28" />
          <span class="text-sm font-medium text-amber-600 dark:text-amber-300">{{ progressLabel }}</span>
        </div>
        <span v-if="detail.daysUntilForgotten !== undefined" class="text-xs text-gray-500 dark:text-gray-400">
          预计 {{ detail.daysUntilForgotten }} 天后完全淡化
        </span>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <UCard class="border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/40">
        <template #header>
          <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <UIcon name="i-lucide-gauge" />
            重要度评分
          </div>
        </template>
        <div class="space-y-2">
          <div class="text-2xl font-semibold text-gray-900 dark:text-white">{{ (detail.importanceScore ?? 0).toFixed(0) }}%</div>
          <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            根据记忆内容密度、结构与访问频率给出的综合评分，便于快速判断是否值得恢复。
          </p>
        </div>
      </UCard>

      <UCard class="border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/40">
        <template #header>
          <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <UIcon name="i-lucide-info" />
            当前状态
          </div>
        </template>
        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-200">
          <p>{{ forgettingTooltip || '尚未进入淡化阶段。' }}</p>
          <p v-if="detail.daysUntilForgotten !== undefined" class="text-xs text-gray-500 dark:text-gray-400">
            若不做处理，该记忆将在 {{ detail.daysUntilForgotten }} 天后折叠归档。
          </p>
          <p v-if="detail.isCollapsed" class="text-xs text-amber-600 dark:text-amber-300">
            当前已折叠，仍可在归档区恢复。
          </p>
        </div>
      </UCard>
    </div>

    <UCard class="border border-gray-200/70 dark:border-white/10 bg-white/65 dark:bg-slate-900/40">
      <template #header>
        <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <UIcon name="i-lucide-quote" />
          个人描述
        </div>
      </template>
      <p
        v-if="hasDescription"
        class="text-sm leading-relaxed text-gray-700 dark:text-gray-100 whitespace-pre-line"
      >
        {{ detail.description }}
      </p>
      <p v-else class="text-sm text-gray-400 dark:text-gray-500">
        暂无描述，您可以在编辑笔记时补充一段备注。
      </p>
    </UCard>

    <UCard class="border border-gray-200/70 dark:border-white/10">
      <template #header>
        <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <UIcon name="i-lucide-align-left" />
          正文内容
        </div>
      </template>
      <ClientOnly>
        <div class="relative cherry-preview-shell">
          <div
            :id="previewContainerId"
            class="cherry-preview-container min-h-[20rem] md:min-h-[24rem] rounded-xl bg-white/75 px-4 py-3 text-sm leading-relaxed text-gray-700 dark:bg-slate-900/45 dark:text-gray-100"
          />
          <div
            v-if="!hasContent"
            class="absolute inset-0 flex items-center justify-center rounded-xl px-4 py-3 text-sm text-gray-400 dark:text-gray-500"
          >
            暂无正文内容。
          </div>
        </div>
        <template #fallback>
          <div class="text-sm text-gray-400">内容加载中...</div>
        </template>
      </ClientOnly>
    </UCard>

    <div v-if="actions.length" class="pt-4 border-t border-gray-200/60 dark:border-white/10 flex flex-wrap gap-2">
      <template v-for="action in actions" :key="action.key">
        <UTooltip v-if="action.tooltip" :text="action.tooltip">
          <UButton
            v-bind="resolveActionProps(action)"
            @click="emit('action', action.key)"
          >
            {{ action.label }}
          </UButton>
        </UTooltip>
        <UButton
          v-else
          v-bind="resolveActionProps(action)"
          @click="emit('action', action.key)"
        >
          {{ action.label }}
        </UButton>
      </template>
    </div>
  </div>
  <div v-else class="py-10 flex flex-col items-center gap-3 text-gray-400">
    <UIcon name="i-lucide-notebook" class="text-3xl" />
    <p class="text-sm">请选择一条记忆查看详情</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'

interface MemoryDetailRecord {
  id?: number | string
  title?: string
  content?: string
  description?: string
  date?: string
  lastAccessed?: string
  icon?: string
  importance?: MemoryImportance
  fadeLevel?: MemoryFadeLevel
  importanceScore?: number
  forgettingProgress?: number
  daysUntilForgotten?: number
  isCollapsed?: boolean
}

interface MemoryDetailAction {
  key: string
  label: string
  icon?: string
  color?: string
  variant?: 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'
  disabled?: boolean
  tooltip?: string
}

const props = withDefaults(defineProps<{
  note: MemoryDetailRecord | null
  actions?: MemoryDetailAction[]
  statusLabel?: string
  statusColor?: string
}>(), {
  note: null,
  actions: () => []
})

const emit = defineEmits<{ action: [string] }>()

const detail = computed(() => props.note ?? {})
const hasNote = computed(() => !!props.note)
const derivedImportance = computed<MemoryImportance>(() => detail.value.importance ?? 'medium')
const derivedFadeLevel = computed<MemoryFadeLevel>(() => detail.value.fadeLevel ?? 0)
const derivedProgress = computed<number>(() => detail.value.forgettingProgress ?? 0)

const previewContainerId = 'memory-detail-preview'
const hasContent = computed(() => {
  const value = detail.value.content ?? ''
  return typeof value === 'string' && value.trim().length > 0
})
const hasDescription = computed(() => {
  const value = detail.value.description ?? ''
  return typeof value === 'string' && value.trim().length > 0
})

// Cherry Markdown preview mirrors the editor styling but stays read-only here.
const { initialize: initializePreview, destroy: destroyPreview, updateContent: updatePreviewContent } = useCherryPreview({
  containerId: previewContainerId,
  getValue: () => detail.value.content ?? '',
  getThemeConfig: () => ({
    themeList: [
      { className: 'light', label: '亮' },
      { className: 'dark', label: '暗' },
      { className: 'violet', label: '淡雅' },
      { className: 'blue', label: '清幽' },
      { className: 'red', label: '粉' }
    ],
    codeBlockTheme: 'default'
  })
})

onMounted(async () => {
  if (import.meta.client) {
    await initializePreview()
  }
})

watch(
  () => detail.value.content ?? '',
  (value) => {
    updatePreviewContent(value)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  destroyPreview()
})

const {
  importanceLabel,
  importanceColor,
  forgettingTooltip,
  forgettingIcon,
  forgettingStatus,
  displayIcon
} = useMemoryMeta({
  title: computed(() => detail.value.title ?? ''),
  snippet: computed(() => detail.value.content ?? ''),
  date: computed(() => detail.value.date ?? ''),
  icon: computed(() => detail.value.icon ?? '📝'),
  importance: derivedImportance,
  fadeLevel: derivedFadeLevel,
  forgettingProgress: derivedProgress
}, {
  snippetLimit: 0,
  blurredSnippetMessage: '内容暂不可见'
})

const progressValue = computed(() => Math.min(100, Math.max(0, derivedProgress.value)))
const progressLabel = computed(() => `${progressValue.value.toFixed(0)}%`)

const actions = computed(() => props.actions ?? [])

const resolveActionProps = (action: MemoryDetailAction) => ({
  color: action.color ?? 'neutral',
  variant: action.variant ?? 'ghost',
  size: 'sm',
  icon: action.icon,
  disabled: action.disabled
})
</script>

<style scoped>
.cherry-preview-shell {
  min-height: 20rem;
  border-radius: 0.75rem;
  overflow: hidden;
}

.cherry-preview-container {
  width: 100%;
  height: 100%;
}

@media (min-width: 768px) {
  .cherry-preview-shell {
    min-height: 24rem;
  }
}

:deep(#memory-detail-preview .cherry) {
  background-color: transparent !important;
  border-radius: 0.75rem !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(#memory-detail-preview .cherry-previewer) {
  background-color: transparent !important;
  color: inherit !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  border-left: none !important;
  background-clip: padding-box !important;
}

:deep(#memory-detail-preview .cherry-theme-light .cherry-previewer),
:deep(#memory-detail-preview .cherry-theme-violet .cherry-previewer),
:deep(#memory-detail-preview .cherry-theme-blue .cherry-previewer),
:deep(#memory-detail-preview .cherry-theme-red .cherry-previewer) {
  background-color: rgba(255, 255, 255, 0.9) !important;
  color: rgb(30 41 59) !important;
}

:deep(#memory-detail-preview .cherry-theme-light .cherry-previewer .cherry-markdown),
:deep(#memory-detail-preview .cherry-theme-violet .cherry-previewer .cherry-markdown),
:deep(#memory-detail-preview .cherry-theme-blue .cherry-previewer .cherry-markdown),
:deep(#memory-detail-preview .cherry-theme-red .cherry-previewer .cherry-markdown) {
  color: inherit !important;
}

:deep(#memory-detail-preview .cherry-theme-dark .cherry-previewer) {
  background-color: rgba(15, 23, 42, 0.75) !important;
  color: rgb(226 232 240) !important;
}

:deep(#memory-detail-preview .cherry-theme-dark .cherry-previewer .cherry-markdown) {
  color: inherit !important;
}

:deep(#memory-detail-preview .cherry-previewer pre),
:deep(#memory-detail-preview .cherry-previewer code) {
  background-color: rgba(15, 23, 42, 0.08) !important;
  border-radius: 0.5rem !important;
  color: inherit !important;
}

:deep(.dark #memory-detail-preview .cherry-previewer pre),
:deep(.dark #memory-detail-preview .cherry-previewer code) {
  background-color: rgba(148, 163, 184, 0.08) !important;
}

:deep(#memory-detail-preview .cherry-previewer blockquote) {
  background-color: rgba(96, 165, 250, 0.08) !important;
  border-left: 3px solid rgba(59, 130, 246, 0.45) !important;
  border-radius: 0.75rem !important;
  padding: 0.75rem 1rem !important;
}

:deep(.dark #memory-detail-preview .cherry-previewer blockquote) {
  background-color: rgba(56, 189, 248, 0.08) !important;
  border-left-color: rgba(125, 211, 252, 0.55) !important;
}
</style>