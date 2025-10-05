import { computed, ref } from 'vue'
import type { FadeLevel, NoteEditorOptions, NoteSavePayload } from './types'

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

  const noteTitle = ref(options.initialTitle ?? '')
  const noteContent = ref(options.initialContent ?? '')
  const fadeLevel = ref<FadeLevel>((options.fadeLevel ?? 0) as FadeLevel)
  const aiScore = ref(65)
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

  const scoreColor = computed(() => getScoreColor(aiScore.value))

  const touchContent = () => {
    saveStatus.value = statusLabels.unsaved

    if (noteContent.value.length > 50) {
      analyzeImportance()
    }
  }

  const analyzeImportance = () => {
    const keywordScore = (noteContent.value.match(/[重要|关键|核心|主要]/g) || []).length * 10
    const lengthScore = Math.min(noteContent.value.length / 10, 30)
    const titleScore = noteTitle.value.trim().length > 0 ? 20 : 0

    aiScore.value = Math.min(100, Math.max(10, keywordScore + lengthScore + titleScore))
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

  const resetContent = () => {
    noteTitle.value = ''
    noteContent.value = ''
    aiScore.value = 65
    saveStatus.value = statusLabels.unsaved
    lastModified.value = ''
  }

  const getImportanceLevel = (score: number) => {
    if (score >= 80) return 'high'
    if (score >= 60) return 'medium'
    if (score >= 40) return 'low'
    return 'noise'
  }

  const buildSavePayload = (): NoteSavePayload => ({
    title: noteTitle.value.trim(),
    content: noteContent.value.trim(),
    importance: getImportanceLevel(aiScore.value)
  })

  if (noteContent.value) {
    analyzeImportance()
    saveStatus.value = statusLabels.saved
    lastModified.value = new Date().toLocaleTimeString()
  }

  return {
    // state
    noteTitle,
    noteContent,
    fadeLevel,
    aiScore,
    isSaving,
    saveStatus,
    lastModified,
    contentLength,
    estimatedReadTime,

    // computed helpers
    contentPlaceholder,
    scoreColor,

    // methods
    touchContent,
    analyzeImportance,
    beginSaving,
    finishSaving,
    setUnsaved,
    setFadeLevel,
    resetContent,
    getImportanceLevel,
    buildSavePayload,

    // config
    statusLabels
  }
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'success'
  if (score >= 60) return 'primary'
  if (score >= 40) return 'warning'
  return 'error'
}
