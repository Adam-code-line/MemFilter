import { computed, ref } from 'vue'
import type { FadeLevel, ImportanceLevel, NoteEditorOptions, NoteSavePayload } from './types'

const defaultStatusLabels = {
  saved: '已保存',
  unsaved: '未保存'
}

const defaultPlaceholders = {
  default: '在这里记录您的想法与灵感……',
  fading: '输入笔记内容，此笔记可能会被遗忘……',
  strongFading: '内容正在淡化中……'
}

export const useNoteEditor = (options: NoteEditorOptions = {}) => {
  const statusLabels = { ...defaultStatusLabels, ...options.statusLabels }
  const placeholders = { ...defaultPlaceholders, ...options.placeholders }
  const defaultImportance: ImportanceLevel = options.initialImportance ?? 'medium'

  const noteTitle = ref(options.initialTitle ?? '')
  const noteContent = ref(options.initialContent ?? '')
  const importanceLevel = ref<ImportanceLevel>(defaultImportance)
  const fadeLevel = ref<FadeLevel>((options.fadeLevel ?? 0) as FadeLevel)
  const isSaving = ref(false)
  const saveStatus = ref(statusLabels.unsaved)
  const lastModified = ref('')

  const contentLength = computed(() => noteContent.value.length)
  const estimatedReadTime = computed(() => Math.max(1, Math.ceil(contentLength.value / 200)))

  const contentPlaceholder = computed(() => {
    if (fadeLevel.value > 2) return placeholders.strongFading
    if (fadeLevel.value > 0) return placeholders.fading
    return placeholders.default
  })

  const touchContent = () => {
    saveStatus.value = statusLabels.unsaved
  }

  const beginSaving = () => {
    isSaving.value = true
  }

  const finishSaving = (savedAt?: string) => {
    isSaving.value = false
    saveStatus.value = statusLabels.saved
    lastModified.value = savedAt ?? new Date().toLocaleTimeString()
  }

  const setUnsaved = () => {
    saveStatus.value = statusLabels.unsaved
  }

  const setFadeLevel = (level: number) => {
    fadeLevel.value = Math.max(0, Math.min(4, level)) as FadeLevel
  }

  const setImportanceLevel = (level: ImportanceLevel) => {
    importanceLevel.value = level
  }

  const resetContent = () => {
    noteTitle.value = ''
    noteContent.value = ''
    importanceLevel.value = defaultImportance
    saveStatus.value = statusLabels.unsaved
    lastModified.value = ''
  }

  const buildSavePayload = (): NoteSavePayload => ({
    title: noteTitle.value.trim(),
    content: noteContent.value.trim(),
    importance: importanceLevel.value
  })

  if (noteContent.value) {
    saveStatus.value = statusLabels.saved
    lastModified.value = new Date().toLocaleTimeString()
  }

  return {
    // state
    noteTitle,
    noteContent,
    importanceLevel,
    fadeLevel,
    isSaving,
    saveStatus,
    lastModified,
    contentLength,
    estimatedReadTime,

    // computed helpers
    contentPlaceholder,

    // methods
    touchContent,
    beginSaving,
    finishSaving,
    setUnsaved,
    setFadeLevel,
    resetContent,
    setImportanceLevel,
    buildSavePayload,

    // config
    statusLabels
  }
}
