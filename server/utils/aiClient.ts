import { nanoid } from 'nanoid'

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  thinking?: boolean
}

export interface ChatCompletionResult {
  id: string
  content: string
  finishReason?: string | null
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

const DEFAULT_MODEL = 'glm-4.5-Flash'
const DEFAULT_TEMPERATURE = 0.3
const DEFAULT_MAX_TOKENS = 800

const normalizeBaseUrl = (input?: string | null) =>
  (input || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '')

const buildPayload = (messages: ChatMessagePayload[], options: ChatCompletionOptions = {}) => ({
  model: options.model || DEFAULT_MODEL,
  temperature: typeof options.temperature === 'number' ? options.temperature : DEFAULT_TEMPERATURE,
  max_tokens: typeof options.maxTokens === 'number' ? options.maxTokens : DEFAULT_MAX_TOKENS,
  stream: false,
  messages,
  ...(options.thinking ? { thinking: { type: 'enabled' as const } } : {})
})

const parseUsage = (value: any) => {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const promptTokens = typeof value.prompt_tokens === 'number' ? value.prompt_tokens : undefined
  const completionTokens = typeof value.completion_tokens === 'number' ? value.completion_tokens : undefined
  const totalTokens = typeof value.total_tokens === 'number' ? value.total_tokens : undefined

  if (promptTokens || completionTokens || totalTokens) {
    return { promptTokens, completionTokens, totalTokens }
  }

  return undefined
}

export class MissingAIConfigurationError extends Error {
  constructor() {
    super('AI configuration is missing. Please provide AI_API_KEY in runtime config.')
  }
}

export const callChatCompletion = async (
  messages: ChatMessagePayload[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> => {
  const runtime = useRuntimeConfig()
  const baseUrl = normalizeBaseUrl(runtime.ai?.baseUrl)
  const apiKey = runtime.ai?.apiKey

  if (!apiKey) {
    throw new MissingAIConfigurationError()
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(buildPayload(messages, options))
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw createError({
      statusCode: response.status,
      statusMessage: text || 'AI provider request failed'
    })
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content ?? ''
  const finishReason = json?.choices?.[0]?.finish_reason ?? null

  return {
    id: json?.id ?? nanoid(),
    content: typeof content === 'string' ? content : JSON.stringify(content),
    finishReason,
    usage: parseUsage(json?.usage)
  }
}
