import { randomUUID } from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { z } from 'zod'
import { createError, getCookie, type H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import { ensureAuthSchema, useMysql } from '~~/server/utils/db'
import { fetchArticleContent } from '~~/server/utils/articleExtractor'
import { storeArticleInVectorStore } from '~~/server/utils/qdrantStorage'
import { summarizeArticleContent } from '~~/server/utils/articleSummarizer'
import { useAuthService } from './useAuthService'
import { useNotesService } from './useNotesService'

interface MemorySourceRow extends RowDataPacket {
  id: string
  user_id: string
  type: string
  name: string
  // MySQL JSON columns may come back as string, Buffer, or already-parsed object.
  config: unknown
  is_active: number
  created_at: Date
  updated_at: Date
}

interface MemoryRawItemRow extends RowDataPacket {
  id: number
  source_id: string
  user_id: string
  external_id: string | null
  title: string | null
  content: string
  payload: string | null
  status: 'pending' | 'processed' | 'failed'
  error_message: string | null
  ingested_at: Date
  processed_at: Date | null
}

export interface MemorySource {
  id: string
  userId: string
  type: IngestionSourceType
  name: string
  config: Record<string, unknown> | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MemoryRawItem {
  id: number
  sourceId: string
  userId: string
  externalId: string | null
  title: string | null
  content: string
  payload: Record<string, unknown> | null
  status: 'pending' | 'processed' | 'failed'
  ingestedAt: string
  processedAt: string | null
  errorMessage?: string | null
}

export const ingestionSourceTypes = ['tianapi-general'] as const
export type IngestionSourceType = (typeof ingestionSourceTypes)[number]

const DEFAULT_INGESTION_KEYWORDS = ['互联网', '前端', '后端', 'AI'] as const
const DEFAULT_FETCH_LIMIT = 20
const MAX_FETCH_LIMIT = 50

type SessionUser = {
  id: string
  name: string
  email: string
  createdAt: string
}

const sourceSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(ingestionSourceTypes),
  config: z.record(z.string(), z.unknown()).optional(),
})

const updateSourceSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: z.enum(ingestionSourceTypes).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

const promoteSchema = z.object({
  note: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1),
    importance: z.enum(['high', 'medium', 'low', 'noise']).default('medium'),
  }),
})

const resolveUserSession = async (event: H3Event): Promise<SessionUser> => {
  const config = useRuntimeConfig()
  const token = getCookie(event, config.session.cookieName) ?? null
  const authService = await useAuthService()
  const session = await authService.findSession(token)

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '未登录或会话已过期' })
  }

  return session.user
}

const parseSourceConfig = (input: unknown): Record<string, unknown> | null => {
  if (input === null || input === undefined) {
    return null
  }

  if (typeof input === 'string') {
    if (!input.length) {
      return null
    }

    try {
      const parsed = JSON.parse(input)
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null
    } catch (error) {
      console.warn('[ingestion] Failed to parse source config string', error)
      return null
    }
  }

  if (input instanceof Buffer) {
    try {
      return parseSourceConfig(input.toString('utf8'))
    } catch (error) {
      console.warn('[ingestion] Failed to parse source config buffer', error)
      return null
    }
  }

  if (typeof input === 'object') {
    return input as Record<string, unknown>
  }

  return null
}

const mapSourceRow = (row: MemorySourceRow): MemorySource => ({
  id: row.id,
  userId: row.user_id,
  type: row.type as IngestionSourceType,
  name: row.name,
  config: parseSourceConfig(row.config),
  isActive: Boolean(row.is_active),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
})

const parseRawPayload = (input: unknown): Record<string, unknown> | null => {
  if (input === null || input === undefined) {
    return null
  }

  if (typeof input === 'string') {
    if (!input.length) {
      return null
    }

    try {
      const parsed = JSON.parse(input)
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null
    } catch (error) {
      console.warn('[ingestion] Failed to parse raw item payload string', error)
      return null
    }
  }

  if (input instanceof Buffer) {
    try {
      return parseRawPayload(input.toString('utf8'))
    } catch (error) {
      console.warn('[ingestion] Failed to parse raw item payload buffer', error)
      return null
    }
  }

  if (typeof input === 'object') {
    return input as Record<string, unknown>
  }

  return null
}

