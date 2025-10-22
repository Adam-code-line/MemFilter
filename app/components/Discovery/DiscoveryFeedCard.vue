<script setup lang="ts">
import { computed } from '#imports'
import type { DiscoveryFeedItem } from '~/composables/discovery/useDiscoveryFeed'

const props = defineProps<{
  item: DiscoveryFeedItem
  isPromoting: boolean
  highlight?: boolean
  variant?: 'wide' | 'compact'
}>()

const emit = defineEmits<{
  (event: 'promote', item: DiscoveryFeedItem): void
  (event: 'open-link', item: DiscoveryFeedItem): void
}>()

const publishedLabel = computed(() => {
  if (!props.item.publishedAt) {
    return '时间未知'
  }

  const date = new Date(props.item.publishedAt)
  return date.toLocaleString('zh-CN', { hour12: false })
})

const primaryTag = computed(() => props.item.tags[0] ?? '综合资讯')
const variant = computed(() => props.variant ?? 'wide')
const isCompact = computed(() => variant.value === 'compact')
</script>

<template>
  <UCard
    class="feed-card h-full border border-gray-200/70 transition hover:border-primary/40 hover:shadow-lg dark:border-slate-700/40 dark:hover:border-primary/40"
    :class="[
      highlight ? 'ring-2 ring-primary/40' : '',
      isCompact ? 'feed-card-compact' : 'feed-card-wide'
    ]"
  >
    <div class="flex flex-col" :class="isCompact ? 'gap-3' : 'gap-4'">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2" :class="isCompact ? 'text-[11px]' : ''">
            <UBadge :label="primaryTag" color="primary" variant="soft" :size="isCompact ? 'xs' : 'sm'" />
            <span class="text-xs text-gray-400 dark:text-slate-400">{{ props.item.source }}</span>
          </div>
          <h3
            class="font-semibold text-gray-900 transition-colors dark:text-white"
            :class="isCompact ? 'text-base leading-snug line-clamp-2' : 'text-lg leading-snug'"
          >
            {{ props.item.title }}
          </h3>
        </div>
        <UButton
          v-if="props.item.link"
          :variant="isCompact ? 'soft' : 'ghost'"
          size="xs"
          icon="i-lucide-external-link"
          @click="emit('open-link', props.item)"
        />
      </div>

      <p
        v-if="!isCompact"
        class="text-sm leading-relaxed text-gray-600 dark:text-slate-300"
      >
        {{ props.item.summary }}
      </p>
      <p
        v-else
        class="text-xs leading-relaxed text-gray-500 line-clamp-3 dark:text-slate-300/80"
      >
        {{ props.item.summary }}
      </p>

      <div
        class="flex flex-wrap items-center gap-3 text-gray-400 dark:text-slate-400"
        :class="isCompact ? 'text-[11px]' : 'text-xs'"
      >
        <div class="flex items-center gap-1">
          <UIcon name="i-lucide-calendar-days" class="text-primary" />
          <span>{{ publishedLabel }}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="tag in props.item.tags"
            :key="tag"
            color="neutral"
            :variant="isCompact ? 'soft' : 'outline'"
            :class="isCompact ? 'text-[10px]' : 'text-[11px]'"
            :label="tag"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-gray-400 dark:text-slate-400" :class="isCompact ? 'text-[11px]' : 'text-xs'">
          <UIcon :name="isCompact ? 'i-lucide-notebook-pen' : 'i-lucide-lightbulb'" />
          <span>{{ isCompact ? '快速收藏稍后整理。' : '快速整理这条资讯，生成结构化记忆。' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            color="primary"
            :icon="isCompact ? 'i-lucide-plus' : 'i-lucide-flashlight'"
            :size="isCompact ? 'xs' : 'sm'"
            :loading="isPromoting"
            @click="emit('promote', props.item)"
          >
            {{ isCompact ? '收藏' : '生成记忆' }}
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.feed-card {
  border-radius: 1.5rem;
  overflow: hidden;
}

.feed-card-wide {
  padding: 1.5rem;
}

.feed-card-compact {
  padding: 1.25rem;
  background: linear-gradient(160deg, rgba(248, 250, 252, 0.9), rgba(226, 232, 240, 0.4));
}

:global(.dark) .feed-card-compact {
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.75), rgba(30, 41, 59, 0.6));
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
