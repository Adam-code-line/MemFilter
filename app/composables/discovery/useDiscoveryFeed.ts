import { computed, ref, unref, type Ref } from '#imports'
import type { MemoryRawItem } from '~/composables/services/useIngestionService'

export interface DiscoveryFeedItem {
  id: string
  title: string
  summary: string
  source: string
  publishedAt: string | null
  link: string | null
  tags: string[]
  raw: MemoryRawItem
}

export interface DiscoveryTopic {
  id: string
  label: string
  tag: string
  mentions: number
}

export interface DiscoveryCollection {
  id: string
  title: string
  description: string
  icon: string
  tone: 'primary' | 'info' | 'warning' | 'success'
  comingSoon?: boolean
}

const normalizeDate = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatSummary = (item: MemoryRawItem) => {
  const payload = item.payload ?? {}
  const summary = typeof payload?.summary === 'string' ? payload.summary : null
  if (summary && summary.trim().length >= 40) {
    return summary.trim()
  }

  const content = (item.content ?? '').trim()
  if (!content.length) {
    return '暂未提供内容摘要，后续可以由 AI 自动生成。'
  }

  return content.slice(0, 160) + (content.length > 160 ? '…' : '')
}

const resolveTags = (item: MemoryRawItem) => {
  const payload = item.payload ?? {}
  const tags = Array.isArray(payload?.tags)
    ? payload.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
    : []

  return tags.length ? tags : ['综合资讯']
}

const mapRawItemToDiscovery = (item: MemoryRawItem): DiscoveryFeedItem => {
  const payload = item.payload ?? {}
  const link = typeof payload?.url === 'string' ? payload.url : null
  const source = typeof payload?.source === 'string' && payload.source.trim().length
    ? payload.source.trim()
    : '来自天行资讯'

  const published = normalizeDate(
    typeof payload?.publishedAt === 'string'
      ? payload.publishedAt
      : typeof payload?.ctime === 'string'
        ? payload.ctime
        : item.ingestedAt
  )

  return {
    id: String(item.id),
    title: item.title ?? (typeof payload?.title === 'string' ? payload.title : '未命名资讯'),
    summary: formatSummary(item),
    source,
    publishedAt: published ? published.toISOString() : null,
    link,
    tags: resolveTags(item),
    raw: item
  }
}

type MaybeRef<T> = T | Ref<T>

interface UseDiscoveryFeedOptions {
  items: MaybeRef<MemoryRawItem[]>
}

export const useDiscoveryFeed = ({ items }: UseDiscoveryFeedOptions) => {
  const searchQuery = ref('')
  const selectedTopic = ref<string>('all')
  const selectedTimeRange = ref<'today' | 'week' | 'month' | 'all'>('all')

  const allItems = computed(() => unref(items).map(mapRawItemToDiscovery))

  const categories = computed(() => {
    const tagCounts = new Map<string, number>()

    for (const item of allItems.value) {
      const primaryTag = item.tags[0] ?? '综合资讯'
      tagCounts.set(primaryTag, (tagCounts.get(primaryTag) ?? 0) + 1)
    }

    const sorted = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({
        tag,
        label: tag,
        count
      }))

    return [
      { tag: 'all', label: '全部资讯', count: allItems.value.length },
      ...sorted
    ]
  })

  const trendingTopics = computed<DiscoveryTopic[]>(() => {
    const frequency = new Map<string, number>()

    for (const item of allItems.value) {
      const tokens = item.title
        .replace(/[\p{P}\p{S}]/gu, ' ')
        .split(/\s+/)
        .filter(token => token.length >= 2 && token.length <= 16)

      for (const token of tokens) {
        const key = token.toLowerCase()
        if (/^[\d]+$/.test(key)) {
          continue
        }
        frequency.set(key, (frequency.get(key) ?? 0) + 1)
      }
    }

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([token, mentions], index) => ({
        id: `${token}-${index}`,
        label: token,
        tag: token,
        mentions
      }))
  })

  const curatedCollections = computed<DiscoveryCollection[]>(() => [
    {
      id: 'ai-personalized',
      title: 'AI 个性化推荐',
      description: '接入 AI 后将根据你的笔记主题自动推荐值得记录的资讯。',
      icon: 'i-lucide-sparkles',
      tone: 'primary',
      comingSoon: true
    },
    {
      id: 'productivity-boost',
      title: '效率工具精选',
      description: '聚焦效率工具、工作流优化与知识管理的新趋势。',
      icon: 'i-lucide-rocket',
      tone: 'info'
    },
    {
      id: 'industry-hot',
      title: '行业热点追踪',
      description: '快速浏览科技、互联网、AI 行业的当日高热度事件。',
      icon: 'i-lucide-flame',
      tone: 'warning'
    }
  ])

  const stats = computed(() => {
    const total = allItems.value.length
    const todayCutoff = new Date()
    todayCutoff.setHours(0, 0, 0, 0)

    const weekCutoff = new Date()
    weekCutoff.setDate(weekCutoff.getDate() - 7)

    let today = 0
    let thisWeek = 0

    for (const item of allItems.value) {
      const published = item.publishedAt ? new Date(item.publishedAt) : null
      if (published && published >= todayCutoff) {
        today++
      }
      if (published && published >= weekCutoff) {
        thisWeek++
      }
    }

    return {
      total,
      today,
      thisWeek
    }
  })

  const filteredItems = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase()
    const topic = selectedTopic.value
    const range = selectedTimeRange.value
    const now = new Date()

    const matchesTimeRange = (item: DiscoveryFeedItem) => {
      if (range === 'all') {
        return true
      }

      const published = item.publishedAt ? new Date(item.publishedAt) : null
      if (!published) {
        return true
      }

      if (range === 'today') {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        return published >= startOfDay
      }

      if (range === 'week') {
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 7)
        return published >= sevenDaysAgo
      }

      if (range === 'month') {
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(now.getDate() - 30)
        return published >= thirtyDaysAgo
      }

      return true
    }

    return allItems.value.filter(item => {
      const matchKeyword = !keyword
        || item.title.toLowerCase().includes(keyword)
        || item.summary.toLowerCase().includes(keyword)
        || item.tags.some(tag => tag.toLowerCase().includes(keyword))

      const matchTopic = topic === 'all'
        || item.tags.includes(topic)
        || item.title.toLowerCase().includes(topic)

      return matchKeyword && matchTopic && matchesTimeRange(item)
    })
  })

  const highlightItem = computed(() => filteredItems.value[0] ?? null)

  const setTopic = (topic: string) => {
    selectedTopic.value = topic
  }

  const setTimeRange = (range: 'today' | 'week' | 'month' | 'all') => {
    selectedTimeRange.value = range
  }

  return {
    searchQuery,
    selectedTopic,
    selectedTimeRange,
    categories,
    trendingTopics,
    curatedCollections,
    stats,
    filteredItems,
    highlightItem,
    setTopic,
    setTimeRange
  }
}
