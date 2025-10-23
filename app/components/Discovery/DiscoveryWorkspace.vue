<script setup lang="ts">
import { computed, ref } from '#imports'
import type { MemoryRawItem } from '~/composables/services/useIngestionService'
import { useDiscoveryFeed } from '~/composables/discovery/useDiscoveryFeed'
import DiscoveryHero from '~/components/Discovery/DiscoveryHero.vue'
import DiscoveryTopicRail from '~/components/Discovery/DiscoveryTopicRail.vue'
import DiscoveryFeedList from '~/components/Discovery/DiscoveryFeedList.vue'
import DiscoverySidebar from '~/components/Discovery/DiscoverySidebar.vue'

const props = defineProps<{
  items: MemoryRawItem[]
  isLoading: boolean
  isSyncing: boolean
  lastSyncSummary: string | null
  promotingId: number | null
}>()

const emit = defineEmits<{
  (event: 'fetch', payload?: { keywords?: string[] | null; limit?: number | null }): void
  (event: 'refresh'): void
  (event: 'promote', item: MemoryRawItem): void
  (event: 'open-notes'): void
}>()

const discovery = useDiscoveryFeed({ items: computed(() => props.items) })

const {
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
} = discovery

const DEFAULT_FETCH_LIMIT = 20
const fetchLimit = ref<number | null>(DEFAULT_FETCH_LIMIT)
const searchWasActive = ref(false)

const displayItems = computed(() => {
  const items = filteredItems.value
  if (!highlightItem.value) {
    return items
  }
  return items.slice(1)
})

const promotingKey = computed(() => (props.promotingId !== null ? String(props.promotingId) : null))

const extractKeywords = () => {
  const raw = searchQuery.value.trim()
  if (!raw.length) {
    return null
  }

  const tokens = raw
    .split(/[\s,，、；;]+/)
    .map(token => token.trim())
    .filter(Boolean)

  return tokens.length ? tokens : null
}

const resolveLimit = () => fetchLimit.value

const handleFetchLatest = () => emit('fetch', {
  keywords: extractKeywords(),
  limit: resolveLimit()
})
const handleRefresh = () => emit('refresh')
const handleSearchQueryUpdate = (value: string | null | undefined) => {
  const normalized = typeof value === 'string' ? value : ''
  searchQuery.value = normalized

  const trimmed = normalized.trim()
  const previouslyActive = searchWasActive.value
  searchWasActive.value = trimmed.length > 0

  if (previouslyActive && trimmed.length === 0) {
    emit('refresh')
  }
}
const handleFetchLimitUpdate = (value: number | null) => {
  fetchLimit.value = value
}
const handleOpenLink = (item: { link: string | null }) => {
  if (!item.link || typeof window === 'undefined') {
    return
  }

  window.open(item.link, '_blank', 'noopener')
}
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <DiscoveryHero
      :search-query="searchQuery"
      :stats="stats"
      :is-syncing="isSyncing"
      :last-sync-summary="lastSyncSummary"
      :highlight="highlightItem"
      :fetch-limit="fetchLimit"
      @update:search-query="handleSearchQueryUpdate"
      @update:fetch-limit="handleFetchLimitUpdate"
      @fetch-latest="handleFetchLatest"
    />

    <div class="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div class="flex flex-col gap-5">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold tracking-wide text-gray-900 dark:text-white">
            最新资讯
          </h3>
          <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-rotate-cw"
              :loading="isLoading"
              @click="handleRefresh"
            >
              刷新列表
            </UButton>
            <span>显示 {{ displayItems.length }} / {{ stats.total }}</span>
          </div>
        </div>

        <DiscoveryFeedList
          :items="displayItems"
          :is-loading="isLoading"
          :promoting-id="promotingKey"
          @promote="item => emit('promote', item.raw)"
          @open-link="handleOpenLink"
        />
      </div>

      <div class="flex flex-col gap-6">
        <DiscoveryTopicRail
          :categories="categories"
          :trending="trendingTopics"
          :selected-category="selectedTopic"
          :selected-range="selectedTimeRange"
          @select-category="setTopic"
          @select-range="setTimeRange"
          @select-topic="setTopic"
        />

        <DiscoverySidebar :collections="curatedCollections" />
      </div>
    </div>
  </div>
</template>
