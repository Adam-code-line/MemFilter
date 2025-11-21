import type { ComputedRef } from 'vue'
import type { NoteRecord } from '../note/types'

export type MemoryBucket = 'fresh' | 'fading' | 'archived'

type ActionVariant = 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'

export interface DetailActionConfig {
  label: string
  icon?: string
  color?: string
  variant?: ActionVariant
  tooltip?: string
}

export type DetailActionMap = {
  restore: DetailActionConfig
  accelerate: DetailActionConfig
  forget: DetailActionConfig
}

export interface MemorySectionConfig {
  key: MemoryBucket
  title?: string
  accent?: string
}

export interface DetailStatus {
  label: string
  color: string
}

interface BuildActionsOptions {
  includeOpenNote?: boolean
}

export const resolveMemoryBucket = (note: NoteRecord | null): MemoryBucket | null => {
  if (!note) {
    return null
  }

  const fadeLevel = note.fadeLevel ?? 0

  if (fadeLevel >= 4 || note.isCollapsed) {
    return 'archived'
  }

  if (fadeLevel >= 1) {
    return 'fading'
  }

  if (note.importance !== 'high' && (note.forgettingProgress ?? 0) > 50) {
    return 'fading'
  }

  return 'fresh'
}

export const buildMemoryDetailStatus = (
  note: NoteRecord | null,
  sectionSource: ComputedRef<MemorySectionConfig[]>,
  sectionDefaults: MemorySectionConfig[]
): DetailStatus | null => {
  if (!note) {
    return null
  }

  const bucket = resolveMemoryBucket(note)
  if (!bucket) {
    return null
  }

  const defaults = sectionDefaults.find((item) => item.key === bucket)
  const config = sectionSource.value.find((item) => item.key === bucket)

  return {
    label: config?.title ?? defaults?.title ?? '',
    color: config?.accent ?? defaults?.accent ?? 'primary',
  }
}

export const buildMemoryDetailActions = (
  note: NoteRecord | null,
  actionsConfig: DetailActionMap,
  options: BuildActionsOptions = {}
) => {
  if (!note) {
    return [] as Array<{ key: string } & DetailActionConfig>
  }

  const actions: Array<{ key: string } & DetailActionConfig> = []

  if ((note.fadeLevel ?? 0) > 0 || note.isCollapsed) {
    actions.push({
      key: 'restore',
      ...actionsConfig.restore,
    })
  }

  if ((note.forgettingProgress ?? 0) < 100 && (note.fadeLevel ?? 0) < 4) {
    actions.push({
      key: 'accelerate',
      ...actionsConfig.accelerate,
    })
  }

  if ((note.fadeLevel ?? 0) < 4) {
    actions.push({
      key: 'forget',
      ...actionsConfig.forget,
    })
  }

  if (options.includeOpenNote) {
    actions.push({
      key: 'open-note',
      label: '在笔记中编辑',
      icon: 'i-lucide-square-pen',
      color: 'primary',
      variant: 'solid',
    })
  }

  return actions
}
