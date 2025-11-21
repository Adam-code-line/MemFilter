import type {
  FadeLevel,
  ImportanceLevel,
  NoteAIEvaluation,
  NoteDashboardOptions,
  NoteRecord,
} from '~/composables/note/types'
import { IMPORTANCE_METADATA } from '~/composables/note-memory/importanceMetadata'
import { ensureAuthSchema, useMysql } from '~~/server/utils/db'

interface DbNoteRow {
  id: number
  user_id: string
  title: string
  content: string
  description: string | null
  icon: string | null
  importance: ImportanceLevel
  fade_level: number
  forgetting_progress: number
  days_until_forgotten: number | null
  importance_score: number | null
  decay_rate: number | null
  is_collapsed: number
  last_accessed_at: Date | null
  restored_at: Date | null
  date_label: string | null
  created_at: Date
  updated_at: Date
  ai_evaluation: string | null
}

export const DAY_IN_MS = 24 * 60 * 60 * 1000
const MAX_FORGET_WINDOW = 999
const BASE_FORGET_WINDOW = 14

const defaultDecayRates: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 20,
  low: 35,
  noise: 50,
}

const importanceWeights: Record<ImportanceLevel, number> = {
  high: 1,
  medium: 0.7,
  low: 0.4,
  noise: 0.2,
}

const defaultForgetWindows: Record<ImportanceLevel, number> = {
  high: MAX_FORGET_WINDOW,
  medium: BASE_FORGET_WINDOW,
  low: 7,
  noise: 3,
}

const baselineProgressMultipliers: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 0.22,
  low: 0.28,
  noise: 0.35,
}

