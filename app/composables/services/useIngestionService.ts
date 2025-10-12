import { randomUUID } from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { z } from 'zod'
import { createError, getCookie, type H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import { ensureAuthSchema, useMysql } from '~~/server/utils/db'
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
export type IngestionSourceType = typeof ingestionSourceTypes[number]

type SessionUser = {
  id: string
  name: string
  email: string
  createdAt: string
}

const sourceSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(ingestionSourceTypes),
  config: z.record(z.string(), z.unknown()).optional()
})

const updateSourceSchema = sourceSchema.partial({ name: true, config: true }).extend({
  isActive: z.boolean().optional()
})

const promoteSchema = z.object({
  note: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1),
    importance: z.enum(['high', 'medium', 'low', 'noise']).default('medium')
  })
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
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
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
  updatedAt: row.updated_at.toISOString()
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
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
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
  errorMessage: row.error_message
})

const buildFallbackNews = () => [
  {
    externalId: randomUUID(),
    title: '示例资讯：AI 记忆助手趋势',
    content: '由于外部资讯源暂不可用，这里展示了一条示例资讯，帮助你体验获取新记忆的流程。',
    url: 'https://example.com/memfilter-demo',
    publishedAt: new Date().toISOString(),
    source: 'MemFilter Demo'
  },
  {
    externalId: randomUUID(),
    title: '示例资讯：效率工具精选',
    content: '请配置有效的天行数据 API Key 后即可拉取真实资讯，这条示例资讯用于占位。',
    url: 'https://example.com/productivity',
    publishedAt: new Date().toISOString(),
    source: 'MemFilter Demo'
  }
]

const fetchTianApiNews = async (keywords: string[] | undefined) => {
  const runtimeConfig = useRuntimeConfig()
  const apiKey = runtimeConfig.ingestion.tianApiKey

  if (!apiKey) {
    console.warn('[ingestion] TianAPI key missing, using fallback news items')
    return buildFallbackNews()
  }

  const query: Record<string, string> = { key: apiKey, num: '20' }
  if (keywords?.length) {
    query.word = keywords.join(',')
  }

  const response = await $fetch<{
    code: number
    msg: string
    newslist?: Array<{ id?: string; title?: string; url?: string; intro?: string; ctime?: string; source?: string }>
  }>('https://api.tianapi.com/generalnews/index', {
    method: 'GET',
    query
  })

  if (response.code !== 200 || !response.newslist) {
    console.warn('[ingestion] TianAPI responded with error, using fallback news items', {
      code: response.code,
      message: response.msg
    })
    return buildFallbackNews()
  }

  return response.newslist.map(item => ({
    externalId: item.id ?? item.url ?? randomUUID(),
    title: item.title ?? '未命名资讯',
    content: item.intro ?? '',
    url: item.url,
    publishedAt: item.ctime,
    source: item.source
  }))
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
        data: { issues: parsed.error.flatten() }
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
        data: { issues: parsed.error.flatten() }
      })
    }

    const configValue = parsed.data.config ? JSON.stringify(parsed.data.config) : null

    await db.execute(
      `UPDATE memory_sources SET
        name = COALESCE(?, name),
        config = COALESCE(?, config),
        is_active = COALESCE(?, is_active)
      WHERE id = ? AND user_id = ?`,
      [
        parsed.data.name ?? null,
        configValue,
        parsed.data.isActive !== undefined ? Number(parsed.data.isActive) : null,
        sourceId,
        user.id
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

  const syncSource = async (sourceId: string) => {
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

    let items: Array<{ externalId: string; title: string; content: string; url?: string; publishedAt?: string | undefined; source?: string | undefined }>

    switch (source.type as IngestionSourceType) {
      case 'tianapi-general': {
        const keywords = Array.isArray(config.keywords)
          ? (config.keywords.filter(item => typeof item === 'string') as string[])
          : typeof config.keyword === 'string'
            ? [config.keyword]
            : undefined

        items = await fetchTianApiNews(keywords)
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
        source: item.source
      }

      try {
        await db.execute(
          `INSERT INTO memory_raw_items (source_id, user_id, external_id, title, content, payload)
           VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
           ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), payload = VALUES(payload), status = 'pending', error_message = NULL` ,
          [
            source.id,
            user.id,
            item.externalId,
            item.title,
            item.content,
            JSON.stringify(payload)
          ]
        )
        inserted += 1
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
        data: { issues: parsed.error.flatten() }
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
    const sourceLabel = payloadRecord && typeof payloadRecord.source === 'string'
      ? (payloadRecord.source as string)
      : undefined
    const noteService = await useNotesService(event)
    const notePayload = {
      title: parsed.data.note.title ?? rawItem.title ?? '自动生成记忆',
      content: parsed.data.note.content,
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
      date: undefined
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
    promoteRawItem
  }
}
