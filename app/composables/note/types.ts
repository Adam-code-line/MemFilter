import type { NoteBase, NoteFadeLevel, NoteImportanceLevel } from '../shared/noteTypes'

export type ImportanceLevel = NoteImportanceLevel

export type FadeLevel = NoteFadeLevel

export interface NoteRecord extends NoteBase {
  id: number
  content: string
  description?: string
  lastAccessed: string
  icon: string
  isCollapsed: boolean
}

export interface NoteEditorOptions {
  initialTitle?: string
  initialContent?: string
  initialDescription?: string
  initialImportance?: ImportanceLevel
  fadeLevel?: number
  placeholders?: {
    default: string
    fading?: string
    strongFading?: string
    description?: string
  }
  statusLabels?: {
    saved?: string
    unsaved?: string
  }
}

export interface NoteDashboardOptions {
  initialNotes?: NoteRecord[]
  evaluateNote?: (record: NoteRecord) => {
    importanceScore: number
    decayRate?: number
    forgettingWindow?: number
  }
}

export interface NoteSavePayload {
  title: string
  content: string
  description?: string
  importance: ImportanceLevel
}
