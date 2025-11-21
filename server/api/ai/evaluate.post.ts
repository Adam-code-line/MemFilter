import { readBody } from 'h3'
import {
  callChatCompletion,
  MissingAIConfigurationError,
  type ChatMessagePayload,
} from '~~/server/utils/aiClient'

interface ImportanceMeta {
  noteId?: string | number
  source?: 'ingestion' | 'manual' | 'imported'
  importanceHint?: 'high' | 'medium' | 'low' | 'noise'
  usageFrequencyPerWeek?: number
  createdAt?: string
  tags?: string[]
}

interface EvaluateItem {
  id?: string | number
  text: string
  meta?: ImportanceMeta
  options?: {
    temperature?: number
    thinking?: boolean
  }
}

interface EvaluateRequestBody {
  text?: string
  meta?: ImportanceMeta
  options?: EvaluateItem['options']
  items?: EvaluateItem[]
}

interface EvaluateResponseEntry {
  id: string
  importance: 'high' | 'medium' | 'low' | 'noise'
  confidence: number
  rationale: string
  suggestedAction: 'retain' | 'compress' | 'discard'
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

const FORBIDDEN_KEYWORDS = ['身份证', '银行卡', '社保号', 'password', '银行卡号']

const DEFAULT_RESPONSE: EvaluateResponseEntry = {
  id: 'offline-evaluation',
  importance: 'medium',
  confidence: 0.4,
  rationale: 'AI 配置缺失，使用启发式默认评估。',
  suggestedAction: 'retain',
}

const ensureItems = (body: EvaluateRequestBody): EvaluateItem[] => {
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

const buildMessages = (item: EvaluateItem): ChatMessagePayload[] => {
  const meta = item.meta ?? {}
  const safetyNotice = meta.importanceHint
    ? `用户的初步重要度提示为 “${meta.importanceHint}”。`
    : '用户未提供初步重要度提示。'

  const systemPrompt =
    `你是忆滤 (MemFilter) 的信息价值评估助手。请根据输入文本分析其重要度，并选择建议动作。只允许输出 JSON 数据。`.trim()
  const userPayload = {
    text: item.text,
    metadata: {
      source: meta.source ?? 'manual',
      note_id: meta.noteId ?? null,
      importance_hint: meta.importanceHint ?? null,
      usage_frequency_per_week: meta.usageFrequencyPerWeek ?? null,
      created_at: meta.createdAt ?? null,
      tags: meta.tags ?? [],
    },
    instructions: {
      task: 'evaluate_information_value',
      context: safetyNotice,
      required_schema: {
        importance: 'high | medium | low | noise',
        confidence: '0-1 number',
        rationale: '简洁中文理由，<=80字',
        suggestedAction: 'retain | compress | discard',
      },
    },
  }

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `请评估以下内容的重要度，仅按照 required_schema 输出 JSON：\n${JSON.stringify(userPayload, null, 2)}`,
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

const normalizeResponse = (payload: any, fallbackId: string): EvaluateResponseEntry => {
  if (!payload || typeof payload !== 'object') {
    return { ...DEFAULT_RESPONSE, id: fallbackId }
  }

  const rawImportance =
    typeof payload.importance === 'string' ? payload.importance.toLowerCase() : 'medium'
  const importance = ['high', 'medium', 'low', 'noise'].includes(rawImportance)
    ? (rawImportance as EvaluateResponseEntry['importance'])
    : 'medium'

  const confidence = Number(payload.confidence)
  const safeConfidence = Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0.5

  const rationale =
    typeof payload.rationale === 'string' && payload.rationale.trim().length
      ? payload.rationale.trim()
      : 'AI 未提供具体理由。'

  const action =
    typeof payload.suggestedAction === 'string' ? payload.suggestedAction.toLowerCase() : 'retain'
  const suggestedAction = ['retain', 'compress', 'discard'].includes(action)
    ? (action as EvaluateResponseEntry['suggestedAction'])
    : 'retain'

  return {
    id: typeof payload.id === 'string' && payload.id ? payload.id : fallbackId,
    importance,
    confidence: safeConfidence,
    rationale,
    suggestedAction,
  }
}

const evaluateItem = async (item: EvaluateItem): Promise<EvaluateResponseEntry> => {
  if (!item.text || typeof item.text !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Each evaluation item must include text.' })
  }

  if (checkContentSafety(item.text)) {
    throw createError({
      statusCode: 422,
      statusMessage: '输入内容包含受限敏感信息，无法进行评估。',
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
        ...DEFAULT_RESPONSE,
        id: String(item.id ?? 'offline-evaluation'),
      }
    }
    console.error('[ai/evaluate] failed to evaluate item', error)
    throw createError({ statusCode: 502, statusMessage: 'AI evaluation failed' })
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<EvaluateRequestBody>(event)
  const items = ensureItems(body)

  if (!items.length) {
    throw createError({ statusCode: 400, statusMessage: 'text or items is required' })
  }

  const results: EvaluateResponseEntry[] = []
  for (const item of items) {
    const evaluated = await evaluateItem(item)
    results.push(evaluated)
  }

  return {
    items: results,
    total: results.length,
  }
})
