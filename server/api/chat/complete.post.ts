import { nanoid } from 'nanoid'
import type { AIChatResponse, SendAIChatPayload } from '~/app/composables/chat/types'

interface ExternalChatCompletionResponse {
  id: string
  choices: Array<{
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason?: string | null
  }>
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SendAIChatPayload>(event)

  if (!body?.messages?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'messages payload is required'
    })
  }

  const runtime = useRuntimeConfig()
  const temperature = body.temperature ?? Number(runtime.ai?.temperature ?? 0.6)
  const model = body.model ?? runtime.ai?.defaultModel ?? 'glm-4.5'
  const baseUrl = (runtime.ai?.baseUrl || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '')

  if (!runtime.ai?.apiKey) {
    const userMessage = body.messages.at(-1)?.content ?? ''
    const mockResponse: AIChatResponse = {
      id: nanoid(),
      role: 'assistant',
      content: `【离线演示】您刚刚说：${userMessage}`,
      finishReason: 'mock'
    }
    return mockResponse
  }

  try {
    const response = await $fetch<ExternalChatCompletionResponse>(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runtime.ai.apiKey}`
      },
      body: {
        model,
        temperature,
        messages: body.messages
          .filter(message => typeof message.content === 'string' && message.content.trim().length > 0)
          .map(message => ({
            role: message.role,
            content: message.content
          })),
        stream: false
      }
    })

    const choice = response.choices[0]

    if (!choice?.message?.content) {
      throw createError({
        statusCode: 502,
        statusMessage: 'No content returned from AI provider.'
      })
    }

    const payload: AIChatResponse = {
      id: response.id ?? nanoid(),
      role: 'assistant',
      content: choice.message.content,
      finishReason: choice.finish_reason ?? null
    }

    return payload
  } catch (error) {
    console.error('[chat/complete] 调用外部模型失败', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'AI provider request failed'
    })
  }
})
