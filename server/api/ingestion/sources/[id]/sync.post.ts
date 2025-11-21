import { createError, defineEventHandler, readBody } from 'h3'
import { useIngestionService } from '~/composables/services/useIngestionService'

export default defineEventHandler(async (event) => {
  const sourceId = event.context.params?.id
  if (!sourceId) {
    throw createError({ statusCode: 400, statusMessage: '缺少来源 ID' })
  }

  let body: { keywords?: unknown; limit?: unknown } = {}

  try {
    body = await readBody<{ keywords?: unknown; limit?: unknown }>(event)
  } catch {
    body = {}
  }

  const normalizedKeywords = (() => {
    const raw = body?.keywords

    if (Array.isArray(raw)) {
      return raw
        .map((keyword) => (typeof keyword === 'string' ? keyword : String(keyword ?? '')).trim())
        .filter(Boolean)
    }

    if (typeof raw === 'string') {
      return raw
        .split(/[\s,，、；;]+/)
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    }

    return undefined
  })()

  const normalizedLimit = (() => {
    const raw = body?.limit

    if (typeof raw === 'number') {
      if (!Number.isFinite(raw)) {
        return undefined
      }
      return Math.max(1, Math.min(50, Math.floor(raw)))
    }

    if (typeof raw === 'string') {
      if (!raw.trim().length) {
        return undefined
      }
      const parsed = Number.parseInt(raw, 10)
      if (Number.isFinite(parsed)) {
        return Math.max(1, Math.min(50, parsed))
      }
    }

    return undefined
  })()

  const ingestionService = await useIngestionService(event)
  return ingestionService.syncSource(sourceId, {
    keywords: normalizedKeywords,
    limit: normalizedLimit,
  })
})
