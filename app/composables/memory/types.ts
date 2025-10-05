import type { DropdownMenuItem } from '@nuxt/ui'

export type MemoryImportance = 'high' | 'medium' | 'low' | 'noise'
export type MemoryFadeLevel = 0 | 1 | 2 | 3 | 4

export interface MemoryNoteLike {
  id?: string
  title: string
  snippet: string
  date: string
  icon?: string
  importance?: MemoryImportance
  fadeLevel?: MemoryFadeLevel
  importanceScore?: number
  forgettingProgress?: number
  daysUntilForgotten?: number
  lastAccessed?: string
  isCollapsed?: boolean
  isSelected?: boolean
}

export interface MemoryImportanceConfig {
  label: string
  color: string
}

export interface MemoryMetaResult {
  importanceLabel: string
  importanceColor: string
  isForgetting: boolean
  forgettingTooltip: string
  forgettingIcon: string
  forgettingStatus: string
  displayTitle: string
  displaySnippet: string
  displayIcon: string
  displayDate: string
}

export interface MemoryCardVisualsResult {
  cardStyle: Record<string, string | number>
}

export interface MemoryItemVisualsResult {
  itemStyle: Record<string, string | number>
}

export interface MemoryActionFactory {
  contextMenuItems: DropdownMenuItem[][]
}
