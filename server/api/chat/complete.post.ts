import { sendStream, setResponseHeader } from 'h3'
import { nanoid } from 'nanoid'
import type { SendAIChatPayload } from '~/composables/chat/types'

const encoder = new TextEncoder()

const sanitizeMessages = (entries: SendAIChatPayload['messages']) =>
  entries
    .filter((message) => typeof message.content === 'string' && message.content.trim().length > 0)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))

const emitSse = (
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: Record<string, unknown>
) => {
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
      .map((item) => {
        if (!item) {
          return ''
        }
        if (typeof item === 'string') {
          return item
        }
        if (typeof item === 'object') {
          if (typeof item.text === 'string') {
            return item.text
          }
          if (typeof item.content === 'string') {
            return item.content
          }
          if (typeof item.reasoning_content === 'string') {
            return item.reasoning_content
          }
          if (typeof item.value === 'string') {
            return item.value
          }
        }
        return ''
      })
      .join('')
  }
  if (typeof input === 'object') {
    if (typeof input.text === 'string') {
      return input.text
    }
    if (typeof input.content === 'string') {
      return input.content
    }
    if (typeof input.reasoning_content === 'string') {
      return input.reasoning_content
    }
    if (Array.isArray(input.content)) {
      return extractTextFromDelta(input.content)
    }
    if (Array.isArray(input.reasoning_content)) {
      return extractTextFromDelta(input.reasoning_content)
    }
    if (typeof input.value === 'string') {
      return input.value
    }
  }
  return ''
}

const unwrapStreamPayload = (raw: any) => {
  let current = raw
  let eventType: string | null = typeof raw?.event === 'string' ? raw.event.toLowerCase() : null

  const dive = (node: any) => {
    if (node && typeof node === 'object') {
      if (typeof node.event === 'string') {
        eventType = node.event.toLowerCase()
      }
      if (node.data && typeof node.data === 'object') {
        return node.data
      }
    }
    return null
  }

  let nextNode = dive(current)
  if (nextNode) {
    current = nextNode
  }

  while (
    current &&
    typeof current === 'object' &&
    current.data &&
    typeof current.data === 'object' &&
    !Array.isArray(current.data)
  ) {
    const next = current.data
    if (typeof next.event === 'string') {
      eventType = next.event.toLowerCase()
    }
    if (next.choices || next.delta || next.content || next.answer) {
      current = next
      break
    }
    current = next
  }

  return { core: current, eventType }
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
      let latestAnswer = ''

      const sendFinal = (finishReason: string | null = null) => {
        if (sentFinal) {
          return
        }
        sentFinal = true
        const finalContent = aggregated || latestAnswer
        emitSse(controller, {
          id: lastId ?? nanoid(),
          done: true,
          finishReason,
          content: finalContent,
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
            const dataLines = segment.split(/\r?\n/).filter((line) => line.startsWith('data:'))

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

              if (parsed?.error || parsed?.code) {
                emitSse(controller, {
                  id: parsed.id ?? nanoid(),
                  error: parsed.error ?? parsed.code ?? 'upstream_error',
                  message: parsed.message ?? parsed.msg ?? 'AI provider error',
                })
                sendFinal('error')
                return
              }

              const { core, eventType } = unwrapStreamPayload(parsed)

              if (!core || typeof core !== 'object') {
                continue
              }

              if (core.error || core.code) {
                emitSse(controller, {
                  id: core.id ?? parsed.id ?? nanoid(),
                  error: core.error ?? core.code ?? 'upstream_error',
                  message: core.message ?? core.msg ?? 'AI provider error',
                })
                sendFinal('error')
                return
              }

              const choices = Array.isArray(core.choices) ? core.choices : []
              const choice = choices[0]
              const delta = choice?.delta ?? core.delta ?? {}
              const chunkText = extractTextFromDelta(delta?.content)
              const answerText = extractTextFromDelta(
                choice?.message?.content ?? core.content ?? core.answer ?? ''
              )
              if (answerText) {
                latestAnswer = answerText
              }
              const text = chunkText
              const currentId = core.id ?? parsed.id ?? lastId ?? nanoid()

              if (text) {
                aggregated += text
                lastId = currentId
                emitSse(controller, {
                  id: currentId,
                  delta: text,
                  done: false,
                })
              } else if (typeof core.answer === 'string' && core.answer.length) {
                aggregated += core.answer
                lastId = currentId
                emitSse(controller, {
                  id: currentId,
                  delta: core.answer,
                  done: false,
                })
              } else if (!aggregated && answerText) {
                aggregated = answerText
                lastId = currentId
                emitSse(controller, {
                  id: currentId,
                  delta: answerText,
                  done: false,
                })
              }

              const finishReason = choice?.finish_reason ?? core.finish_reason ?? null
              const isTerminalEvent =
                eventType === 'stop' || eventType === 'end' || eventType === 'finish'

              if (finishReason || isTerminalEvent) {
                if (!aggregated && latestAnswer) {
                  aggregated = latestAnswer
                }
                lastId = currentId
                sendFinal(finishReason ?? eventType ?? null)
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
          message: 'AI provider request failed',
        })
        sendFinal('error')
      } finally {
        controller.close()
      }
    },
  })

export default defineEventHandler(async (event) => {
  const body = await readBody<SendAIChatPayload>(event)

  if (!body?.messages?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'messages payload is required',
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

    let timer: ReturnType<typeof setTimeout> | null = null

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const segments = content.match(/.{1,16}/gs) ?? [content]
        let index = 0

        const flushFinal = () => {
          if (timer) {
            clearTimeout(timer)
            timer = null
          }
          emitSse(controller, { id, content, done: true, finishReason: 'mock' })
          emitDone(controller)
          controller.close()
        }

        const pushNext = () => {
          if (index >= segments.length) {
            flushFinal()
            return
          }
          emitSse(controller, { id, delta: segments[index], done: false })
          index += 1
          timer = setTimeout(pushNext, 70)
        }

        pushNext()
      },
      cancel() {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
      },
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
        Authorization: `Bearer ${runtime.ai.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw createError({
        statusCode: response.status,
        statusMessage: text || 'AI provider request failed',
      })
    }

    if (!response.body) {
      throw createError({
        statusCode: 502,
        statusMessage: 'AI provider did not return a stream.',
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
      statusMessage: 'AI provider request failed',
    })
  }
})
