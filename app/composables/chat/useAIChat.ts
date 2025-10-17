import { nanoid } from 'nanoid'
import type { AIChatMessage, AIChatResponse, SendAIChatPayload } from '~/app/composables/chat/types'

interface UseAIChatOptions {
  systemPrompt?: string
  defaultModel?: string
  apiPath?: string
  temperature?: number
}

export const useAIChat = (options: UseAIChatOptions = {}) => {
  const {
    systemPrompt,
    defaultModel = 'glm-4.5',
    apiPath = '/api/chat/complete',
    temperature = 0.6
  } = options

  const input = ref('')
  const activeModel = ref<string | null>(defaultModel)
  const initialMessages: AIChatMessage[] = systemPrompt
    ? [{
      id: nanoid(),
      role: 'system',
      content: systemPrompt,
      createdAt: new Date().toISOString(),
      status: 'complete'
    }]
    : []

  const messages = ref<AIChatMessage[]>(initialMessages)
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
      content: '正在思考...',
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

      const response = await $fetch<AIChatResponse>(apiPath, {
        method: 'POST',
        body: payload
      })

      updateMessage(placeholderId, {
        id: response.id,
        content: response.content,
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
    messages.value = systemPrompt
      ? [{
        id: nanoid(),
        role: 'system',
        content: systemPrompt,
        createdAt: new Date().toISOString(),
        status: 'complete'
      }]
      : []
    input.value = ''
  }

  return {
    input,
    messages,
    isWaiting,
    activeModel,
    errorMessage,
    formattedPayload,
    sendMessage,
    resetConversation
  }
}
