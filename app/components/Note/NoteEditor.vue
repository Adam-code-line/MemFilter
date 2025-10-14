<template>
  <section class="note-editor">
    <header class="editor-header" :class="{ 'editor-header--faded': fadeLevel > 0 }">
      <div
        v-if="headerTitle || headerSubtext || headerBadgesList.length || headerInfoItems.length"
        class="editor-header__meta"
      >
        <div class="editor-header__heading">
          <div class="editor-header__title-block">
            <h2 v-if="headerTitle" class="editor-header__title">
              {{ headerTitle }}
            </h2>
            <p v-if="headerSubtext" class="editor-header__subtext">
              {{ headerSubtext }}
            </p>
          </div>
          <UButton
            v-if="showNewButton"
            :icon="newButtonIcon"
            size="sm"
            variant="soft"
            color="primary"
            class="editor-header__action"
            @click="emit('new-note')"
          >
            {{ newButtonLabel }}
          </UButton>
        </div>
        <div
          v-if="headerBadgesList.length || headerInfoItems.length"
          class="editor-header__context"
        >
          <div v-if="headerBadgesList.length" class="editor-header__badges">
            <UBadge
              v-for="badge in headerBadgesList"
              :key="badge.label"
              :label="badge.label"
              :color="badge.color ?? 'neutral'"
              :variant="badge.variant ?? 'soft'"
              :icon="badge.icon"
            />
          </div>
          <div v-if="headerInfoItems.length" class="editor-header__info">
            <span v-for="info in headerInfoItems" :key="info">{{ info }}</span>
          </div>
        </div>
      </div>

      <div class="editor-form">
        <div class="editor-form__top">
          <UInput
            v-model="noteTitle"
            :placeholder="config.titlePlaceholder"
            variant="none"
            class="editor-form__title"
          />
          <div class="editor-form__controls">
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
        </div>
        <div class="editor-form__description">
          <label class="editor-form__label">记忆描述</label>
          <UTextarea
            v-model="noteDescription"
            :placeholder="descriptionPlaceholder"
            :rows="3"
            class="editor-form__textarea"
          />
        </div>
      </div>
    </header>

    <ClientOnly>
      <div
        class="editor-frame"
        :class="{ 'editor-frame--faded': fadeLevel > 0 }"
      >
        <div :id="editorContainerId" class="editor-host" />
        <div
          v-if="!noteContent"
          class="editor-placeholder"
        >
          {{ contentPlaceholder }}
        </div>
      </div>
    </ClientOnly>

    <footer class="editor-footer">
      <div class="editor-stats">
        <span>{{ metaLabels.wordCount }}：{{ contentLength }}</span>
        <span>{{ metaLabels.readTime }}：{{ estimatedReadTime }} 分钟</span>
        <span v-if="lastModified">{{ metaLabels.lastEdited }}：{{ lastModified }}</span>
      </div>
      <div class="editor-actions">
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
  { className: 'dark', label: '暗' }
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
  })
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

<style scoped>
.note-editor {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  width: 100%;
  padding: 1.75rem;
  border-radius: 1.75rem;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(226, 232, 240, 0.75));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.dark .note-editor {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.78));
  border-color: rgba(51, 65, 85, 0.45);
}

.editor-header {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.editor-header--faded {
  opacity: 0.88;
  filter: blur(0.25px);
}

.editor-header__meta {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.editor-header__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.editor-header__title-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;
  flex: 1;
}

.editor-header__title {
  font-size: 1.65rem;
  font-weight: 700;
  color: rgb(15, 23, 42);
  word-break: break-word;
}

.dark .editor-header__title {
  color: rgb(226, 232, 240);
}

.editor-header__subtext {
  font-size: 0.92rem;
  line-height: 1.6;
  color: rgba(71, 85, 105, 0.82);
  max-width: 48rem;
}

.dark .editor-header__subtext {
  color: rgba(148, 163, 184, 0.75);
}

.editor-header__action {
  border-radius: 999px;
}

.editor-header__context {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 0.82rem;
  color: rgba(71, 85, 105, 0.78);
}

.dark .editor-header__context {
  color: rgba(148, 163, 184, 0.72);
}

.editor-header__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.editor-header__info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem 1.35rem;
  border-radius: 1.25rem;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.9), rgba(226, 232, 240, 0.55));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.dark .editor-form {
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.72));
  border-color: rgba(71, 85, 105, 0.32);
}

.editor-form__top {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

@media (min-width: 768px) {
  .editor-form__top {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.editor-form__title {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  height: 3.1rem;
  padding: 0;
}

.editor-form__title :deep(input) {
  width: 100%;
  padding: 0;
}

.editor-form__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.editor-form__description {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.editor-form__label {
  font-size: 0.88rem;
  font-weight: 500;
  color: rgba(71, 85, 105, 0.82);
}

.dark .editor-form__label {
  color: rgba(148, 163, 184, 0.82);
}

.editor-form__textarea {
  min-height: 6.25rem;
  border-radius: 1rem;
}

.editor-frame {
  position: relative;
  border-radius: 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: transparent;
  min-height: clamp(30rem, 62vh, 38rem);
  padding: 1.25rem;
  transition: opacity 0.2s ease;
}

.dark .editor-frame {
  border-color: rgba(71, 85, 105, 0.35);
}

.editor-frame--faded {
  opacity: 0.85;
  filter: blur(0.4px);
}

.editor-host {
  height: 100%;
}

.editor-placeholder {
  position: absolute;
  inset: 1.5rem;
  pointer-events: none;
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(100, 116, 139, 0.65);
}

.dark .editor-placeholder {
  color: rgba(148, 163, 184, 0.6);
}

.editor-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
  color: rgba(71, 85, 105, 0.85);
}

.dark .editor-footer {
  color: rgba(148, 163, 184, 0.75);
}

.editor-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}


.editor-actions {
  display: flex;
  gap: 0.75rem;
}

:deep(.cherry) {
  height: 100%;
}

:deep(.CodeMirror) {
  background: transparent;
  font-size: 0.96rem;
  line-height: 1.7;
  min-height: clamp(20rem, 56vh, 28rem);
}

:deep(.cherry-previewer) {
  padding: 1rem 1.5rem;
}

@media (max-width: 1024px) {
  .note-editor {
    padding: 1.25rem;
  }

  .editor-frame {
    padding: 1rem;
    min-height: 24rem;
  }
}
</style>
