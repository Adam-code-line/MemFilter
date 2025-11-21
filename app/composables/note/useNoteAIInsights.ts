import { useRequestFetch } from '#app'
import { ref, shallowRef, type Ref } from 'vue'
import type { NoteAIEvaluation, NoteAICompression } from './types'

interface NoteEvaluationMeta {
  noteId?: string | number | null
  source?: 'ingestion' | 'manual' | 'imported'
  importanceHint?: 'high' | 'medium' | 'low' | 'noise'
  usageFrequencyPerWeek?: number
  createdAt?: string | null
  tags?: string[]
}

interface NoteEvaluationPayload {
  text: string
  meta?: NoteEvaluationMeta
  options?: {
    temperature?: number
    thinking?: boolean
  }
}

export type NoteEvaluationResult = NoteAIEvaluation

interface NoteCompressionMeta {
  noteId?: string | number | null
  title?: string
  importance?: 'high' | 'medium' | 'low' | 'noise'
  createdAt?: string | null
  tags?: string[]
}

interface NoteCompressionPayload {
  text: string
  meta?: NoteCompressionMeta
  options?: {
    targetLength?: number
    temperature?: number
    thinking?: boolean
  }
}

export type NoteCompressionResult = NoteAICompression

const normalizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return '未知错误'
  }
}

export const useNoteAIInsights = () => {
  const request = useRequestFetch()
  const evaluating = ref(false)
  const evaluationError = ref<string | null>(null)
  const evaluationResult = shallowRef<NoteEvaluationResult | null>(null)

  const compressing = ref(false)
  const compressionError = ref<string | null>(null)
  const compressionResult = shallowRef<NoteCompressionResult | null>(null)

  const evaluateNote = async (
    payload: NoteEvaluationPayload
  ): Promise<NoteEvaluationResult | null> => {
    const content = payload.text?.trim()
    if (!content) {
      evaluationError.value = '请输入需要评估的内容。'
      return null
    }

    evaluating.value = true
    evaluationError.value = null

    try {
      const response = await request<{ items: NoteEvaluationResult[] }>('/api/ai/evaluate', {
        method: 'POST',
        body: {
          text: content,
          meta: payload.meta,
          options: payload.options,
        },
      })

      const base = Array.isArray(response?.items) ? (response.items[0] ?? null) : null
      const normalized = base
        ? { ...base, generatedAt: base.generatedAt ?? new Date().toISOString() }
        : null
      evaluationResult.value = normalized
      return normalized
    } catch (error) {
      const message = normalizeError(error)
      evaluationError.value = message
      throw error
    } finally {
      evaluating.value = false
    }
  }

  const compressNote = async (
    payload: NoteCompressionPayload
  ): Promise<NoteCompressionResult | null> => {
    const content = payload.text?.trim()
    if (!content) {
      compressionError.value = '请输入需要压缩的内容。'
      return null
    }

    compressing.value = true
    compressionError.value = null

    try {
      const response = await request<{ items: NoteCompressionResult[] }>('/api/ai/compress', {
        method: 'POST',
        body: {
          text: content,
          meta: payload.meta,
          options: payload.options,
        },
      })

      const base = Array.isArray(response?.items) ? (response.items[0] ?? null) : null
      const normalized = base
        ? { ...base, generatedAt: base.generatedAt ?? new Date().toISOString() }
        : null
      compressionResult.value = normalized
      return normalized
    } catch (error) {
      const message = normalizeError(error)
      compressionError.value = message
      throw error
    } finally {
      compressing.value = false
    }
  }

  const resetEvaluation = () => {
    evaluating.value = false
    evaluationError.value = null
    evaluationResult.value = null
  }

  const resetCompression = () => {
    compressing.value = false
    compressionError.value = null
    compressionResult.value = null
  }

  const resetAll = () => {
    resetEvaluation()
    resetCompression()
  }

  return {
    evaluating: evaluating as Ref<boolean>,
    evaluationError: evaluationError as Ref<string | null>,
    evaluationResult: evaluationResult as Ref<NoteEvaluationResult | null>,
    compressing: compressing as Ref<boolean>,
    compressionError: compressionError as Ref<string | null>,
    compressionResult: compressionResult as Ref<NoteCompressionResult | null>,
    evaluateNote,
    compressNote,
    resetEvaluation,
    resetCompression,
    resetAll,
  }
}
