import { useRequestFetch } from '#app'
import type { NoteAIEvaluation, NoteAICompression, NoteRecord } from './types'

interface PersistPayload {
  title: string
  content: string
  description?: string
  icon?: string
  importance: string
  fadeLevel: number
  forgettingProgress: number
  daysUntilForgotten?: number | null
  importanceScore?: number | null
  decayRate?: number | null
  isCollapsed?: boolean
  lastAccessed?: string | null
  date?: string | null
  aiEvaluation?: NoteAIEvaluation | null
  aiCompression?: NoteAICompression | null
}

export const useNotesApi = () => {
  const request = useRequestFetch()

  const list = () => request<NoteRecord[]>('/api/notes', {
    method: 'GET'
  })

  const create = (payload: PersistPayload) => request<NoteRecord>('/api/notes', {
    method: 'POST',
    body: payload
  })

  const update = (id: number, payload: PersistPayload) => request<NoteRecord>(`/api/notes/${id}`, {
    method: 'PUT',
    body: payload
  })

  const remove = (id: number) => request<void>(`/api/notes/${id}`, {
    method: 'DELETE'
  })

  return {
    list,
    create,
    update,
    remove
  }
}
