import { readBody } from 'h3'
import {
  callChatCompletion,
  MissingAIConfigurationError,
  type ChatMessagePayload,
} from '~~/server/utils/aiClient'

interface CompressMeta {
  noteId?: string | number
  title?: string
  importance?: 'high' | 'medium' | 'low' | 'noise'
  createdAt?: string
  tags?: string[]
}

interface CompressItem {
  id?: string | number
  text: string
  meta?: CompressMeta
  options?: {
    targetLength?: number
    temperature?: number
    thinking?: boolean
  }
}

interface CompressRequestBody {
  text?: string
  meta?: CompressMeta
  options?: CompressItem['options']
  items?: CompressItem[]
}

interface CompressResponseEntry {
  id: string
  summary: string
  bullets: string[]
  retentionScore: number
  tokensSaved?: number
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

const FORBIDDEN_KEYWORDS = ['身份证', '银行卡', '社保号', 'password']

const DEFAULT_COMPRESS_RESPONSE: CompressResponseEntry = {
  id: 'offline-compress',
  summary: 'AI 配置缺失，暂未生成摘要。',
  bullets: [],
  retentionScore: 40,
}

const ensureItems = (body: CompressRequestBody): CompressItem[] => {
  if (Array.isArray(body.items) && body.items.length) {
    return body.items
  }
  if (body.text && typeof body.text === 'string') {
    return [
      {
        id: body.meta?.noteId,
        text: body.text,
        meta: body.meta,
        options: body.options,
      },
    ]
  }
  return []
}

const checkContentSafety = (text: string) =>
  FORBIDDEN_KEYWORDS.some((keyword) => text.includes(keyword))

const buildMessages = (item: CompressItem): ChatMessagePayload[] => {
  const meta = item.meta ?? {}
  const targetLength =
    typeof item.options?.targetLength === 'number' && item.options?.targetLength > 0
      ? item.options?.targetLength
      : 120

  const systemPrompt =
    `你是忆滤 (MemFilter) 的记忆压缩助手。请提炼文本的核心要点，输出 JSON，总结需兼顾完整性与可读性。`.trim()

  const userPayload = {
    text: item.text,
    metadata: {
      note_id: meta.noteId ?? null,
      title: meta.title ?? null,
      importance: meta.importance ?? null,
      created_at: meta.createdAt ?? null,
      tags: meta.tags ?? [],
    },
    instructions: {
      target_length: targetLength,
      bullets: 3,
      retention_score_definition: '0-100 分，越高表示越应被保留。',
    },
  }

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `请压缩以下内容，仅输出 JSON，字段包含 summary, bullets (数组), retentionScore (0-100 数字), tokensSaved (可选整数)。\n${JSON.stringify(userPayload, null, 2)}`,
    },
  ]
}

const extractJson = (raw: string) => {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

const normalizeResponse = (payload: any, fallbackId: string): CompressResponseEntry => {
  if (!payload || typeof payload !== 'object') {
    return { ...DEFAULT_COMPRESS_RESPONSE, id: fallbackId }
  }

  const summary =
    typeof payload.summary === 'string' && payload.summary.trim().length
      ? payload.summary.trim()
      : DEFAULT_COMPRESS_RESPONSE.summary

  const bullets = Array.isArray(payload.bullets)
    ? payload.bullets
        .filter((entry: unknown) => typeof entry === 'string' && entry.trim().length)
        .map((entry: string) => entry.trim())
    : []

  const retentionScore = Number(payload.retentionScore)
  const safeScore = Number.isFinite(retentionScore)
    ? Math.min(Math.max(retentionScore, 0), 100)
    : 50

  const tokensSaved = Number(payload.tokensSaved)
  const safeTokensSaved = Number.isFinite(tokensSaved)
    ? Math.max(Math.floor(tokensSaved), 0)
    : undefined

  return {
    id: typeof payload.id === 'string' && payload.id ? payload.id : fallbackId,
    summary,
    bullets,
    retentionScore: safeScore,
    tokensSaved: safeTokensSaved,
  }
}

const compressItem = async (item: CompressItem): Promise<CompressResponseEntry> => {
  if (!item.text || typeof item.text !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Each compress item must include text.' })
  }

  if (checkContentSafety(item.text)) {
    throw createError({
      statusCode: 422,
      statusMessage: '输入内容包含受限敏感信息，无法进行压缩。',
    })
  }

  try {
    const result = await callChatCompletion(buildMessages(item), {
      temperature: item.options?.temperature,
      thinking: item.options?.thinking ?? false,
    })
    const parsed = extractJson(result.content)
    const normalized = normalizeResponse(parsed, result.id)
    return {
      ...normalized,
      usage: result.usage,
    }
  } catch (error) {
    if (error instanceof MissingAIConfigurationError) {
      return {
        ...DEFAULT_COMPRESS_RESPONSE,
        id: String(item.id ?? 'offline-compress'),
      }
    }
    console.error('[ai/compress] failed to compress item', error)
    throw createError({ statusCode: 502, statusMessage: 'AI compression failed' })
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CompressRequestBody>(event)
  const items = ensureItems(body)

  if (!items.length) {
    throw createError({ statusCode: 400, statusMessage: 'text or items is required' })
  }

  const results: CompressResponseEntry[] = []
  for (const item of items) {
    const compressed = await compressItem(item)
    results.push(compressed)
  }

  return {
    items: results,
    total: results.length,
  }
})
