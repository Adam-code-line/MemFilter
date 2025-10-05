export type ImportanceLevel = 'high' | 'medium' | 'low' | 'noise'

export type FadeLevel = 0 | 1 | 2 | 3 | 4

export interface NoteRecord {
  id: number
  title: string
  content: string
  date: string
  lastAccessed: string
  icon: string
  importance: ImportanceLevel
  importanceScore: number
  fadeLevel: FadeLevel
  forgettingProgress: number
  daysUntilForgotten?: number
  isCollapsed: boolean
}

export interface NoteEditorOptions {
  initialTitle?: string
  initialContent?: string
  fadeLevel?: number
  placeholders?: {
    default: string
    fading?: string
    strongFading?: string
  }
  statusLabels?: {
    saved?: string
    unsaved?: string
  }
  aiBadgePrefix?: string
}

export interface NoteDashboardOptions {
  initialNotes?: NoteRecord[]
}

export interface NoteSavePayload {
  title: string
  content: string
  importance: ImportanceLevel
}
