<script setup lang="ts">
import { computed } from '#imports'
import type { DiscoveryFeedItem } from '~/composables/discovery/useDiscoveryFeed'

const props = defineProps<{
  item: DiscoveryFeedItem
  isPromoting: boolean
  highlight?: boolean
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
</script>

<template>
  <UCard
    class="h-full border border-gray-200/70 transition hover:border-primary/40 hover:shadow-lg dark:border-slate-700/40 dark:hover:border-primary/40"
    :class="highlight ? 'ring-2 ring-primary/40' : ''"
  >
    <div class="flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge :label="primaryTag" color="primary" variant="soft" />
            <span class="text-xs text-gray-400 dark:text-slate-400">{{ props.item.source }}</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ props.item.title }}
          </h3>
        </div>
        <UButton
          v-if="props.item.link"
          variant="ghost"
          size="xs"
          icon="i-lucide-external-link"
          @click="emit('open-link', props.item)"
        />
      </div>

      <p class="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
        {{ props.item.summary }}
      </p>

      <div class="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-slate-400">
        <div class="flex items-center gap-1">
          <UIcon name="i-lucide-calendar-days" class="text-primary" />
          <span>{{ publishedLabel }}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="tag in props.item.tags"
            :key="tag"
            color="neutral"
            variant="outline"
            class="text-[10px]"
            :label="tag"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-400">
          <UIcon name="i-lucide-lightbulb" />
          <span>快速整理这条资讯，生成结构化记忆。</span>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            color="primary"
            icon="i-lucide-flashlight"
            :loading="isPromoting"
            @click="emit('promote', props.item)"
          >
            生成记忆
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
