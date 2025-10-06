import { computed, onMounted, ref, watch } from 'vue'
import { useState } from '#app'
import type {
  FadeLevel,
  ImportanceLevel,
  NoteDashboardOptions,
  NoteRecord,
  NoteSavePayload
} from './types'

const STORAGE_KEY = 'memfilter-notes'
const MAX_FORGET_WINDOW = 999
const BASE_FORGET_WINDOW = 14

const importanceWeights: Record<ImportanceLevel, number> = {
  high: 1,
  medium: 0.7,
  low: 0.4,
  noise: 0.2
}

const importancePriority: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  noise: 3
}

const defaultDecayRates: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 20,
  low: 35,
  noise: 50
}

const defaultForgetWindows: Record<ImportanceLevel, number> = {
  high: MAX_FORGET_WINDOW,
  medium: BASE_FORGET_WINDOW,
  low: 7,
  noise: 3
}

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)

const normalizeRecord = (record: Partial<NoteRecord> & { id?: number }): NoteRecord => {
  const now = new Date()
  return {
    id: record.id ?? now.getTime(),
    title: record.title ?? '未命名笔记',
    content: record.content ?? '',
    date: record.date ?? formatDateLabel(now),
    lastAccessed: record.lastAccessed ?? '刚刚',
    icon: record.icon ?? '📝',
    importance: record.importance ?? 'medium',
    fadeLevel: (record.fadeLevel ?? 0) as FadeLevel,
    forgettingProgress: record.forgettingProgress ?? 0,
    daysUntilForgotten: record.daysUntilForgotten ?? BASE_FORGET_WINDOW,
    isCollapsed: record.isCollapsed ?? false,
    importanceScore: record.importanceScore ?? 0,
    decayRate: record.decayRate ?? undefined
  }
}

