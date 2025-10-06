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
  fadeLevel: FadeLevel
  forgettingProgress: number
  daysUntilForgotten?: number
  isCollapsed: boolean
  importanceScore?: number
  decayRate?: number
}

export interface NoteEditorOptions {
  initialTitle?: string
  initialContent?: string
  initialImportance?: ImportanceLevel
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
  importance: ImportanceLevel
}
