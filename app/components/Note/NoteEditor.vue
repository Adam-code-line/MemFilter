<template>
  <UCard class="w-full bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl">
    <template #header>
      <div class="flex flex-col gap-3">
        <UInput
          v-model="noteTitle"
          :placeholder="config.titlePlaceholder"
          variant="none"
          class="text-lg font-semibold h-12 px-0"
          :class="{ 'opacity-80 blur-[0.5px]': fadeLevel > 0 }"
        />

        <div class="flex flex-wrap items-center gap-2 text-sm">
          <USelectMenu
            v-model="importanceLevel"
            :items="importanceOptions"
            label-key="label"
            value-key="value"
            size="sm"
            class="min-w-[160px]"
            :ui="{ menu: 'min-w-[160px]' }"
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
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">记忆描述</label>
        </div>
        <UTextarea
          v-model="noteDescription"
          :placeholder="descriptionPlaceholder"
          :rows="3"
          class="min-h-[6rem]"
        />
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

interface EditorConfig {
  titlePlaceholder?: string
  contentPlaceholders?: {
    default: string
    fading?: string
    strongFading?: string
  }
  descriptionPlaceholder?: string
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
  initialDescription?: string
  fadeLevel?: number
  mode?: 'create' | 'edit'
  initialImportance?: ImportanceLevel
  config?: EditorConfig
}>(), {
  initialTitle: '',
  initialContent: '',
  initialDescription: '',
  fadeLevel: 0,
  mode: 'create',
  initialImportance: 'medium',
  config: () => ({})
})

const emit = defineEmits<{
  (e: 'save', payload: NoteSavePayload): void
  (e: 'cancel'): void
  (e: 'content-change', value: string): void
}>()

const config = computed(() => props.config ?? {})
const placeholderConfig = computed(() => {
  const contentPlaceholders = config.value.contentPlaceholders ?? {}
  const description = config.value.descriptionPlaceholder ?? contentPlaceholders.description
  return {
    ...contentPlaceholders,
    ...(description ? { description } : {})
  }
})
const metaLabels = computed(() => ({
  wordCount: config.value.metaLabels?.wordCount ?? '字数',
  readTime: config.value.metaLabels?.readTime ?? '预计阅读',
  lastEdited: config.value.metaLabels?.lastEdited ?? '修改'
}))

const {
  noteTitle,
  noteContent,
  noteDescription,
  importanceLevel,
  fadeLevel,
  isSaving,
  saveStatus,
  lastModified,
  contentLength,
  estimatedReadTime,
  contentPlaceholder,
  descriptionPlaceholder,
  touchContent,
  beginSaving,
  finishSaving,
  setUnsaved,
  setFadeLevel,
  resetContent,
  buildSavePayload,
  setImportanceLevel,
  statusLabels
} = useNoteEditor({
  initialTitle: props.initialTitle,
  initialContent: props.initialContent,
  initialDescription: props.initialDescription,
  initialImportance: props.initialImportance,
  fadeLevel: props.fadeLevel,
  placeholders: placeholderConfig.value,
  statusLabels: config.value.status
})

const importanceOptions: Array<{ label: string; value: ImportanceLevel }> = [
  { label: '核心笔记', value: 'high' },
  { label: '重要笔记', value: 'medium' },
  { label: '次要笔记', value: 'low' },
  { label: '噪声信息', value: 'noise' }
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
  () => [props.mode, props.initialTitle, props.initialContent, props.fadeLevel, props.initialImportance, props.initialDescription] as const,
  ([mode, title, content, fade, importance, description]) => {
    const hasEditPayload = title !== undefined || content !== undefined || description !== undefined
    const normalizedFade = normalizeFadeLevel(fade)

    if (mode === 'edit' && hasEditPayload) {
      noteTitle.value = title ?? ''
      noteContent.value = content ?? ''
      noteDescription.value = description ?? ''
      setFadeLevel(normalizedFade)
      setImportanceLevel(importance ?? 'medium')

      saveStatus.value = (noteContent.value || noteDescription.value) ? statusLabels.saved : statusLabels.unsaved

      lastModified.value = ''
      return
    }

    resetContent()
    setFadeLevel(normalizedFade)
    setImportanceLevel(importance ?? 'medium')
  },
  { immediate: true }
)

watch(noteContent, (value, oldValue) => {
  if (value === oldValue) return
  touchContent()
  emit('content-change', value)
})

watch(noteDescription, (value, oldValue) => {
  if (value === oldValue) return
  touchContent()
})

watch(noteTitle, (value, oldValue) => {
  if (value === oldValue) return
  setUnsaved()
})

watch(() => props.initialImportance, value => {
  if (props.mode === 'edit' && value) {
    setImportanceLevel(value)
  }
})

defineExpose({
  triggerSave: handleSave
})
</script>
