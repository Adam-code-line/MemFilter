export type NoteImportanceLevel = 'high' | 'medium' | 'low' | 'noise'

export type NoteFadeLevel = 0 | 1 | 2 | 3 | 4

export interface NoteLifecycleMeta {
  importance: NoteImportanceLevel
  fadeLevel: NoteFadeLevel
  forgettingProgress: number
  daysUntilForgotten?: number
  importanceScore?: number
  decayRate?: number
}

export interface NoteIdentity {
  id: string | number
  title: string
  date: string
  icon?: string
  lastAccessed?: string
  isCollapsed?: boolean
  createdAt?: string
  updatedAt?: string
}

export type NoteBase = NoteIdentity & NoteLifecycleMeta
