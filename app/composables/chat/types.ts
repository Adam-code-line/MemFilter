export interface AIChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  createdAt: string
  status?: 'streaming' | 'complete' | 'error'
}

export interface SendAIChatPayload {
  messages: Array<Pick<AIChatMessage, 'role' | 'content'> & { id?: string }>
  model?: string
  temperature?: number
}

export interface AIChatResponse {
  id: string
  role: 'assistant'
  content: string
  finishReason?: string | null
  metadata?: Record<string, unknown>
}
