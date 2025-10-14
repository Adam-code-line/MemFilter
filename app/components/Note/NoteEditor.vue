<template>
  <section class="flex flex-col gap-6 rounded-3xl border border-slate-200/50 bg-white/90 p-6 shadow-sm transition-opacity dark:border-slate-700/60 dark:bg-slate-900/80">
    <header
      :class="[
        'flex flex-col gap-6',
        fadeLevel > 0 ? 'opacity-90' : ''
      ]"
    >
      <div
        v-if="headerTitle || headerSubtext || headerBadgesList.length || headerInfoItems.length"
        class="flex flex-col gap-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <h2 v-if="headerTitle" class="break-words text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {{ headerTitle }}
            </h2>
            <p v-if="headerSubtext" class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {{ headerSubtext }}
            </p>
          </div>
          <UButton
            v-if="showNewButton"
            :icon="newButtonIcon"
            size="sm"
            variant="soft"
            color="primary"
            class="shrink-0"
            @click="emit('new-note')"
          >
            {{ newButtonLabel }}
          </UButton>
        </div>

        <div
          v-if="headerBadgesList.length || headerInfoItems.length"
          class="flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300"
        >
          <div v-if="headerBadgesList.length" class="flex flex-wrap gap-2">
            <UBadge
              v-for="badge in headerBadgesList"
              :key="badge.label"
              :label="badge.label"
              :color="badge.color ?? 'neutral'"
              :variant="badge.variant ?? 'soft'"
              :icon="badge.icon"
            />
          </div>
          <div v-if="headerInfoItems.length" class="flex flex-wrap gap-2">
            <span v-for="info in headerInfoItems" :key="info">{{ info }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-5 rounded-2xl border border-slate-200/50 bg-white/95 p-5 dark:border-slate-700/60 dark:bg-slate-900/70">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">笔记标题</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {{ noteTitle || config.titlePlaceholder || '未命名笔记' }}
            </h3>
          </div>

          <div class="flex flex-wrap items-center gap-3">
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
              v-if="saveStatus"
              :label="saveStatus"
              :color="statusColor"
              variant="outline"
            />
          </div>

          <UTextarea
            v-model="noteTitle"
            :placeholder="config.titlePlaceholder"
            :rows="2"
            autoresize
            :ui="{
              wrapper: 'w-full',
              textarea: 'w-full resize-none rounded-xl border border-slate-200/60 bg-white/95 px-4 py-3 text-base leading-relaxed text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/40 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100'
            }"
          />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">记忆描述</span>
          <UTextarea
            v-model="noteDescription"
            :placeholder="descriptionPlaceholder"
            :rows="3"
            :ui="{
              wrapper: 'w-full',
              textarea: 'w-full rounded-xl border border-slate-200/60 bg-white/95 px-4 py-3 text-sm leading-relaxed text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/40 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200'
            }"
          />
        </div>
      </div>
    </header>

    <ClientOnly>
        <div :id="editorContainerId" class="w-full min-h-[32rem]" />
    </ClientOnly>

    <footer class="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300">
      <div class="flex flex-wrap gap-4">
        <span>{{ metaLabels.wordCount }}：{{ contentLength }}</span>
        <span>{{ metaLabels.readTime }}：{{ estimatedReadTime }} 分钟</span>
        <span v-if="lastModified">{{ metaLabels.lastEdited }}：{{ lastModified }}</span>
      </div>
      <div class="flex gap-3">
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
    </footer>
  </section>
</template>

<script setup lang="ts">
import type { CherryThemeEntry } from '~/composables/editor/useCherryMarkdown'

interface EditorThemeConfig {
  themeList?: CherryThemeEntry[]
  codeBlockTheme?: string
}

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
  themeSettings?: EditorThemeConfig
}

