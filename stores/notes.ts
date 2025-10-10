
import { acceptHMRUpdate, defineStore } from 'pinia'

const STORAGE_KEY = 'memfilter-notes'
const MAX_FORGET_WINDOW = 999
const BASE_FORGET_WINDOW = 14
const DAY_IN_MS = 24 * 60 * 60 * 1000

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
  medium: 0.22,
  low: 0.28,
  noise: 0.35
}

const fadeProgressThresholds: Record<ImportanceLevel, [number, number, number, number]> = {
  high: [60, 78, 90, 100],
  medium: [22, 45, 70, 90],
  low: [18, 40, 65, 85],
  noise: [12, 35, 60, 80]
}

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const computeNoteAgeInDays = (note: NoteRecord) => {
  const candidate = typeof note.id === 'number' ? note.id : Number.parseInt(String(note.id ?? 0), 10)
  if (!Number.isFinite(candidate) || Number.isNaN(candidate) || candidate <= 0) {
    return 0
  }
  return Math.max(0, (Date.now() - candidate) / DAY_IN_MS)
}

const resolveProgressThresholds = (importance: ImportanceLevel) =>
  fadeProgressThresholds[importance] ?? fadeProgressThresholds.medium

const calculateFadeLevelFromProgress = (importance: ImportanceLevel, progress: number): FadeLevel => {
  const thresholds = resolveProgressThresholds(importance)
  let level = 0

  for (let index = 0; index < thresholds.length; index += 1) {
    if (progress >= thresholds[index]) {
      level = index + 1
    } else {
      break
    }
  }

  return Math.min(level, 4) as FadeLevel
}

const computeBaselineProgress = (note: NoteRecord, importanceScore: number, forgettingWindow: number) => {
  if (note.importance === 'high') {
    return 0
  }

  const multiplier = baselineProgressMultipliers[note.importance] ?? 0.3
  const scoreDrag = clamp(Math.round((100 - importanceScore) * multiplier), 0, 92)
  const ageDays = computeNoteAgeInDays(note)
  const curveScale = 0.6 + (importanceScore / 180)
  const effectiveWindow = Math.max(3, forgettingWindow * curveScale)
  const curveProgress = clamp(Math.round((1 - Math.exp(-ageDays / effectiveWindow)) * 100), 0, 97)

  return clamp(Math.max(scoreDrag, curveProgress), 0, 97)
}

const calculateAcceleratedProgress = (importance: ImportanceLevel, currentProgress: number, importanceScore: number) => {
  const thresholds = resolveProgressThresholds(importance)
  const currentLevel = calculateFadeLevelFromProgress(importance, currentProgress)
  const nextIndex = Math.min(currentLevel, thresholds.length - 1)
  const baseTarget = thresholds[nextIndex]
  const bonus = Math.round((100 - importanceScore) * 0.12)
  return clamp(Math.max(currentProgress, baseTarget + bonus), baseTarget, 96)
}

const remainingDaysByStage = (importance: ImportanceLevel, forgettingWindow: number, fadeLevel: FadeLevel, progress: number) => {
  if (importance === 'high') {
    const highStageWindows = [MAX_FORGET_WINDOW, BASE_FORGET_WINDOW * 6, BASE_FORGET_WINDOW * 4, BASE_FORGET_WINDOW * 2, BASE_FORGET_WINDOW] as const
    return highStageWindows[fadeLevel] ?? BASE_FORGET_WINDOW * 2
  }

  const stageFactors = [1, 0.82, 0.58, 0.36, 0.18]
  const stageFactor = stageFactors[fadeLevel] ?? 0.18
  const dynamicFactor = Math.max(0.35, 1 - progress / 130)
  const estimate = Math.round(forgettingWindow * stageFactor * dynamicFactor)
  return Math.max(1, estimate)
}

const normalizeRecord = (record: Partial<NoteRecord> & { id?: number }): NoteRecord => {
  const now = new Date()
  const importance = record.importance ?? 'medium'
  const defaultWindow = importance === 'high'
    ? MAX_FORGET_WINDOW
    : defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW

  return {
    id: record.id ?? now.getTime(),
    title: record.title ?? '未命名笔记',
    content: record.content ?? '',
    description: record.description ?? '',
    date: record.date ?? formatDateLabel(now),
    lastAccessed: record.lastAccessed ?? '刚刚',
    icon: record.icon ?? '📝',
    importance,
    fadeLevel: (record.fadeLevel ?? 0) as FadeLevel,
    forgettingProgress: record.forgettingProgress ?? 0,
    daysUntilForgotten: record.daysUntilForgotten ?? defaultWindow,
    isCollapsed: record.isCollapsed ?? false,
    importanceScore: record.importanceScore ?? 0,
    decayRate: record.decayRate ?? undefined
  }
}

