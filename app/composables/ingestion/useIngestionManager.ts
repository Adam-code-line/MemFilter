import { useState } from '#app'
import { computed, ref } from '#imports'
import { useToast } from '#imports'
import type { MemoryRawItem, MemorySource } from '~~/composables/services/useIngestionService'
import { useIngestionApi } from './useIngestionApi'

interface PromoteOptions {
  title?: string
  importance?: 'high' | 'medium' | 'low' | 'noise'
}

const DEFAULT_SOURCE_TYPE = 'tianapi-general'
const DEFAULT_SOURCE_NAME = '中文资讯源'
const DEFAULT_KEYWORDS = ['互联网', '前端', '后端', 'AI']
const DEFAULT_LIMIT = 20

export const useIngestionManager = () => {
  const ingestionApi = useIngestionApi()
  const toast = useToast()

  const defaultSourceId = useState<string | null>('ingestion-default-source', () => null)
  const sourcesState = useState<MemorySource[]>('ingestion-sources', () => [])
  const pendingItemsState = useState<MemoryRawItem[]>('ingestion-pending-items', () => [])

  const isInitializing = ref(false)
  const isSyncing = ref(false)
  const isLoadingItems = ref(false)
  const lastSyncResult = ref<{ inserted: number; total: number } | null>(null)
  let initializePromise: Promise<string | null> | null = null

  const ensureDefaultSource = async () => {
    if (defaultSourceId.value) {
      return defaultSourceId.value
    }

    if (initializePromise) {
      return initializePromise
    }

    isInitializing.value = true

    initializePromise = (async () => {
      try {
        const sources = await ingestionApi.listSources()
        sourcesState.value = sources

        let target = sources.find((source) => source.type === DEFAULT_SOURCE_TYPE)

        if (!target) {
          target = await ingestionApi.createSource({
            name: DEFAULT_SOURCE_NAME,
            type: DEFAULT_SOURCE_TYPE,
            config: { keywords: DEFAULT_KEYWORDS, limit: DEFAULT_LIMIT },
          })
          sourcesState.value = [...sourcesState.value, target]
        } else {
          const existingKeywords = Array.isArray(target.config?.keywords)
            ? target.config?.keywords.filter((item) => typeof item === 'string')
            : []

          const hasLimit = typeof target.config?.limit === 'number'

          const needsUpdate = existingKeywords.length === 0 || !hasLimit

          if (needsUpdate) {
            const nextConfig = {
              ...(target.config ?? {}),
              keywords: existingKeywords.length ? existingKeywords : DEFAULT_KEYWORDS,
              limit: hasLimit ? target.config?.limit : DEFAULT_LIMIT,
            }

            const updatedTarget = await ingestionApi.updateSource(target.id, {
              config: nextConfig,
            })

            target = updatedTarget
            sourcesState.value = sourcesState.value.map((source) =>
              source.id === updatedTarget.id ? updatedTarget : source
            )
          }
        }

        defaultSourceId.value = target.id
        return defaultSourceId.value
      } catch (error) {
        toast.add({
          title: '初始化失败',
          description: error instanceof Error ? error.message : '无法创建默认来源',
          color: 'error',
        })
        throw error
      } finally {
        isInitializing.value = false
        initializePromise = null
      }
    })()

    return initializePromise
  }

  const refreshPendingItems = async () => {
    isLoadingItems.value = true
    try {
      pendingItemsState.value = await ingestionApi.listItems('pending')
    } catch (error) {
      toast.add({
        title: '拉取原始记忆失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        color: 'error',
      })
      throw error
    } finally {
      isLoadingItems.value = false
    }
  }

  const syncAndFetch = async (
    options: { keywords?: string[] | null; limit?: number | null } = {}
  ) => {
    const sourceId = await ensureDefaultSource()
    if (!sourceId) {
      return null
    }

    isSyncing.value = true

    try {
      const sanitizedKeywords = Array.isArray(options.keywords)
        ? options.keywords.map((keyword) => keyword.trim()).filter(Boolean)
        : []

      const sanitizedLimit =
        typeof options.limit === 'number' && Number.isFinite(options.limit)
          ? Math.max(1, Math.min(50, Math.floor(options.limit)))
          : null

      const payload: { keywords?: string[]; limit?: number } = {}

      if (sanitizedKeywords.length) {
        payload.keywords = sanitizedKeywords
      }

      if (sanitizedLimit !== null) {
        payload.limit = sanitizedLimit
      }

      const result = await ingestionApi.syncSource(
        sourceId,
        Object.keys(payload).length ? payload : undefined
      )
      lastSyncResult.value = result
      await refreshPendingItems()
      if (result.inserted === 0) {
        toast.add({
          title: '暂无新资讯',
          description: '天行数据暂未返回新的内容',
          color: 'neutral',
        })
      } else {
        toast.add({
          title: '已获取新的原始记忆',
          description: `新增 ${result.inserted} 条资讯`,
          color: 'primary',
        })
      }
      return result
    } catch (error) {
      toast.add({
        title: '同步失败',
        description: error instanceof Error ? error.message : '请检查 API Key 或稍后重试',
        color: 'error',
      })
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  const promoteRawItem = async (item: MemoryRawItem, options: PromoteOptions = {}) => {
    try {
      const payloadRecord = (item.payload ?? null) as Record<string, unknown> | null
      const payloadUrl =
        typeof payloadRecord?.['url'] === 'string' ? String(payloadRecord['url']) : null
      const payloadArticle =
        typeof payloadRecord?.['articleContent'] === 'string'
          ? String(payloadRecord['articleContent'])
          : null
      const resolvedContent = (() => {
        const article = (payloadArticle ?? '').trim()
        if (article.length) {
          return article
        }
        const trimmed = (item.content ?? '').trim()
        if (trimmed.length) {
          return trimmed
        }
        if (payloadUrl) {
          return `请查看原文：${payloadUrl}`
        }
        return '该资讯暂无摘要内容，请查看原始来源。'
      })()

      const response = await ingestionApi.promoteItem(item.id, {
        note: {
          title: options.title ?? item.title ?? '自动生成记忆',
          content: resolvedContent,
          importance: options.importance ?? 'medium',
        },
      })

      pendingItemsState.value = pendingItemsState.value.filter((current) => current.id !== item.id)

      toast.add({
        title: '记忆已生成',
        description: 'AI 已整理原文并写入记忆正文。',
        color: 'success',
      })

      return response
    } catch (error) {
      toast.add({
        title: '生成笔记失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        color: 'error',
      })
      throw error
    }
  }

  return {
    sources: computed(() => sourcesState.value),
    pendingItems: computed(() => pendingItemsState.value),
    isInitializing: computed(() => isInitializing.value),
    isSyncing: computed(() => isSyncing.value),
    isLoadingItems: computed(() => isLoadingItems.value),
    lastSyncResult: computed(() => lastSyncResult.value),
    ensureDefaultSource,
    refreshPendingItems,
    syncAndFetch,
    promoteRawItem,
  }
}

export const resetIngestionState = () => {
  useState<string | null>('ingestion-default-source', () => null).value = null
  useState<MemorySource[]>('ingestion-sources', () => []).value = []
  useState<MemoryRawItem[]>('ingestion-pending-items', () => []).value = []
}
