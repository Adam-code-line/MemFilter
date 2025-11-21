import { computed, unref, type MaybeRef } from 'vue'
import { IMPORTANCE_METADATA } from '../note-memory/importanceMetadata'
import type { ImportanceLevel } from './types'

interface AIEvaluableLike {
  aiEvaluation?: { importance?: ImportanceLevel } | null
  importance?: ImportanceLevel
}

const resolveImportanceLevel = (
  note: AIEvaluableLike | null | undefined
): ImportanceLevel | null => {
  if (!note?.aiEvaluation?.importance) {
    return null
  }
  return note.aiEvaluation.importance
}

export const getAIImportanceScore = (note: AIEvaluableLike | null | undefined): number | null => {
  const level = resolveImportanceLevel(note)
  if (!level) {
    return null
  }
  const entry = IMPORTANCE_METADATA[level]
  return entry?.defaultScore ?? null
}

export const useAIImportanceScore = <T extends AIEvaluableLike | null | undefined>(
  note: MaybeRef<T>
) => {
  return computed(() => getAIImportanceScore(unref(note)))
}
