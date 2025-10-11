import type { DropdownMenuItem } from '@nuxt/ui'
import type { NoteBase, NoteFadeLevel, NoteImportanceLevel } from '../shared/noteTypes'

export type MemoryImportance = NoteImportanceLevel
export type MemoryFadeLevel = NoteFadeLevel

export interface MemoryNoteLike extends Partial<NoteBase> {
  id?: string | number
  title: string
  snippet: string
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

export interface MemoryActionFactory {
  contextMenuItems: DropdownMenuItem[][]
}