const props = withDefaults(defineProps<{
  initialTitle?: string
  initialContent?: string
  initialDescription?: string
  fadeLevel?: number
  mode?: 'create' | 'edit'
  initialImportance?: ImportanceLevel
  config?: EditorConfig
  headerTitle?: string
  headerSubtext?: string
  headerBadges?: Array<{ label: string; color?: string; variant?: 'solid' | 'soft' | 'subtle' | 'outline'; icon?: string }>
  headerInfo?: string[]
  newButtonLabel?: string
  newButtonIcon?: string
  showNewButton?: boolean
}>(), {
  initialTitle: '',
  initialContent: '',
  initialDescription: '',
  fadeLevel: 0,
  mode: 'create',
  initialImportance: 'medium',
  config: () => ({}),
  headerTitle: '',
  headerSubtext: '',
  headerBadges: () => [],
  headerInfo: () => [],
  newButtonLabel: '新建笔记',
  newButtonIcon: 'i-lucide-plus',
  showNewButton: true
})

const emit = defineEmits<{
  (e: 'save', payload: NoteSavePayload): void
  (e: 'cancel'): void
  (e: 'content-change', value: string): void
  (e: 'new-note'): void
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

const defaultThemeList: CherryThemeEntry[] = [
  { className: 'light', label: '亮' },
  { className: 'dark', label: '暗' },
  { className: 'violet', label: '淡雅' },
  { className: 'blue', label: '清幽' },
  { className: 'red', label: '粉' },

]

const editorContainerId = `cherry-editor-${Math.random().toString(36).slice(2)}`
const isPopulating = ref(false)

const headerBadgesList = computed(() => props.headerBadges ?? [])
const headerInfoItems = computed(() => props.headerInfo ?? [])

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

const themeConfig = computed(() => config.value.themeSettings ?? {})
const themeList = computed(() => {
  const list = themeConfig.value.themeList
  return Array.isArray(list) && list.length ? list : defaultThemeList
})
const codeBlockTheme = computed(() => themeConfig.value.codeBlockTheme ?? 'default')
const {
  initialize: initializeCherryEditor,
  destroy: destroyCherryEditor,
  applyReadOnlyState,
  syncExternalContent
} = useCherryMarkdown({
  containerId: editorContainerId,
  getInitialValue: () => noteContent.value ?? '',
  onContentChange: (markdown: string) => {
    noteContent.value = markdown
  },
  getThemeConfig: () => ({
    themeList: themeList.value,
    codeBlockTheme: codeBlockTheme.value
  }),
  getEditorHeight: () => 560
})

onMounted(async () => {
  await initializeCherryEditor()
  applyReadOnlyState(isSaving.value)
})

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

    isPopulating.value = true

    if (mode === 'edit' && hasEditPayload) {
      noteTitle.value = title ?? ''
      noteContent.value = content ?? ''
      noteDescription.value = description ?? ''
      setFadeLevel(normalizedFade)
      setImportanceLevel(importance ?? 'medium')

      saveStatus.value = (noteContent.value || noteDescription.value) ? statusLabels.saved : statusLabels.unsaved

      lastModified.value = ''
    } else {
      resetContent()
      setFadeLevel(normalizedFade)
      setImportanceLevel(importance ?? 'medium')
    }

    nextTick(() => {
      isPopulating.value = false
    })
  },
  { immediate: true }
)

watch(noteDescription, (value, oldValue) => {
  if (value === oldValue || isPopulating.value) return
  touchContent()
})

watch(noteTitle, (value, oldValue) => {
  if (value === oldValue || isPopulating.value) return
  setUnsaved()
})

watch(() => props.initialImportance, value => {
  if (props.mode === 'edit' && value) {
    setImportanceLevel(value)
  }
})

onBeforeUnmount(() => {
  destroyCherryEditor()
})

watch(isSaving, value => {
  applyReadOnlyState(value)
})

watch(noteContent, (value, oldValue) => {
  if (value === oldValue) {
    return
  }

  const populating = isPopulating.value
  if (!populating) {
    touchContent()
    emit('content-change', value)
  }

  syncExternalContent(value)
})

defineExpose({
  triggerSave: handleSave
})
</script>

