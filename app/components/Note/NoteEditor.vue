<template>
  <UCard class="note-editor-surface">
    <div class="note-editor-stack">
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
          class="editor-shell relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-white/96 via-white/92 to-white/70 shadow-xl transition dark:from-slate-900/82 dark:via-slate-900/72 dark:to-slate-900/60"
          :class="{ 'opacity-80 blur-[0.6px] text-gray-600 dark:text-gray-300': fadeLevel > 0 }"
        >
          <div class="editor-glow pointer-events-none" />
          <div :id="editorContainerId" class="editor-host" />
          <div
            v-if="!noteContent"
            class="pointer-events-none absolute inset-[1.25rem] text-sm leading-6 text-gray-400 dark:text-gray-500"
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
.note-editor-surface {
  width: 100%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(226, 232, 240, 0.45));
  border: 1px solid rgba(148, 163, 184, 0.22);
  backdrop-filter: blur(12px);
}

.dark .note-editor-surface {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.7));
  border-color: rgba(51, 65, 85, 0.4);
}

.note-editor-stack {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.editor-shell {
  min-height: clamp(28rem, 60vh, 36rem);
  padding: 1.25rem;
  position: relative;
}

.editor-host {
  position: relative;
  z-index: 10;
  height: 100%;
}

.editor-glow {
  position: absolute;
  inset: 12px;
  border-radius: 1.25rem;
  background: radial-gradient(circle at 30% 20%, rgba(56, 189, 248, 0.14), transparent 55%),
    radial-gradient(circle at 75% 75%, rgba(125, 211, 252, 0.12), transparent 60%);
  opacity: 0;
  transition: opacity 0.35s ease;
}

.editor-shell:hover .editor-glow {
  opacity: 1;
}

:deep(.cherry) {
  background: transparent;
  color: inherit;
  font-family: inherit;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.cherry .cherry-toolbar) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.78));
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 1rem;
  margin-bottom: 1rem;
  padding: 0.65rem 0.75rem;
  backdrop-filter: blur(14px);
}

:deep(.dark .cherry .cherry-toolbar) {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.68));
  border-color: rgba(148, 163, 184, 0.18);
}

:deep(.cherry-toolbar .cherry-toolbar-button) {
  border-radius: 0.75rem;
  transition: background-color 0.2s ease, color 0.2s ease;
}

:deep(.cherry-toolbar .cherry-toolbar-button:hover) {
  background-color: rgba(59, 130, 246, 0.15);
}

:deep(.cherry .cherry-editor) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.85));
  border-radius: 1rem;
  border: 1px solid rgba(203, 213, 225, 0.3);
  padding: 0.75rem 0.85rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

:deep(.dark .cherry .cherry-editor) {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.75));
  border-color: rgba(148, 163, 184, 0.25);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.12);
}

:deep(.CodeMirror) {
  background: transparent;
  font-size: 0.95rem;
  line-height: 1.65;
  min-height: clamp(18rem, 48vh, 24rem);
}

:deep(.cherry-previewer) {
  background: rgba(15, 23, 42, 0.03);
  border-radius: 1rem;
  border: 1px solid rgba(203, 213, 225, 0.35);
  margin-left: 1rem;
  padding: 1rem 1.5rem;
  overflow: auto;
}

:deep(.dark .cherry-previewer) {
  background: rgba(15, 23, 42, 0.45);
  border-color: rgba(71, 85, 105, 0.45);
}

:deep(.cherry-previewer h1),
:deep(.cherry-previewer h2),
:deep(.cherry-previewer h3) {
  font-weight: 600;
  margin: 1.25rem 0 0.75rem;
}

:deep(.cherry-previewer p) {
  margin: 0.75rem 0;
}

@media (max-width: 1024px) {
  .editor-shell {
    min-height: 22rem;
    padding: 1rem;
  }

  :deep(.cherry-previewer) {
    margin-left: 0.75rem;
    padding: 0.75rem 1rem;
  }
}
</style>