const createInitialState = (initialNotes?: NoteRecord[]) =>
  initialNotes ? initialNotes.map(normalizeRecord) : []

const computeEvaluation = (note: NoteRecord, options: NoteDashboardOptions = {}) => {
  if (options.evaluateNote) {
    const evaluation = options.evaluateNote(note) ?? {}
    const importance = note.importance ?? 'medium'
    const fallbackWindow = importance === 'high'
      ? MAX_FORGET_WINDOW
      : defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW

    return {
      importanceScore: clamp(Math.round(evaluation.importanceScore ?? 0), 0, 100),
      decayRate: evaluation.decayRate ?? defaultDecayRates[importance],
      forgettingWindow: Math.max(1, Math.round(evaluation.forgettingWindow ?? fallbackWindow))
    }
  }

  const importance = note.importance
  const weight = importanceWeights[importance] ?? 0.7
  const contentBoost = Math.min(25, Math.round((note.content?.length ?? 0) / 80))
  const structureBonus = Math.min(12, Math.round((note.content?.match(/\n/g)?.length ?? 0) * 3.2))
  const titleBonus = Math.min(10, Math.round(note.title.length / 12))
  const agePenalty = Math.min(30, Math.round(computeNoteAgeInDays(note) * 1.6))
  const collapsePenalty = note.isCollapsed ? 6 : 0

  const rawScore = weight * 55 + contentBoost + structureBonus + titleBonus - agePenalty - collapsePenalty
  const importanceScore = clamp(Math.round(rawScore), 10, 100)

  const decayRate = defaultDecayRates[importance] ?? defaultDecayRates.medium
  if (importance === 'high') {
    return {
      importanceScore,
      decayRate,
      forgettingWindow: MAX_FORGET_WINDOW
    }
  }

  const baseWindow = defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW
  const windowScale = 1 + importanceScore / 140
  const forgettingWindow = Math.max(3, Math.round(baseWindow * windowScale))

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
  const evaluation = computeEvaluation(note, options)
  const importanceScore = evaluation.importanceScore
  const decayRate = evaluation.decayRate
  const forgettingWindow = evaluation.forgettingWindow

  const accelerated = context.accelerated ?? false
  const preserveProgress = context.preserveProgress ?? false
  const forceProgressReset = context.forceProgressReset ?? false

  let fadeLevel = (note.fadeLevel ?? 0) as FadeLevel
  let progress = clamp(Math.round(note.forgettingProgress ?? 0), 0, 100)
  let daysUntilForgotten = note.importance === 'high'
    ? MAX_FORGET_WINDOW
    : (note.daysUntilForgotten ?? forgettingWindow)

  if (forceProgressReset) {
    fadeLevel = 0 as FadeLevel
    progress = 0
    daysUntilForgotten = note.importance === 'high' ? MAX_FORGET_WINDOW : forgettingWindow
  } else {
    const baselineProgress = computeBaselineProgress(note, importanceScore, forgettingWindow)
    const mergedProgress = preserveProgress
      ? Math.max(progress, baselineProgress)
      : baselineProgress

    if (accelerated) {
      progress = calculateAcceleratedProgress(note.importance, mergedProgress, importanceScore)
    } else {
      progress = mergedProgress
    }

    fadeLevel = calculateFadeLevelFromProgress(note.importance, progress)

    if (note.importance === 'high' && !accelerated) {
      fadeLevel = Math.min(fadeLevel, 1) as FadeLevel
      progress = 0
      daysUntilForgotten = MAX_FORGET_WINDOW
    } else {
      if (accelerated && note.importance === 'high') {
        fadeLevel = Math.min(fadeLevel, 2) as FadeLevel
      }

      daysUntilForgotten = remainingDaysByStage(
        note.importance,
        forgettingWindow,
        fadeLevel,
        progress
      )
    }
  }

  return {
    ...note,
    fadeLevel,
    forgettingProgress: clamp(Math.round(progress), 0, 100),
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
        description: payload.description ?? '',
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
      description: payload.description ?? '',
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

  const directForget = (target: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === target.id)
    if (index === -1) {
      return
    }

    const current = notes.value[index]
    const evaluation = computeEvaluation(current, dashboardOptions.value)

    notes.value.splice(index, 1, {
      ...current,
      fadeLevel: 4 as FadeLevel,
      forgettingProgress: 100,
      daysUntilForgotten: 0,
      isCollapsed: true,
      lastAccessed: '刚刚',
      importanceScore: evaluation.importanceScore,
      decayRate: evaluation.decayRate,
      description: current.description
    })
  }

  const purgeNote = (target: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === target.id)
    if (index === -1) {
      return null
    }

    const [removed] = notes.value.splice(index, 1)
    return removed
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
    directForget,
    purgeNote
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useNotesStore, import.meta.hot))
}