const mapRawItemRow = (row: MemoryRawItemRow): MemoryRawItem => ({
  id: row.id,
  sourceId: row.source_id,
  userId: row.user_id,
  externalId: row.external_id,
  title: row.title,
  content: row.content,
  payload: parseRawPayload(row.payload),
  status: row.status,
  ingestedAt: row.ingested_at.toISOString(),
  processedAt: row.processed_at ? row.processed_at.toISOString() : null,
  errorMessage: row.error_message,
})

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return null
}

const pickFirstNonEmpty = (...inputs: Array<string | null | undefined>): string | null => {
  for (const entry of inputs) {
    if (typeof entry === 'string') {
      const trimmed = entry.trim()
      if (trimmed.length) {
        return trimmed
      }
    }
  }
  return null
}

const buildFallbackNews = () => [
  {
    externalId: randomUUID(),
    title: '示例资讯：AI 记忆助手趋势',
    content: '由于外部资讯源暂不可用，这里展示了一条示例资讯，帮助你体验获取新记忆的流程。',
    url: 'https://example.com/memfilter-demo',
    publishedAt: new Date().toISOString(),
    source: 'MemFilter Demo',
    articleTitle: null,
    articleContent: null,
  },
  {
    externalId: randomUUID(),
    title: '示例资讯：效率工具精选',
    content: '请配置有效的天行数据 API Key 后即可拉取真实资讯，这条示例资讯用于占位。',
    url: 'https://example.com/productivity',
    publishedAt: new Date().toISOString(),
    source: 'MemFilter Demo',
    articleTitle: null,
    articleContent: null,
  },
]

const sanitizeApiName = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'internet'
  }

  const normalized = value.trim().toLowerCase()
  return normalized.length ? normalized : 'internet'
}

const fetchTianApiNews = async (
  keywords: string[] | undefined,
  options: { apiName?: unknown; allowFallback?: boolean; limit?: number | null } = {}
) => {
  const runtimeConfig = useRuntimeConfig()
  const apiKey = runtimeConfig.ingestion.tianApiKey

  if (!apiKey) {
    console.warn('[ingestion] TianAPI key missing, using fallback news items')
    return buildFallbackNews()
  }

  const apiName = sanitizeApiName(options.apiName)
  const allowFallback = options.allowFallback !== false
  const body: Record<string, string> = { key: apiKey }

  const limit =
    typeof options.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(MAX_FETCH_LIMIT, Math.floor(options.limit)))
      : null

  if (limit !== null) {
    body.num = String(limit)
  }

  if (apiName === 'internet' && keywords?.length) {
    body.word = keywords.join(',')
  }

  const formBody = new URLSearchParams(body)

  try {
    const response = await $fetch<{
      code: number
      msg: string
      newslist?: Array<{
        id?: string
        title?: string
        url?: string
        intro?: string
        ctime?: string
        source?: string
      }>
    }>(`https://apis.tianapi.com/${apiName}/index`, {
      method: 'POST',
      body: formBody,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const rawNewslist = Array.isArray(response.newslist)
      ? response.newslist
      : Array.isArray((response as any)?.result?.newslist)
        ? (response as any).result.newslist
        : []

    const newslist = rawNewslist as Array<{
      id?: string
      title?: string
      url?: string
      intro?: string
      ctime?: string
      source?: string
    }>

    if (response.code !== 200 || newslist.length === 0) {
      if (response.code === 250 && allowFallback) {
        if (apiName === 'internet' && keywords?.length) {
          console.info(
            '[ingestion] TianAPI internet feed empty for keywords, retrying without filters'
          )
          return fetchTianApiNews(undefined, { apiName: 'internet', allowFallback: false })
        }

        if (apiName !== 'internet') {
          console.info('[ingestion] TianAPI feed empty, falling back to default internet feed')
          return fetchTianApiNews(undefined, { apiName: 'internet', allowFallback: false })
        }
      }

      if (response.code === 250) {
        console.warn('[ingestion] TianAPI returned empty data, using fallback items')
        return buildFallbackNews()
      }

      throw createError({
        statusCode: 502,
        statusMessage: `天行数据接口返回错误（${response.code}）：${response.msg || '未返回资讯数据'}`,
      })
    }

    const enriched = [] as Array<{
      externalId: string
      title: string
      content: string
      url?: string
      publishedAt?: string
      source?: string
      articleTitle?: string | null
      articleContent?: string | null
      originalTitle?: string | null
      originalSummary?: string | null
    }>

    for (const item of newslist) {
      const url = typeof item.url === 'string' ? item.url : undefined
      let articleTitle: string | null = null
      let articleContent: string | null = null

      if (url) {
        try {
          const article = await fetchArticleContent(url)
          if (article) {
            articleTitle = article.title ?? null
            articleContent = article.content ?? null
          }
        } catch (error) {
          console.warn('[ingestion] failed to extract article content', url, error)
        }
      }

      enriched.push({
        externalId: item.id ?? item.url ?? randomUUID(),
        title: articleTitle ?? item.title ?? '未命名资讯',
        content: articleContent ?? item.intro ?? '',
        url,
        publishedAt: item.ctime,
        source: item.source,
        articleTitle,
        articleContent,
        originalTitle: item.title ?? null,
        originalSummary: item.intro ?? null,
      })
    }

    return enriched
  } catch (error) {
    console.error('[ingestion] Failed to fetch TianAPI news', error)
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error as Error
    }

    const message = error instanceof Error ? error.message : '拉取资讯失败'
    throw createError({
      statusCode: 502,
      statusMessage: `天行数据接口请求失败：${message}`,
    })
  }
}

