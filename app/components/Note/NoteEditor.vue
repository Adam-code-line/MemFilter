<template>
  <section class="note-editor">
    <NoteEditorMeta
      v-model:title="noteTitle"
      v-model:description="noteDescription"
      v-model:importance="importanceLevel"
      :importance-options="importanceOptions"
      :status-label="saveStatus"
      :status-color="statusColor"
      :title-placeholder="config.titlePlaceholder"
      :description-placeholder="descriptionPlaceholder"
      :fade-level="fadeLevel"
    />

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
      <template #fallback>
        <UTextarea
          v-model="noteContent"
          :placeholder="contentPlaceholder"
          :rows="12"
          class="min-h-[18rem]"
        />
      </template>
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

const editorContainerId = `cherry-editor-${Math.random().toString(36).slice(2)}`
const cherryInstance = shallowRef<any | null>(null)
const isSyncingFromCherry = ref(false)
let themeObserver: MutationObserver | null = null
let currentTheme: 'light' | 'dark' | null = null

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

const getCherryTheme = () => {
  if (import.meta.server || typeof document === 'undefined') {
    return 'light'
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const ensureEchartsReady = async () => {
  if (import.meta.server || typeof window === 'undefined') {
    return false
  }

  if ((window as any).echarts) {
    return true
  }

  try {
    const echartsModule = await import('echarts')
    const echarts = (echartsModule as unknown as { default?: any }).default ?? echartsModule
    ;(window as any).echarts = echarts
    return true
  } catch (error) {
    console.warn('[NoteEditor] echarts 加载失败，表格图表功能将被禁用。', error)
    ;(window as any).echarts = {
      init: () => ({
        setOption: () => {},
        dispose: () => {}
      })
    }
    return false
  }
}

const updateCherryTheme = () => {
  if (import.meta.server) {
    return
  }

  const instance: any = cherryInstance.value
  if (!instance) {
    return
  }

  const theme = getCherryTheme()
  if (currentTheme === theme) {
    return
  }

  if (typeof instance.setTheme === 'function') {
    instance.setTheme(theme)
  } else if (typeof instance.themeSwitch === 'function') {
    instance.themeSwitch(theme)
  } else if (instance.options) {
    instance.options.theme = theme
  }

  currentTheme = theme
}

const observeThemeChanges = () => {
  if (import.meta.server || typeof document === 'undefined' || themeObserver) {
    return
  }

  themeObserver = new MutationObserver(() => {
    updateCherryTheme()
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
}

const initializeCherryEditor = async () => {
  if (cherryInstance.value || import.meta.server) {
    return
  }

  await ensureEchartsReady()
  const CherryModule = await import('cherry-markdown')
  const Cherry = (CherryModule as unknown as { default?: any }).default ?? CherryModule
  const theme = getCherryTheme()
  const instance = new Cherry({
    id: editorContainerId,
    value: noteContent.value ?? '',
    theme,
    editor: {
      defaultModel: 'edit&preview',
      height: '100%'
    },
    callback: {
      afterChange: (markdown: string) => {
        isSyncingFromCherry.value = true
        noteContent.value = markdown
      }
    }
  })

  cherryInstance.value = instance
  currentTheme = theme
  observeThemeChanges()
  updateCherryTheme()
  applyReadOnlyState(isSaving.value)
}

const applyReadOnlyState = (value: boolean) => {
  const instance: any = cherryInstance.value
  if (!instance || typeof instance.getCodeMirror !== 'function') {
    return
  }

  const codeMirror = instance.getCodeMirror()
  if (codeMirror && typeof codeMirror.setOption === 'function') {
    codeMirror.setOption('readOnly', value ? 'nocursor' : false)
  }
}

onMounted(() => {
  initializeCherryEditor()
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

onBeforeUnmount(() => {
  const instance: any = cherryInstance.value
  if (!instance) {
    return
  }

  if (typeof instance.destroy === 'function') {
    instance.destroy()
  }
  cherryInstance.value = null

  if (themeObserver) {
    themeObserver.disconnect()
    themeObserver = null
  }

  currentTheme = null
})

watch(isSaving, value => {
  applyReadOnlyState(value)
})

watch(noteContent, (value, oldValue) => {
  if (!cherryInstance.value || value === oldValue) {
    return
  }

  if (isSyncingFromCherry.value) {
    isSyncingFromCherry.value = false
    return
  }

  const markdown = value ?? ''
  const instance: any = cherryInstance.value

  if (typeof instance.setMarkdown === 'function') {
    instance.setMarkdown(markdown)
  } else if (typeof instance.setValue === 'function') {
    instance.setValue(markdown)
  } else if (instance.editor?.editor?.setValue) {
    instance.editor.editor.setValue(markdown)
  }
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

.editor-frame {
  position: relative;
  border-radius: 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.96);
  min-height: clamp(30rem, 62vh, 38rem);
  padding: 1.25rem;
  transition: opacity 0.2s ease;
}

.dark .editor-frame {
  background: rgba(30, 41, 59, 0.92);
  border-color: rgba(71, 85, 105, 0.4);
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
  background: transparent;
  color: inherit;
  font-family: inherit;
  height: 100%;
}

:deep(.cherry .cherry-toolbar) {
  border-radius: 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  margin-bottom: 1rem;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.92);
}

:deep(.dark .cherry .cherry-toolbar) {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(71, 85, 105, 0.35);
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
