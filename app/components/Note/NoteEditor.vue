<template>
  <UCard class="w-full bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl">
    <template #header>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <UInput
          v-model="noteTitle"
          :placeholder="config.titlePlaceholder"
          variant="none"
          class="text-lg font-semibold h-12 px-0 lg:flex-1"
          :class="{ 'opacity-80 blur-[0.5px]': fadeLevel > 0 }"
        />

        <div class="flex items-center gap-2">
          <UBadge
            :label="`${aiBadgePrefix}: ${aiScore}%`"
            :color="scoreColor"
            variant="soft"
          />
          <UBadge
            :label="saveStatus"
            :color="statusColor"
            variant="outline"
          />
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-3">
        <div class="flex flex-wrap items-center gap-2">
          <UFieldGroup size="sm" variant="ghost">
            <UButton
              v-for="tool in formattingTools"
              :key="tool.icon"
              :icon="tool.icon"
            />
          </UFieldGroup>

          <UFieldGroup size="sm" variant="ghost">
            <UButton
              v-for="tool in structureTools"
              :key="tool.icon"
              :icon="tool.icon"
            />
          </UFieldGroup>

          <UFieldGroup size="sm" variant="ghost">
            <UButton
              v-for="tool in inlineTools"
              :key="tool.icon"
              :icon="tool.icon"
            />
          </UFieldGroup>
        </div>

        <div class="flex items-center gap-2">
          <USelectMenu
            v-model="forgettingMode"
            :options="forgettingOptions"
            option-attribute="label"
            value-attribute="value"
            size="sm"
            placeholder="遗忘模式"
            :command="false"
            :ui="{ menu: 'min-w-[180px]' }"
          />
          <UButton
            icon="i-lucide-brain"
            variant="ghost"
            size="sm"
            @click="analyzeImportance"
          >
            AI 分析
          </UButton>
        </div>
      </div>

      <UTextarea
        v-model="noteContent"
        :placeholder="contentPlaceholder"
        :rows="12"
        class="min-h-[18rem]"
        :class="{ 'opacity-80 blur-[0.4px] text-gray-600 dark:text-gray-300': fadeLevel > 0 }"
      />
    </div>

    <template #footer>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between text-sm text-gray-500 dark:text-gray-400">
        <div class="flex flex-wrap items-center gap-4">
          <span>{{ metaLabels.wordCount }}：{{ contentLength }}</span>
          <span>{{ metaLabels.readTime }}：{{ estimatedReadTime }} 分钟</span>
          <span v-if="lastModified">{{ metaLabels.lastEdited }}：{{ lastModified }}</span>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            size="sm"
            @click="emit('cancel')"
          >
            {{ config.actions?.cancel ?? '取消' }}
          </UButton>
          <UButton
            color="primary"
            size="sm"
            :loading="isSaving"
            @click="handleSave"
          >
            {{ config.actions?.save ?? '保存笔记' }}
          </UButton>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNoteEditor } from '~/composables/note'
import type { NoteSavePayload } from '~/composables/note'

interface EditorConfig {
  titlePlaceholder?: string
  contentPlaceholders?: {
    default: string
    fading?: string
    strongFading?: string
  }
  actions?: {
    save?: string
    cancel?: string
  }
  status?: {
    saved?: string
    unsaved?: string
  }
  metaLabels?: {
    wordCount?: string
    readTime?: string
    lastEdited?: string
  }
  aiBadgePrefix?: string
}

const props = withDefaults(defineProps<{
  initialTitle?: string
  initialContent?: string
  fadeLevel?: number
  mode?: 'create' | 'edit'
  config?: EditorConfig
}>(), {
  initialTitle: '',
  initialContent: '',
  fadeLevel: 0,
  mode: 'create',
  config: () => ({})
})

const emit = defineEmits<{
  (e: 'save', payload: NoteSavePayload): void
  (e: 'cancel'): void
  (e: 'content-change', value: string): void
}>()

const config = computed(() => props.config ?? {})
const metaLabels = computed(() => ({
  wordCount: config.value.metaLabels?.wordCount ?? '字数',
  readTime: config.value.metaLabels?.readTime ?? '预计阅读',
  lastEdited: config.value.metaLabels?.lastEdited ?? '修改'
}))

const {
  noteTitle,
  noteContent,
  fadeLevel,
  aiScore,
  isSaving,
  saveStatus,
  lastModified,
  contentLength,
  estimatedReadTime,
  contentPlaceholder,
  scoreColor,
  touchContent,
  analyzeImportance,
  beginSaving,
  finishSaving,
  setUnsaved,
  setFadeLevel,
  resetContent,
  buildSavePayload,
  statusLabels
} = useNoteEditor({
  initialTitle: props.initialTitle,
  initialContent: props.initialContent,
  fadeLevel: props.fadeLevel,
  placeholders: config.value.contentPlaceholders,
  statusLabels: config.value.status,
  aiBadgePrefix: config.value.aiBadgePrefix
})

const aiBadgePrefix = computed(() => config.value.aiBadgePrefix ?? 'AI 评分')

const forgettingMode = ref('normal')
const forgettingOptions = [
  { label: '正常遗忘', value: 'normal' },
  { label: '慢速遗忘', value: 'slow' },
  { label: '加速遗忘', value: 'fast' },
  { label: '永不遗忘', value: 'never' }
]

const formattingTools = [
  { icon: 'i-lucide-bold' },
  { icon: 'i-lucide-italic' },
  { icon: 'i-lucide-underline' },
  { icon: 'i-lucide-strikethrough' }
]

const structureTools = [
  { icon: 'i-lucide-list' },
  { icon: 'i-lucide-list-ordered' },
  { icon: 'i-lucide-quote' }
]

const inlineTools = [
  { icon: 'i-lucide-image' },
  { icon: 'i-lucide-link' }
]

const statusColor = computed(() =>
  saveStatus === statusLabels.saved ? 'success' : 'warning'
)

const handleSave = async () => {
  const payload = buildSavePayload()
  if (!payload.title || !payload.content) {
    return
  }

  beginSaving()

  try {
    await new Promise(resolve => setTimeout(resolve, 600))
    emit('save', payload)
    finishSaving()
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    isSaving.value = false
  }
}

const normalizeFadeLevel = (value?: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return 0
}

watch(
  () => [props.mode, props.initialTitle, props.initialContent, props.fadeLevel] as const,
  ([mode, title, content, fade]) => {
    const hasEditPayload = title !== undefined || content !== undefined
    const normalizedFade = normalizeFadeLevel(fade)

    if (mode === 'edit' && hasEditPayload) {
      noteTitle.value = title ?? ''
      noteContent.value = content ?? ''
      setFadeLevel(normalizedFade)

      if (noteContent.value) {
        analyzeImportance()
        saveStatus.value = statusLabels.saved
      } else {
        setUnsaved()
      }

      lastModified.value = ''
      return
    }

    resetContent()
    setFadeLevel(normalizedFade)
  },
  { immediate: true }
)

watch(noteContent, (value, oldValue) => {
  if (value === oldValue) return
  touchContent()
  emit('content-change', value)
})

watch(noteTitle, (value, oldValue) => {
  if (value === oldValue) return
  setUnsaved()
})
</script>