export const useIngestionService = async (event: H3Event) => {
  await ensureAuthSchema()
  const user = await resolveUserSession(event)
  const db = useMysql()

  const listSources = async () => {
    const [rows] = await db.execute<MemorySourceRow[]>(
      'SELECT * FROM memory_sources WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    )

    return rows.map(mapSourceRow)
  }

  const createSource = async (payload: unknown) => {
    const parsed = sourceSchema.safeParse(payload)

    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: '来源信息无效',
        data: { issues: parsed.error.flatten() },
      })
    }

    const id = randomUUID()
    const configValue = parsed.data.config ? JSON.stringify(parsed.data.config) : null

    await db.execute(
      'INSERT INTO memory_sources (id, user_id, type, name, config) VALUES (?, ?, ?, ?, ?)',
      [id, user.id, parsed.data.type, parsed.data.name, configValue]
    )

    const [rows] = await db.execute<MemorySourceRow[]>(
      'SELECT * FROM memory_sources WHERE id = ? AND user_id = ? LIMIT 1',
      [id, user.id]
    )

    if (!rows.length) {
      throw createError({ statusCode: 500, statusMessage: '创建来源失败' })
    }

    return mapSourceRow(rows[0])
  }

  const updateSource = async (sourceId: string, payload: unknown) => {
    const parsed = updateSourceSchema.safeParse(payload)

    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: '来源更新无效',
        data: { issues: parsed.error.flatten() },
      })
    }

    const configValue = parsed.data.config ? JSON.stringify(parsed.data.config) : null
    const typeValue = parsed.data.type ?? null

    await db.execute(
      `UPDATE memory_sources SET
        type = COALESCE(?, type),
        name = COALESCE(?, name),
        config = COALESCE(?, config),
        is_active = COALESCE(?, is_active)
      WHERE id = ? AND user_id = ?`,
      [
        typeValue,
        parsed.data.name ?? null,
        configValue,
        parsed.data.isActive !== undefined ? Number(parsed.data.isActive) : null,
        sourceId,
        user.id,
      ]
    )

    const [rows] = await db.execute<MemorySourceRow[]>(
      'SELECT * FROM memory_sources WHERE id = ? AND user_id = ? LIMIT 1',
      [sourceId, user.id]
    )

    if (!rows.length) {
      throw createError({ statusCode: 404, statusMessage: '未找到该来源' })
    }

    return mapSourceRow(rows[0])
  }

  const listRawItems = async (options: { status?: 'pending' | 'processed' | 'failed' } = {}) => {
    const { status } = options
    const query = status
      ? 'SELECT * FROM memory_raw_items WHERE user_id = ? AND status = ? ORDER BY ingested_at DESC'
      : 'SELECT * FROM memory_raw_items WHERE user_id = ? ORDER BY ingested_at DESC'

    const params = status ? [user.id, status] : [user.id]
    const [rows] = await db.execute<MemoryRawItemRow[]>(query, params)

    return rows.map(mapRawItemRow)
  }

  const syncSource = async (
    sourceId: string,
    options: { keywords?: string[] | null; limit?: number | null } = {}
  ) => {
    const [sources] = await db.execute<MemorySourceRow[]>(
      'SELECT * FROM memory_sources WHERE id = ? AND user_id = ? LIMIT 1',
      [sourceId, user.id]
    )

    if (!sources.length) {
      throw createError({ statusCode: 404, statusMessage: '未找到该来源' })
    }

    const source = sources[0]
    if (!source.is_active) {
      throw createError({ statusCode: 400, statusMessage: '来源已停用' })
    }

    const config = parseSourceConfig(source.config) ?? {}
    const configRecord = config as Record<string, unknown>
    const overrideKeywords = Array.isArray(options.keywords)
      ? options.keywords.map((keyword) => keyword.trim()).filter(Boolean)
      : []
    const overrideLimit =
      typeof options.limit === 'number' && Number.isFinite(options.limit)
        ? Math.max(1, Math.min(MAX_FETCH_LIMIT, Math.floor(options.limit)))
        : null

    let configuredLimit: number | null = null
    const configLimit = configRecord.limit
    if (typeof configLimit === 'number' && Number.isFinite(configLimit)) {
      configuredLimit = Math.max(1, Math.min(MAX_FETCH_LIMIT, Math.floor(configLimit)))
    } else if (typeof configLimit === 'string') {
      const parsed = Number.parseInt(configLimit, 10)
      if (Number.isFinite(parsed)) {
        configuredLimit = Math.max(1, Math.min(MAX_FETCH_LIMIT, parsed))
      }
    }

    let items: Array<{
      externalId: string
      title: string
      content: string
      url?: string
      publishedAt?: string
      source?: string
      articleTitle?: string | null
      articleContent?: string | null
      originalTitle?: string | null
      originalSummary?: string | null
    }>

    switch (source.type as IngestionSourceType) {
      case 'tianapi-general': {
        let configuredKeywords: string[] | undefined
        const rawKeywords = configRecord.keywords

        if (Array.isArray(rawKeywords)) {
          configuredKeywords = rawKeywords
            .map((keyword) =>
              (typeof keyword === 'string' ? keyword : String(keyword ?? '')).trim()
            )
            .filter(Boolean)
        } else {
          const legacyKeyword = configRecord.keyword
          if (typeof legacyKeyword === 'string') {
            const trimmed = legacyKeyword.trim()
            configuredKeywords = trimmed.length ? [trimmed] : undefined
          }
        }

        const keywords = overrideKeywords.length
          ? overrideKeywords
          : configuredKeywords && configuredKeywords.length
            ? configuredKeywords
            : Array.from(DEFAULT_INGESTION_KEYWORDS)

        const limit = overrideLimit ?? configuredLimit ?? DEFAULT_FETCH_LIMIT

        items = await fetchTianApiNews(keywords, { apiName: configRecord.api, limit })
        break
      }
      default:
        throw createError({ statusCode: 400, statusMessage: '不支持的来源类型' })
    }

    let inserted = 0
    for (const item of items) {
      const payload = {
        url: item.url,
        publishedAt: item.publishedAt,
        source: item.source,
        articleTitle: item.articleTitle,
        articleContent: item.articleContent,
        originalTitle: item.originalTitle,
        originalSummary: item.originalSummary,
      }

      try {
        await db.execute(
          `INSERT INTO memory_raw_items (source_id, user_id, external_id, title, content, payload)
           VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
           ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), payload = VALUES(payload), status = 'pending', error_message = NULL`,
          [source.id, user.id, item.externalId, item.title, item.content, JSON.stringify(payload)]
        )
        inserted += 1

        if (item.articleContent) {
          await storeArticleInVectorStore({
            id: `${user.id}:${item.externalId}`,
            title: item.articleTitle ?? item.title,
            content: item.articleContent,
            url: item.url,
            source: item.source,
            publishedAt: item.publishedAt ?? null,
            userId: user.id,
          })
        }
      } catch (error) {
        console.error('[ingestion] failed to upsert raw item', error)
      }
    }

    return { inserted, total: items.length }
  }

  const promoteRawItem = async (rawItemId: number, payload: unknown) => {
    const parsed = promoteSchema.safeParse(payload)

    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: '记忆生成数据无效',
        data: { issues: parsed.error.flatten() },
      })
    }

    const [rows] = await db.execute<MemoryRawItemRow[]>(
      'SELECT * FROM memory_raw_items WHERE id = ? AND user_id = ? LIMIT 1',
      [rawItemId, user.id]
    )

    if (!rows.length) {
      throw createError({ statusCode: 404, statusMessage: '未找到原始记忆' })
    }

    const rawRow = rows[0]
    const rawItem = mapRawItemRow(rawRow)
    const payloadRecord = rawItem.payload as Record<string, unknown> | null
    const sourceLabel = toStringOrNull(payloadRecord?.['source']) ?? undefined
    const rawUrl = toStringOrNull(payloadRecord?.['url'])
    let articleContent = toStringOrNull(payloadRecord?.['articleContent'])
    const originalSummary = toStringOrNull(payloadRecord?.['originalSummary'])
    const originalTitle = toStringOrNull(payloadRecord?.['originalTitle'])
    const requestedTitle = parsed.data.note.title ? parsed.data.note.title.trim() : ''
    const baseTitle =
      pickFirstNonEmpty(rawItem.title, originalTitle, requestedTitle) ?? '自动生成记忆'

    if (!articleContent && rawUrl) {
      try {
        const fetched = await fetchArticleContent(rawUrl)
        if (fetched?.content) {
          articleContent = fetched.content.trim()
        }
      } catch (error) {
        console.warn('[ingestion] retry fetch article during promotion failed', rawUrl, error)
      }
    }

    const summarizerInput = pickFirstNonEmpty(articleContent, rawItem.content, originalSummary)
    let rewrittenContent = summarizerInput
      ? (
          await summarizeArticleContent({
            title: baseTitle,
            content: summarizerInput,
            summary: originalSummary,
            source: sourceLabel,
            url: rawUrl ?? undefined,
          })
        ).trim()
      : ''

    if (!rewrittenContent.length) {
      const fallbackContent = pickFirstNonEmpty(
        parsed.data.note.content,
        rawItem.content,
        originalSummary
      )
      rewrittenContent = fallbackContent ?? ''
    }

    if (!rewrittenContent.length) {
      rewrittenContent = rawUrl
        ? `该资讯暂无摘要内容，请访问原文：${rawUrl}`
        : '该资讯暂无摘要内容，请查看原始来源。'
    }

    const noteService = await useNotesService(event)
    const notePayload = {
      title: baseTitle,
      content: rewrittenContent,
      description: sourceLabel,
      icon: '📰',
      importance: parsed.data.note.importance,
      fadeLevel: 0,
      forgettingProgress: 0,
      daysUntilForgotten: null,
      importanceScore: null,
      decayRate: null,
      isCollapsed: false,
      lastAccessed: new Date().toISOString(),
      date: undefined,
    }

    const note = await noteService.create(notePayload)

    await db.execute(
      `UPDATE memory_raw_items
       SET status = 'processed', processed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [rawItemId, user.id]
    )

    return note
  }

  return {
    user,
    listSources,
    createSource,
    updateSource,
    listRawItems,
    syncSource,
    promoteRawItem,
  }
}
