<script setup lang="ts">
  import { computed } from '#imports'
  import DiscoveryFeedCard from '~/components/Discovery/DiscoveryFeedCard.vue'
  import type { DiscoveryFeedItem } from '~/composables/discovery/useDiscoveryFeed'

  const props = defineProps<{
    items: DiscoveryFeedItem[]
    promotingId: string | null
    isLoading: boolean
  }>()

  const emit = defineEmits<{
    (event: 'promote', item: DiscoveryFeedItem): void
    (event: 'open-link', item: DiscoveryFeedItem): void
  }>()

  type FeedGroup =
    | { type: 'wide'; item: DiscoveryFeedItem }
    | { type: 'compact'; items: DiscoveryFeedItem[] }

  const layoutGroups = computed<FeedGroup[]>(() => {
    const groups: FeedGroup[] = []
    const source = props.items
    let index = 0

    while (index < source.length) {
      groups.push({ type: 'wide', item: source[index] })
      index += 1

      if (index >= source.length) {
        break
      }

      const compactItems = source.slice(index, index + 3)
      groups.push({ type: 'compact', items: compactItems })
      index += compactItems.length
    }

    return groups
  })

  const groupKey = (group: FeedGroup, idx: number) => {
    if (group.type === 'wide') {
      return `wide-${group.item.id}`
    }
    return `compact-${group.items.map((item) => item.id).join('-')}-${idx}`
  }
</script>

<template>
  <div class="discover-feed">
    <div v-if="isLoading" class="space-y-4">
      <USkeleton v-for="n in 4" :key="n" class="h-36 rounded-3xl" />
    </div>
    <div v-else-if="!items.length" class="empty-state">
      <UIcon name="i-lucide-compass" class="text-4xl text-primary" />
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">暂无符合条件的资讯</h3>
      <p class="text-sm text-gray-500 dark:text-slate-400">尝试调整筛选条件或重新同步最新资讯。</p>
    </div>
    <div v-else class="feed-layout">
      <template v-for="(group, index) in layoutGroups" :key="groupKey(group, index)">
        <DiscoveryFeedCard
          v-if="group.type === 'wide'"
          :item="group.item"
          :variant="'wide'"
          :is-promoting="promotingId === group.item.id"
          @promote="emit('promote', $event)"
          @open-link="emit('open-link', $event)"
        />
        <div v-else class="compact-grid">
          <DiscoveryFeedCard
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :variant="'compact'"
            :is-promoting="promotingId === item.id"
            @promote="emit('promote', $event)"
            @open-link="emit('open-link', $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
  .discover-feed {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    border-radius: 1.5rem;
    border: 1px dashed rgba(203, 213, 225, 0.7);
    background-color: rgba(255, 255, 255, 0.8);
    padding: 4rem 1.5rem;
    text-align: center;
  }

  :global(.dark) .empty-state {
    border-color: rgba(71, 85, 105, 0.4);
    background-color: rgba(15, 23, 42, 0.6);
  }

  .feed-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .compact-grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  @media (min-width: 1280px) {
    .compact-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
