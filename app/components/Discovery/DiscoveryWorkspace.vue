<script setup lang="ts">
import { computed } from '#imports'
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
  (event: 'fetch'): void
  (event: 'refresh'): void
  (event: 'promote', item: MemoryRawItem): void
  (event: 'open-notes'): void
}>()

const {
  searchQuery,
  selectedTopic,
  selectedTimeRange,
  categories,
  trendingTopics,
  curatedCollections,
  stats,
  filteredItems,
  setTopic,
  setTimeRange
} = useDiscoveryFeed({ items: computed(() => props.items) })

const promotingKey = computed(() => (props.promotingId !== null ? String(props.promotingId) : null))

const handleFetchLatest = () => emit('fetch')
const handleRefresh = () => emit('refresh')
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
      @update:search-query="value => (searchQuery.value = value)"
      @fetch-latest="handleFetchLatest"
      @open-history="emit('open-notes')"
    />

    <div class="grid flex-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
      <DiscoveryTopicRail
        :categories="categories"
        :trending="trendingTopics"
        :selected-category="selectedTopic"
        :selected-range="selectedTimeRange"
        @select-category="setTopic"
        @select-range="setTimeRange"
        @select-topic="setTopic"
      />

      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
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
            <span>显示 {{ filteredItems.length }} / {{ stats.total }}</span>
          </div>
        </div>

        <DiscoveryFeedList
          :items="filteredItems"
          :is-loading="isLoading"
          :promoting-id="promotingKey"
          @promote="item => emit('promote', item.raw)"
          @open-link="handleOpenLink"
        />
      </div>

      <DiscoverySidebar :collections="curatedCollections" />
    </div>
  </div>
</template>
