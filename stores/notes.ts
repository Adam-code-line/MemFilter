import { computed, onMounted, ref, watch } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import type {
  FadeLevel,
  ImportanceLevel,
  NoteDashboardOptions,
  NoteRecord,
  NoteSavePayload
} from '~/composables/note'

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

const baselineProgressMultipliers: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 0.26,
  low: 0.32,
  noise: 0.38
}

const fadeProgressThresholds: Record<ImportanceLevel, [number, number, number, number]> = {
  high: [100, 100, 100, 100],
  medium: [35, 60, 80, 95],
  low: [25, 55, 78, 92],
  noise: [18, 45, 70, 88]
}

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

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

const computeEvaluation = (note: NoteRecord, options?: NoteDashboardOptions) => {
  const custom = options?.evaluateNote?.(note)
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
  options: NoteDashboardOptions = {},
  context: { accelerated?: boolean; preserveProgress?: boolean; forceProgressReset?: boolean } = {}
): NoteRecord => {
  const base = computeEvaluation(note, options)
  const importanceScore = base.importanceScore
  const decayRate = base.decayRate
  const forgettingWindow = base.forgettingWindow

  const preserveProgress = context.preserveProgress ?? false
  const forceProgressReset = context.forceProgressReset ?? false

  let fadeLevel = (note.fadeLevel ?? 0) as FadeLevel
  let progress = note.forgettingProgress ?? 0
  let daysUntilForgotten = note.daysUntilForgotten ?? forgettingWindow

  if (forceProgressReset) {
    fadeLevel = 0 as FadeLevel
    progress = 0
    daysUntilForgotten = note.importance === 'high' ? MAX_FORGET_WINDOW : forgettingWindow
  } else if (note.importance === 'high' && !context.accelerated) {
    fadeLevel = Math.min(fadeLevel, 1) as FadeLevel
    daysUntilForgotten = MAX_FORGET_WINDOW
    progress = 0
  } else if (context.accelerated) {
    const nextFade = Math.min(4, fadeLevel + 1) as FadeLevel
    fadeLevel = note.importance === 'high'
      ? (Math.max(2, nextFade) as FadeLevel)
      : (Math.max(1, nextFade) as FadeLevel)
    progress = Math.min(100, Math.max(progress, 60 + Math.round((100 - importanceScore) * 0.4)))
    daysUntilForgotten = Math.max(1, Math.round(forgettingWindow * 0.3))
  } else {
    const multiplier = baselineProgressMultipliers[note.importance] ?? 0.3
    const baselineProgress = note.importance === 'high'
      ? 0
      : clamp(Math.round((100 - importanceScore) * multiplier), 0, 90)

    const hadProgress = (note.forgettingProgress ?? 0) > 0

    if (preserveProgress) {
      progress = hadProgress ? Math.max(progress, baselineProgress) : 0
    } else {
      progress = baselineProgress
    }

    if (note.importance === 'high') {
      fadeLevel = Math.min(fadeLevel, 1) as FadeLevel
    } else {
      const thresholds = fadeProgressThresholds[note.importance] ?? fadeProgressThresholds.medium
      let computedFade = 0 as FadeLevel

      for (let index = 0; index < thresholds.length; index += 1) {
        if (progress >= thresholds[index]) {
          computedFade = (index + 1) as FadeLevel
        } else {
          break
        }
      }

      fadeLevel = (preserveProgress
        ? Math.max(fadeLevel, computedFade)
        : computedFade) as FadeLevel
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

const rehydrateNotes = (
  collection: NoteRecord[],
  options?: NoteDashboardOptions,
  preserveProgress = false
) => collection.map(item => applyEvaluation(item, options, { preserveProgress }))

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<NoteRecord[]>([])
  const isHydrated = ref(false)
  const initialized = ref(false)
  const dashboardOptions = ref<NoteDashboardOptions | undefined>(undefined)
  let initialNotesSnapshot: NoteRecord[] | undefined
  let pendingLocalHydration = false

  const adoptInitialNotes = (initialNotes?: NoteRecord[]) => {
    if (initialNotes?.length) {
      notes.value = rehydrateNotes(createInitialState(initialNotes), dashboardOptions.value)
    } else {
      notes.value = rehydrateNotes(notes.value, dashboardOptions.value, true)
    }
  }

  const hydrateFromStorage = (fallback?: NoteRecord[]) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Partial<NoteRecord>>
        const normalized = parsed.map(normalizeRecord)
        notes.value = rehydrateNotes(normalized, dashboardOptions.value, true)
        return
      }
    } catch (error) {
      console.warn('加载本地笔记数据失败:', error)
    }

    if (fallback?.length) {
      adoptInitialNotes(fallback)
    }
  }

  const ensureInitialized = (initialNotes?: NoteRecord[], options?: NoteDashboardOptions) => {
    if (initialized.value) {
      return
    }

    if (options) {
      dashboardOptions.value = options
    }

    initialNotesSnapshot = initialNotes
    adoptInitialNotes(initialNotes)

    if (import.meta.client) {
      pendingLocalHydration = true
    } else {
      isHydrated.value = true
    }

    initialized.value = true
  }

  onMounted(() => {
    if (!initialized.value) {
      return
    }

    if (pendingLocalHydration) {
      hydrateFromStorage(initialNotesSnapshot)
      pendingLocalHydration = false
    }

    isHydrated.value = true
  })

  if (process.client) {
    watch(
      notes,
      value => {
        if (!initialized.value || !isHydrated.value) {
          return
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
        } catch (error) {
          console.warn('保存本地笔记数据失败:', error)
        }
      },
      { deep: true }
    )
  }

  const noteStats = computed(() => ({
    total: notes.value.length,
    core: notes.value.filter(note => note.importance === 'high').length,
    fading: notes.value.filter(note => note.fadeLevel >= 2 && note.fadeLevel <= 3).length,
    forgotten: notes.value.filter(note => note.fadeLevel >= 4).length
  }))

  const importanceCounts = computed(() => ({
    high: notes.value.filter(note => note.importance === 'high').length,
    medium: notes.value.filter(note => note.importance === 'medium').length,
    low: notes.value.filter(note => note.importance === 'low').length,
    noise: notes.value.filter(note => note.importance === 'noise').length
  }))

  const sortedByRecency = computed(() =>
    notes.value
      .slice()
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
  )

  const sortedByImportance = computed(() =>
    notes.value
      .slice()
      .sort((a, b) => {
        const importanceDelta = (importancePriority[a.importance] ?? 99) - (importancePriority[b.importance] ?? 99)
        if (importanceDelta !== 0) {
          return importanceDelta
        }
        const scoreDelta = (b.importanceScore ?? 0) - (a.importanceScore ?? 0)
        if (scoreDelta !== 0) {
          return scoreDelta
        }
        return (a.fadeLevel ?? 0) - (b.fadeLevel ?? 0)
      })
  )

  const getRecentNotes = (limit = 6) => sortedByRecency.value.slice(0, limit)

  const upsertNote = (payload: NoteSavePayload, existing?: NoteRecord | null) => {
    if (!payload.title || !payload.content) {
      return null
    }

    if (existing) {
      const index = notes.value.findIndex(note => note.id === existing.id)
      if (index === -1) {
        return null
      }

      const evaluated = applyEvaluation({
        ...notes.value[index],
        title: payload.title,
        content: payload.content,
        importance: payload.importance,
        lastAccessed: '刚刚'
      }, dashboardOptions.value, { forceProgressReset: true })
      notes.value.splice(index, 1, evaluated)
      return evaluated
    }

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
    }, dashboardOptions.value, { forceProgressReset: true })

    notes.value = [evaluated, ...notes.value]
    return evaluated
  }

  const restoreNote = (target: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === target.id)
    if (index === -1) {
      return
    }

    const evaluated = applyEvaluation({
      ...notes.value[index],
      fadeLevel: 0 as FadeLevel,
      forgettingProgress: 0,
      isCollapsed: false,
      lastAccessed: '刚刚'
    }, dashboardOptions.value, { forceProgressReset: true })
    notes.value.splice(index, 1, evaluated)
  }

  const accelerateForgetting = (target: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === target.id)
    if (index === -1) {
      return
    }

    const accelerated = applyEvaluation({
      ...notes.value[index],
      lastAccessed: '刚刚'
    }, dashboardOptions.value, { accelerated: true, preserveProgress: true })
    notes.value.splice(index, 1, accelerated)
  }

  const toggleCollapse = (target: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === target.id)
    if (index === -1) {
      return
    }

    const current = notes.value[index]
    notes.value.splice(index, 1, {
      ...current,
      isCollapsed: !current.isCollapsed
    })
  }

  return {
    notes,
    isHydrated,
    noteStats,
    importanceCounts,
    sortedByRecency,
    sortedByImportance,
    ensureInitialized,
    getRecentNotes,
    upsertNote,
    restoreNote,
    accelerateForgetting,
    toggleCollapse
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useNotesStore, import.meta.hot))
}