const fadeProgressThresholds: Record<ImportanceLevel, [number, number, number, number]> = {
  high: [60, 78, 90, 100],
  medium: [22, 45, 70, 90],
  low: [18, 40, 65, 85],
  noise: [12, 35, 60, 80],
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const computeNoteAgeInDays = (note: Pick<NoteRecord, 'createdAt' | 'date' | 'restoredAt'>) => {
  if (note.restoredAt) {
    const restoredTimestamp = Date.parse(note.restoredAt)
    if (!Number.isNaN(restoredTimestamp)) {
      return Math.max(0, (Date.now() - restoredTimestamp) / DAY_IN_MS)
    }
  }

  if (note.createdAt) {
    const timestamp = Date.parse(note.createdAt)
    if (!Number.isNaN(timestamp)) {
      return Math.max(0, (Date.now() - timestamp) / DAY_IN_MS)
    }
  }

  if (note.date) {
    const parsed = Date.parse(note.date)
    if (!Number.isNaN(parsed)) {
      return Math.max(0, (Date.now() - parsed) / DAY_IN_MS)
    }
  }

  return 0
}

const resolveProgressThresholds = (importance: ImportanceLevel) =>
  fadeProgressThresholds[importance] ?? fadeProgressThresholds.medium

const calculateFadeLevelFromProgress = (
  importance: ImportanceLevel,
  progress: number
): FadeLevel => {
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

const computeBaselineProgress = (
  note: NoteRecord,
  importanceScore: number,
  forgettingWindow: number
) => {
  if (note.importance === 'high') {
    return 0
  }
  const multiplier = baselineProgressMultipliers[note.importance] ?? 0.3
  const scoreDrag = clamp(Math.round((100 - importanceScore) * multiplier), 0, 92)
  const ageDays = computeNoteAgeInDays(note)
  const curveScale = 0.6 + importanceScore / 180
  const effectiveWindow = Math.max(3, forgettingWindow * curveScale)
  const curveProgress = clamp(Math.round((1 - Math.exp(-ageDays / effectiveWindow)) * 100), 0, 97)
  return clamp(Math.max(scoreDrag, curveProgress), 0, 97)
}

const calculateAcceleratedProgress = (
  importance: ImportanceLevel,
  currentProgress: number,
  importanceScore: number
) => {
  const thresholds = resolveProgressThresholds(importance)
  const currentLevel = calculateFadeLevelFromProgress(importance, currentProgress)
  const nextIndex = Math.min(currentLevel, thresholds.length - 1)
  const baseTarget = thresholds[nextIndex]
  const bonus = Math.round((100 - importanceScore) * 0.12)
  return clamp(Math.max(currentProgress, baseTarget + bonus), baseTarget, 96)
}

const remainingDaysByStage = (
  importance: ImportanceLevel,
  forgettingWindow: number,
  fadeLevel: FadeLevel,
  progress: number
) => {
  if (importance === 'high') {
    const highStageWindows = [
      MAX_FORGET_WINDOW,
      BASE_FORGET_WINDOW * 6,
      BASE_FORGET_WINDOW * 4,
      BASE_FORGET_WINDOW * 2,
      BASE_FORGET_WINDOW,
    ] as const
    return highStageWindows[fadeLevel] ?? BASE_FORGET_WINDOW * 2
  }

  const stageFactors = [1, 0.82, 0.58, 0.36, 0.18]
  const stageFactor = stageFactors[fadeLevel] ?? 0.18
  const dynamicFactor = Math.max(0.35, 1 - progress / 130)
  const estimate = Math.round(forgettingWindow * stageFactor * dynamicFactor)
  return Math.max(1, estimate)
}

const computeEvaluation = (note: NoteRecord, options: NoteDashboardOptions = {}) => {
  if (note.aiEvaluation) {
    const evaluation = note.aiEvaluation
    const importance = evaluation.importance ?? note.importance ?? 'medium'
    const action = evaluation.suggestedAction
    const importanceScoreFromAI = IMPORTANCE_METADATA[importance]?.defaultScore ?? 60
    const baseWindow =
      importance === 'high'
        ? MAX_FORGET_WINDOW
        : (defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW)

    const windowMultiplier = action === 'retain' ? 1.6 : action === 'discard' ? 0.6 : 1

    const forgettingWindow =
      importance === 'high'
        ? MAX_FORGET_WINDOW
        : clamp(Math.round(baseWindow * windowMultiplier), 3, MAX_FORGET_WINDOW)

    const baseDecay = defaultDecayRates[importance] ?? defaultDecayRates.medium
    const decayAdjust = action === 'retain' ? -8 : action === 'discard' ? 12 : 0
    const decayRate = clamp(Math.round(baseDecay + decayAdjust), 0, 100)

    return {
      importanceScore: importanceScoreFromAI,
      decayRate,
      forgettingWindow,
    }
  }

  if (options.evaluateNote) {
    const evaluation = options.evaluateNote(note) ?? {}
    const importance = note.importance ?? 'medium'
    const fallbackWindow =
      importance === 'high'
        ? MAX_FORGET_WINDOW
        : (defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW)

    return {
      importanceScore: clamp(Math.round(evaluation.importanceScore ?? 0), 0, 100),
      decayRate: evaluation.decayRate ?? defaultDecayRates[importance],
      forgettingWindow: Math.max(1, Math.round(evaluation.forgettingWindow ?? fallbackWindow)),
    }
  }

  const importance = note.importance
  const weight = importanceWeights[importance] ?? 0.7
  const contentBoost = Math.min(25, Math.round((note.content?.length ?? 0) / 80))
  const structureBonus = Math.min(12, Math.round((note.content?.match(/\n/g)?.length ?? 0) * 3.2))
  const titleBonus = Math.min(10, Math.round((note.title?.length ?? 0) / 12))
  const agePenalty = Math.min(30, Math.round(computeNoteAgeInDays(note) * 1.6))
  const collapsePenalty = note.isCollapsed ? 6 : 0

  const rawScore =
    weight * 55 + contentBoost + structureBonus + titleBonus - agePenalty - collapsePenalty
  const importanceScore = clamp(Math.round(rawScore), 10, 100)
  const decayRate = defaultDecayRates[importance] ?? defaultDecayRates.medium

  if (importance === 'high') {
    return {
      importanceScore,
      decayRate,
      forgettingWindow: MAX_FORGET_WINDOW,
    }
  }

  const baseWindow = defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW
  const windowScale = 1 + importanceScore / 140
  const forgettingWindow = Math.max(3, Math.round(baseWindow * windowScale))

  return {
    importanceScore,
    decayRate,
    forgettingWindow,
  }
}

const applyEvaluation = (
  note: NoteRecord,
  options: NoteDashboardOptions = {},
  context: {
    accelerated?: boolean
    preserveProgress?: boolean
    forceProgressReset?: boolean
  } = {}
) => {
  const importanceFromEvaluation = note.aiEvaluation?.importance ?? note.importance
  const resolvedImportance = importanceFromEvaluation ?? 'medium'
  const evaluation = computeEvaluation({ ...note, importance: resolvedImportance }, options)
  const importanceScore = evaluation.importanceScore
  const decayRate = evaluation.decayRate
  const forgettingWindow = evaluation.forgettingWindow

  const accelerated = context.accelerated ?? false
  const preserveProgress = context.preserveProgress ?? false
  const forceProgressReset = context.forceProgressReset ?? false

  let fadeLevel = (note.fadeLevel ?? 0) as FadeLevel
  let progress = clamp(Math.round(note.forgettingProgress ?? 0), 0, 100)
  let daysUntilForgotten =
    resolvedImportance === 'high'
      ? MAX_FORGET_WINDOW
      : (note.daysUntilForgotten ?? forgettingWindow)

  if (forceProgressReset) {
    fadeLevel = 0 as FadeLevel
    progress = 0
    daysUntilForgotten = resolvedImportance === 'high' ? MAX_FORGET_WINDOW : forgettingWindow
  } else {
    const baselineProgress = computeBaselineProgress(
      { ...note, importance: resolvedImportance },
      importanceScore,
      forgettingWindow
    )
    const mergedProgress = preserveProgress
      ? Math.max(progress, baselineProgress)
      : baselineProgress

    if (accelerated) {
      progress = calculateAcceleratedProgress(resolvedImportance, mergedProgress, importanceScore)
    } else {
      progress = mergedProgress
    }

    fadeLevel = calculateFadeLevelFromProgress(resolvedImportance, progress)

    if (resolvedImportance === 'high' && !accelerated) {
      fadeLevel = Math.min(fadeLevel, 1) as FadeLevel
      progress = 0
      daysUntilForgotten = MAX_FORGET_WINDOW
    } else {
      if (accelerated && resolvedImportance === 'high') {
        fadeLevel = Math.min(fadeLevel, 2) as FadeLevel
      }

      daysUntilForgotten = remainingDaysByStage(
        resolvedImportance,
        forgettingWindow,
        fadeLevel,
        progress
      )
    }
  }

  return {
    ...note,
    importance: resolvedImportance,
    fadeLevel,
    forgettingProgress: clamp(Math.round(progress), 0, 100),
    daysUntilForgotten,
    importanceScore,
    decayRate,
  }
}

const parseJsonColumn = <T>(value: string | null): T | null => {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn('[nightly] Failed to parse JSON column', error)
    return null
  }
}

const mapRowToNote = (row: DbNoteRow): NoteRecord =>
  ({
    id: row.id,
    title: row.title,
    content: row.content,
    description: row.description ?? undefined,
    icon: row.icon ?? '📝',
    importance: row.importance,
    fadeLevel: row.fade_level as FadeLevel,
    forgettingProgress: row.forgetting_progress,
    daysUntilForgotten: row.days_until_forgotten ?? undefined,
    importanceScore: row.importance_score ?? undefined,
    decayRate: row.decay_rate ?? undefined,
    isCollapsed: !!row.is_collapsed,
    lastAccessed: (row.last_accessed_at ?? row.updated_at ?? row.created_at).toISOString(),
    date: row.date_label ?? row.created_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    restoredAt: row.restored_at ? row.restored_at.toISOString() : null,
    aiEvaluation: parseJsonColumn<NoteAIEvaluation>(row.ai_evaluation),
    aiCompression: null,
  }) as NoteRecord

const needsUpdate = (original: NoteRecord, next: NoteRecord) =>
  original.fadeLevel !== next.fadeLevel ||
  original.forgettingProgress !== next.forgettingProgress ||
  original.daysUntilForgotten !== next.daysUntilForgotten ||
  original.importanceScore !== next.importanceScore ||
  original.decayRate !== next.decayRate

export const runNightlyRecalculation = async () => {
  await ensureAuthSchema()
  const db = useMysql()
  const [rows] = await db.query<DbNoteRow[]>(
    'SELECT id, user_id, title, content, description, icon, importance, fade_level, forgetting_progress, days_until_forgotten, importance_score, decay_rate, is_collapsed, last_accessed_at, restored_at, date_label, created_at, updated_at, ai_evaluation FROM notes'
  )

  if (!rows.length) {
    return { processed: 0, updated: 0 }
  }

  let updated = 0
  for (const row of rows) {
    const note = mapRowToNote(row)
    const evaluated = applyEvaluation(note, undefined, {
      preserveProgress: true,
    })
    if (!needsUpdate(note, evaluated)) {
      continue
    }

    await db.execute(
      `UPDATE notes
         SET fade_level = ?,
             forgetting_progress = ?,
             days_until_forgotten = ?,
             importance_score = ?,
             decay_rate = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      [
        evaluated.fadeLevel,
        evaluated.forgettingProgress,
        evaluated.daysUntilForgotten ?? null,
        evaluated.importanceScore ?? null,
        evaluated.decayRate ?? null,
        row.id,
      ]
    )
    updated += 1
  }

  console.info(`[nightly] Processed ${rows.length} notes, refreshed ${updated}`)
  return { processed: rows.length, updated }
}
