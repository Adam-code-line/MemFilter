import { useRequestFetch } from '#app'
import type { MemoryRawItem, MemorySource } from '~/composables/services/useIngestionService'

interface CreateSourcePayload {
  name: string
  type: string
  config?: Record<string, unknown>
}

interface UpdateSourcePayload {
  name?: string
  config?: Record<string, unknown>
  isActive?: boolean
}

interface PromotePayload {
  note: {
    title?: string
    content: string
    importance?: 'high' | 'medium' | 'low' | 'noise'
  }
}

export const useIngestionApi = () => {
  const request = useRequestFetch()

  const listSources = () => request<MemorySource[]>('/api/ingestion/sources', {
    method: 'GET'
  })

  const createSource = (payload: CreateSourcePayload) => request<MemorySource>('/api/ingestion/sources', {
    method: 'POST',
    body: payload
  })

  const updateSource = (id: string, payload: UpdateSourcePayload) => request<MemorySource>(`/api/ingestion/sources/${id}`, {
    method: 'PUT',
    body: payload
  })

  const syncSource = (id: string, payload?: { keywords?: string[]; limit?: number }) => request<{ inserted: number; total: number }>(`/api/ingestion/sources/${id}/sync`, {
    method: 'POST',
    body: payload
  })

  const listItems = (status?: 'pending' | 'processed' | 'failed') => request<MemoryRawItem[]>('/api/ingestion/items', {
    method: 'GET',
    query: status ? { status } : undefined
  })

  const promoteItem = (id: number, payload: PromotePayload) => request(`/api/ingestion/items/${id}/promote`, {
    method: 'POST',
    body: payload
  })

  return {
    listSources,
    createSource,
    updateSource,
    syncSource,
    listItems,
    promoteItem
  }
}