const createInitialState = (initialNotes?: NoteRecord[]) =>
  initialNotes ? initialNotes.map(normalizeRecord) : []

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const useNotesDashboard = (options: NoteDashboardOptions = {}) => {
  type ImportanceFilter = 'all' | ImportanceLevel

  const notes = useState<NoteRecord[]>(
    'memfilter-notes-state',
    () => createInitialState(options.initialNotes)
  )
  const viewMode = ref<'card' | 'list'>('card')
  const isHydrated = ref(false)
  const importanceFilter = ref<ImportanceFilter>('all')
  const searchQuery = ref('')
  const selectedNotes = ref<number[]>([])
  const editorMode = ref<'create' | 'edit'>('create')
  const editingNote = ref<NoteRecord | null>(null)
  const activeNoteId = ref<number | null>(null)

  const computeEvaluation = (note: NoteRecord) => {
    const custom = options.evaluateNote?.(note)
    if (custom) {
      return {
        importanceScore: clamp(Math.round(custom.importanceScore ?? 0), 0, 100),
        decayRate: custom.decayRate ?? defaultDecayRates[note.importance],
        forgettingWindow: custom.forgettingWindow ?? defaultForgetWindows[note.importance]
      }
    }

    const weight = importanceWeights[note.importance] ?? 0.5
    const contentBoost = Math.min(25, Math.round((note.content?.length ?? 0) / 80))
    const freshnessPenalty = Math.max(0, (note.fadeLevel ?? 0) > 0 ? (note.fadeLevel - 1) * 7 : 0)
    const rawScore = weight * 70 + contentBoost - freshnessPenalty
    const importanceScore = clamp(Math.round(rawScore), 5, 100)

    const baseDecay = defaultDecayRates[note.importance] ?? 20
    const decayRate = note.importance === 'high'
      ? 0
      : clamp(baseDecay + Math.round((100 - importanceScore) / 4), 10, 60)

    const baseWindow = defaultForgetWindows[note.importance] ?? BASE_FORGET_WINDOW
    const forgettingWindow = note.importance === 'high'
      ? MAX_FORGET_WINDOW
      : clamp(
        Math.round(baseWindow * (importanceScore >= 75 ? 1.6 : importanceScore >= 50 ? 1 : 0.6)),
        2,
        MAX_FORGET_WINDOW
      )

    return {
      importanceScore,
      decayRate,
      forgettingWindow
    }
  }

  const applyEvaluation = (
    note: NoteRecord,
    context: { accelerated?: boolean; preserveProgress?: boolean } = {}
  ): NoteRecord => {
    const base = computeEvaluation(note)
    const importanceScore = base.importanceScore
    const decayRate = base.decayRate
    const forgettingWindow = base.forgettingWindow

    const preserveProgress = context.preserveProgress ?? false

    let fadeLevel = (note.fadeLevel ?? 0) as FadeLevel
    let progress = note.forgettingProgress ?? 0
    let daysUntilForgotten = note.daysUntilForgotten ?? forgettingWindow

    if (note.importance === 'high' && !context.accelerated) {
      fadeLevel = Math.min(fadeLevel, 1) as FadeLevel
      daysUntilForgotten = MAX_FORGET_WINDOW
      progress = 0
    } else if (context.accelerated) {
      const nextFade = Math.min(4, (fadeLevel + 1)) as FadeLevel
      fadeLevel = note.importance === 'high'
        ? (Math.max(2, nextFade) as FadeLevel)
        : (Math.max(1, nextFade) as FadeLevel)
      progress = Math.min(100, Math.max(progress, 60 + Math.round((100 - importanceScore) * 0.4)))
      daysUntilForgotten = Math.max(1, Math.round(forgettingWindow * 0.3))
    } else {
      const baselineProgress = note.importance === 'high'
        ? 0
        : clamp(Math.round((100 - importanceScore) * 0.35), 5, 85)

      progress = preserveProgress
        ? Math.max(progress, baselineProgress)
        : baselineProgress

      if (progress > 0 && note.importance !== 'high') {
        fadeLevel = Math.max(1, fadeLevel) as FadeLevel
      } else if (note.importance === 'high') {
        fadeLevel = Math.min(fadeLevel, 1) as FadeLevel
      }

      daysUntilForgotten = forgettingWindow
    }

    return {
      ...note,
      fadeLevel,
      forgettingProgress: progress,
      daysUntilForgotten,
      importanceScore,
      decayRate
    }
  }

  const rehydrateNotes = (collection: NoteRecord[], preserve = false) =>
    collection.map(item => applyEvaluation(item, { preserveProgress: preserve }))

  notes.value = rehydrateNotes(notes.value, true)

  onMounted(() => {
    if (!process.client) {
      isHydrated.value = true
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Partial<NoteRecord>>
        const normalized = parsed.map(normalizeRecord)
        notes.value = rehydrateNotes(normalized, true)
      } else if (notes.value.length === 0 && options.initialNotes?.length) {
        notes.value = rehydrateNotes(createInitialState(options.initialNotes))
      } else {
        notes.value = rehydrateNotes(notes.value, true)
      }
    } catch (error) {
      console.warn('加载本地笔记数据失败:', error)
    } finally {
      isHydrated.value = true
    }
  })

  if (process.client) {
    watch(
      notes,
      value => {
        if (!isHydrated.value) return

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
        } catch (error) {
          console.warn('保存本地笔记数据失败:', error)
        }
      },
      { deep: true }
    )
  }

  const filteredNotes = computed(() => {
    let data = [...notes.value]

    if (importanceFilter.value !== 'all') {
      data = data.filter(note => note.importance === importanceFilter.value)
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase()
      data = data.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      )
    }

    data.sort((a, b) => {
      const importanceDelta = importancePriority[a.importance] - importancePriority[b.importance]
      if (importanceDelta !== 0) {
        return importanceDelta
      }
      const scoreDelta = (b.importanceScore ?? 0) - (a.importanceScore ?? 0)
      if (scoreDelta !== 0) {
        return scoreDelta
      }
      return (b.id ?? 0) - (a.id ?? 0)
    })

    return data
  })

  const noteStats = computed(() => ({
    total: notes.value.length,
    core: notes.value.filter(note => note.importance === 'high').length,
    fading: notes.value.filter(note => note.fadeLevel >= 2 && note.fadeLevel <= 3).length,
    forgotten: notes.value.filter(note => note.fadeLevel >= 4).length
  }))

  const selectedCount = computed(() => selectedNotes.value.length)

  const setViewMode = (mode: 'card' | 'list') => {
    viewMode.value = mode
  }

  const setImportanceFilter = (value: ImportanceFilter) => {
    importanceFilter.value = value
  }

  const updateSearchQuery = (value: string) => {
    searchQuery.value = value
  }

  const toggleSelection = (id: number) => {
    if (selectedNotes.value.includes(id)) {
      selectedNotes.value = selectedNotes.value.filter(selectedId => selectedId !== id)
    } else {
      selectedNotes.value = [...selectedNotes.value, id]
    }
  }

  const openEditorForNew = () => {
    editorMode.value = 'create'
    editingNote.value = null
    activeNoteId.value = null
  }

  const openEditorForNote = (note: NoteRecord) => {
    editorMode.value = 'edit'
    editingNote.value = { ...note }
    activeNoteId.value = note.id
  }

  const closeEditor = () => {
    editorMode.value = 'create'
    editingNote.value = null
    activeNoteId.value = null
  }

  const restoreNote = (note: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === note.id)
    if (index !== -1) {
      const evaluated = applyEvaluation({
        ...notes.value[index],
        fadeLevel: 0 as FadeLevel,
        forgettingProgress: 0,
        isCollapsed: false,
        lastAccessed: '刚刚'
      })
      notes.value.splice(index, 1, evaluated)
    }
  }

  const accelerateForgetting = (note: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === note.id)
    if (index !== -1) {
      const accelerated = applyEvaluation(
        {
          ...notes.value[index],
          lastAccessed: '刚刚'
        },
        { accelerated: true, preserveProgress: true }
      )
      notes.value.splice(index, 1, accelerated)
    }
  }

  const toggleCollapse = (note: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === note.id)
    if (index !== -1) {
      const current = notes.value[index]
      notes.value.splice(index, 1, {
        ...current,
        isCollapsed: !current.isCollapsed
      })
    }
  }

  const saveNote = (payload: NoteSavePayload) => {
    if (!payload.title || !payload.content) {
      return
    }

    if (editorMode.value === 'edit' && editingNote.value) {
      const index = notes.value.findIndex(note => note.id === editingNote.value!.id)
      if (index !== -1) {
        const evaluated = applyEvaluation({
          ...notes.value[index],
          title: payload.title,
          content: payload.content,
          importance: payload.importance,
          lastAccessed: '刚刚'
        })
        notes.value.splice(index, 1, evaluated)
        editingNote.value = { ...evaluated }
        activeNoteId.value = evaluated.id
      }
    } else {
      const id = Date.now()
      const now = new Date()
      const evaluated = applyEvaluation({
        id,
        title: payload.title,
        content: payload.content,
        date: formatDateLabel(now),
        lastAccessed: '刚刚',
        icon: '📝',
        importance: payload.importance,
        fadeLevel: 0 as FadeLevel,
        forgettingProgress: 0,
        daysUntilForgotten: BASE_FORGET_WINDOW,
        isCollapsed: false
      })
      notes.value = [evaluated, ...notes.value]
      editorMode.value = 'edit'
      editingNote.value = { ...evaluated }
      activeNoteId.value = evaluated.id
    }
  }

  return {
    // state
    notes,
    filteredNotes,
    noteStats,
    viewMode,
    importanceFilter,
    searchQuery,
    selectedNotes,
    selectedCount,
    editorMode,
    editingNote,
    activeNoteId,

    // actions
    setViewMode,
    setImportanceFilter,
    updateSearchQuery,
    toggleSelection,
    openEditorForNew,
    openEditorForNote,
    closeEditor,
    restoreNote,
    accelerateForgetting,
    toggleCollapse,
    saveNote
  }
}
