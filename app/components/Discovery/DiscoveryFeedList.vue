<script setup lang="ts">
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
    <div v-else class="grid lg:grid-cols-1">
      <DiscoveryFeedCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :is-promoting="promotingId === item.id"
        @promote="emit('promote', $event)"
        @open-link="emit('open-link', $event)"
      />
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
</style>
