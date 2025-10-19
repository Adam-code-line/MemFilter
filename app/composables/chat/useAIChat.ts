import { nanoid } from 'nanoid'
import type { AIChatMessage, SendAIChatPayload } from '~/composables/chat/types'

interface UseAIChatOptions {
  systemPrompt?: string
  defaultModel?: string
  apiPath?: string
  temperature?: number
}

interface StreamEventState {
  id?: string | null
  delta?: string
  content?: string
  done?: boolean
  finishReason?: string | null
  error?: string
  message?: string
}

const extractSseEvents = (buffer: string) => {
  const events: string[] = []
  let remaining = buffer

  while (true) {
    const boundary = remaining.indexOf('\n\n')
    if (boundary === -1) {
      break
    }

    const chunk = remaining.slice(0, boundary)
    remaining = remaining.slice(boundary + 2)

    const dataLines = chunk
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))

    if (!dataLines.length) {
      continue
    }

    const payload = dataLines
      .map(line => line.slice(5).trim())
      .join('\n')

    if (payload) {
      events.push(payload)
    }
  }

  return { events, buffer: remaining }
}

const normalizeStreamDelta = (raw: string): StreamEventState | null => {
  if (!raw || raw === '[DONE]') {
    return { done: true }
  }

  try {
    const parsed = JSON.parse(raw) as StreamEventState & {
      choices?: Array<{
        delta?: any
        message?: any
        finish_reason?: string | null
      }>
    }

    if (parsed.error) {
      return {
        error: parsed.error,
        message: parsed.message ?? 'AI provider returned an error.'
      }
    }

    const choice = parsed.choices?.[0]
    const delta = choice?.delta ?? {}

    const extractText = (source: any): string => {
      if (typeof source === 'string') {
        return source
      }
      if (Array.isArray(source)) {
        return source
          .map(item => {
            if (typeof item === 'string') {
              return item
            }
            if (item && typeof item === 'object') {
              if (typeof item.text === 'string') {
                return item.text
              }
              if (typeof item.content === 'string') {
                return item.content
              }
            }
            return ''
          })
          .join('')
      }
      if (source && typeof source === 'object' && typeof source.text === 'string') {
        return source.text
      }
      return ''
    }

    const text = extractText(delta.content ?? choice?.message?.content ?? '')

    const finishReason = choice?.finish_reason ?? (typeof (parsed as any).finishReason === 'string' ? (parsed as any).finishReason : null)

    return {
      id: parsed.id ?? null,
      delta: text,
      done: Boolean(parsed.done ?? delta?.done ?? false),
      finishReason,
      content: typeof parsed.content === 'string' ? parsed.content : (typeof (parsed as any).content === 'string' ? (parsed as any).content : undefined)
    }
  } catch (error) {
    console.warn('[useAIChat] 无法解析 AI 流式片段', error, raw)
    return null
  }
}

export const useAIChat = (options: UseAIChatOptions = {}) => {
  const {
    systemPrompt,
    defaultModel = 'glm-4.5',
    apiPath = '/api/chat/complete',
    temperature = 0.6
  } = options

  const createSystemMessage = (): AIChatMessage | null => {
    if (!systemPrompt) {
      return null
    }
    return {
      id: nanoid(),
      role: 'system',
      content: systemPrompt,
      createdAt: new Date().toISOString(),
      status: 'complete'
    }
  }

  const buildInitialMessages = () => {
    const systemMessage = createSystemMessage()
    return systemMessage ? [systemMessage] : []
  }

  const input = ref('')
  const activeModel = ref<string | null>(defaultModel)
  const messages = ref<AIChatMessage[]>(buildInitialMessages())
  const isWaiting = ref(false)
  const errorMessage = ref<string | null>(null)

  const trimmedInput = computed(() => input.value.trim())

  const formattedPayload = computed<SendAIChatPayload>(() => ({
    messages: messages.value
      .filter(message => message.role !== 'assistant' || message.content.trim().length)
      .map(({ id: _id, ...entry }) => entry),
    model: activeModel.value ?? undefined,
    temperature
  }))

  const appendMessage = (message: AIChatMessage) => {
    messages.value = [...messages.value, message]
  }

  const updateMessage = (id: string, patch: Partial<AIChatMessage>) => {
    messages.value = messages.value.map(message => (
      message.id === id ? { ...message, ...patch } : message
    ))
  }

  const replaceMessages = (nextMessages: AIChatMessage[]) => {
    messages.value = nextMessages.map(entry => ({ ...entry }))
  }

  const getInitialMessages = () => buildInitialMessages().map(entry => ({ ...entry }))

  const streamCompletion = async (payload: SendAIChatPayload, placeholderId: string) => {
    const response = await fetch(apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || 'AI 服务请求失败')
    }

    if (!response.body) {
      throw new Error('AI 流式输出不可用')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let aggregated = ''
    let responseId: string | null = null
    let finishReason: string | null = null

    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const { events, buffer: rest } = extractSseEvents(buffer)
      buffer = rest

      for (const event of events) {
        const normalized = normalizeStreamDelta(event)
        if (!normalized) {
          continue
        }

        if (normalized.error) {
          throw new Error(normalized.message ?? 'AI provider error')
        }

        if (normalized.id) {
          responseId = normalized.id
        }

        if (typeof normalized.delta === 'string' && normalized.delta.length) {
          aggregated += normalized.delta
          updateMessage(placeholderId, {
            content: aggregated,
            status: normalized.done ? 'complete' : 'streaming'
          })
        }

        if (normalized.done) {
          finishReason = normalized.finishReason ?? finishReason
          if (typeof normalized.content === 'string' && normalized.content.length) {
            aggregated = normalized.content
            updateMessage(placeholderId, {
              content: aggregated
            })
          }
        }
      }
    }

    return {
      id: responseId,
      content: aggregated,
      finishReason
    }
  }

  const sendMessage = async () => {
    if (!trimmedInput.value || isWaiting.value) {
      return
    }

    errorMessage.value = null

    const history = formattedPayload.value.messages.slice()

    const userMessage: AIChatMessage = {
      id: nanoid(),
      role: 'user',
      content: trimmedInput.value,
      createdAt: new Date().toISOString(),
      status: 'complete'
    }

    appendMessage(userMessage)
    input.value = ''

    const placeholderId = nanoid()
    appendMessage({
      id: placeholderId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      status: 'streaming'
    })

    isWaiting.value = true

    try {
      const payload: SendAIChatPayload = {
        ...formattedPayload.value,
        messages: [
          ...history,
          { role: 'user', content: userMessage.content }
        ]
      }

      const { id: responseId, content } = await streamCompletion(payload, placeholderId)

      updateMessage(placeholderId, {
        id: responseId ?? placeholderId,
        content,
        status: 'complete',
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('[useAIChat] 请求失败', error)
      errorMessage.value = (error as Error).message ?? 'AI 服务暂时不可用'
      updateMessage(placeholderId, {
        status: 'error',
        content: '请求失败，请稍后再试。'
      })
    } finally {
      isWaiting.value = false
    }
  }

  const resetConversation = () => {
    messages.value = buildInitialMessages()
    input.value = ''
  }

  return {
    input,
    messages,
    isWaiting,
    activeModel,
    errorMessage,
    formattedPayload,
    appendMessage,
    updateMessage,
    replaceMessages,
    getInitialMessages,
    sendMessage,
    resetConversation
  }
}
