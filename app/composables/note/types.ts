import type { NoteBase, NoteFadeLevel, NoteImportanceLevel } from '../shared/noteTypes'

export type ImportanceLevel = NoteImportanceLevel

export type FadeLevel = NoteFadeLevel

export interface NoteAIUsageSummary {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export type NoteAISuggestedAction = 'retain' | 'compress' | 'discard'

export interface NoteAIEvaluation {
  id: string
  importance: ImportanceLevel
  confidence: number
  rationale: string
  suggestedAction: NoteAISuggestedAction
  usage?: NoteAIUsageSummary
  generatedAt: string
}

export interface NoteAICompression {
  id: string
  summary: string
  bullets: string[]
  retentionScore: number
  tokensSaved?: number
  usage?: NoteAIUsageSummary
  generatedAt: string
}

export interface NoteRecord extends NoteBase {
  id: number
  content: string
  description?: string
  lastAccessed: string
  icon: string
  isCollapsed: boolean
  restoredAt?: string | null
  aiEvaluation?: NoteAIEvaluation | null
  aiCompression?: NoteAICompression | null
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
  aiEvaluation?: NoteAIEvaluation | null
  aiCompression?: NoteAICompression | null
}
