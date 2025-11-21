import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { fetchArticleContent } from '~~/server/utils/articleExtractor'

export const MAX_FETCH_LIMIT = 500

const sanitizeApiName = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'internet'
  }

  const normalized = value.trim().toLowerCase()
  return normalized.length ? normalized : 'internet'
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

export const fetchTianApiNews = async (
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
