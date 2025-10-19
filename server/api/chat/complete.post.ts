import { sendStream, setResponseHeader } from 'h3'
import { nanoid } from 'nanoid'
import type { SendAIChatPayload } from '~/composables/chat/types'

const encoder = new TextEncoder()

const sanitizeMessages = (entries: SendAIChatPayload['messages']) =>
  entries
    .filter(message => typeof message.content === 'string' && message.content.trim().length > 0)
    .map(message => ({
      role: message.role,
      content: message.content
    }))

const emitSse = (controller: ReadableStreamDefaultController<Uint8Array>, payload: Record<string, unknown>) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
}

const emitDone = (controller: ReadableStreamDefaultController<Uint8Array>) => {
  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
}

const extractTextFromDelta = (input: any): string => {
  if (!input) {
    return ''
  }
  if (typeof input === 'string') {
    return input
  }
  if (Array.isArray(input)) {
    return input
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
  if (typeof input === 'object' && typeof input.text === 'string') {
    return input.text
  }
  return ''
}

const transformUpstreamStream = (upstream: ReadableStream<Uint8Array>) =>
  new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let aggregated = ''
      let lastId: string | null = null
      let sentFinal = false

      const sendFinal = (finishReason: string | null = null) => {
        if (sentFinal) {
          return
        }
        sentFinal = true
        emitSse(controller, {
          id: lastId ?? nanoid(),
          done: true,
          finishReason,
          content: aggregated
        })
        emitDone(controller)
      }

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })

          while (true) {
            const boundary = buffer.indexOf('\n\n')
            if (boundary === -1) {
              break
            }

            const segment = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            const dataLines = segment.split(/\r?\n/).filter(line => line.startsWith('data:'))

            if (!dataLines.length) {
              continue
            }

            for (const line of dataLines) {
              const raw = line.slice(5).trim()

              if (!raw) {
                continue
              }

              if (raw === '[DONE]') {
                sendFinal()
                return
              }

              let parsed: any
              try {
                parsed = JSON.parse(raw)
              } catch (error) {
                console.warn('[chat/complete] 无法解析上游流式片段', error, raw)
                continue
              }

              if (parsed.error) {
                emitSse(controller, {
                  id: parsed.id ?? nanoid(),
                  error: parsed.error,
                  message: parsed.message ?? 'AI provider error'
                })
                sendFinal('error')
                return
              }

              const choice = parsed.choices?.[0]
              const delta = choice?.delta ?? {}
              const text = extractTextFromDelta(delta.content ?? choice?.message?.content ?? '')

              const currentId = parsed.id ?? lastId ?? nanoid()

              if (text) {
                aggregated += text
                lastId = currentId
                emitSse(controller, {
                  id: currentId,
                  delta: text,
                  done: false
                })
              }

              if (choice?.finish_reason) {
                lastId = currentId
                sendFinal(choice.finish_reason)
                return
              }
            }
          }
        }

        sendFinal(null)
      } catch (error) {
        console.error('[chat/complete] 处理上游流式响应时出错', error)
        emitSse(controller, {
          id: lastId ?? nanoid(),
          error: 'upstream_error',
          message: 'AI provider request failed'
        })
        sendFinal('error')
      } finally {
        controller.close()
      }
    }
  })

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
  const messages = sanitizeMessages(body.messages)

  if (!runtime.ai?.apiKey) {
    const userMessage = messages.at(-1)?.content ?? '（无内容）'
    const id = nanoid()
    const content = `【离线演示】您刚刚说：${userMessage}`

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        emitSse(controller, { id, delta: content, done: false })
        emitSse(controller, { id, content, done: true, finishReason: 'mock' })
        emitDone(controller)
        controller.close()
      }
    })

    setResponseHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
    setResponseHeader(event, 'Cache-Control', 'no-cache, no-transform')
    setResponseHeader(event, 'Connection', 'keep-alive')
    return sendStream(event, stream)
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runtime.ai.apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature,
        messages,
        stream: true
      })
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw createError({
        statusCode: response.status,
        statusMessage: text || 'AI provider request failed'
      })
    }

    if (!response.body) {
      throw createError({
        statusCode: 502,
        statusMessage: 'AI provider did not return a stream.'
      })
    }

    setResponseHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
    setResponseHeader(event, 'Cache-Control', 'no-cache, no-transform')
    setResponseHeader(event, 'Connection', 'keep-alive')

    return sendStream(event, transformUpstreamStream(response.body))
  } catch (error) {
    console.error('[chat/complete] 调用外部模型失败', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'AI provider request failed'
    })
  }
})
