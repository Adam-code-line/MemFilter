<script setup lang="ts">
  import { computed } from '#imports'

  interface CategoryEntry {
    tag: string
    label: string
    count: number
  }

  const props = defineProps<{
    categories: CategoryEntry[]
    trending: Array<{ id: string; label: string; mentions: number; tag: string }>
    selectedCategory: string
    selectedRange: 'today' | 'week' | 'month' | 'all'
  }>()

  const emit = defineEmits<{
    (event: 'select-category', value: string): void
    (event: 'select-range', value: 'today' | 'week' | 'month' | 'all'): void
    (event: 'select-topic', value: string): void
  }>()

  const timeRanges = computed(() => [
    { label: '全部时间', value: 'all' as const },
    { label: '今天', value: 'today' as const },
    { label: '近 7 日', value: 'week' as const },
    { label: '近 30 日', value: 'month' as const },
  ])
</script>

<template>
  <aside class="flex flex-col gap-6">
    <UCard class="border border-gray-200/60 dark:border-slate-700/40">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">主题分类</h3>
          <UBadge :label="categories.length - 1" variant="soft" />
        </div>
      </template>
      <div class="flex flex-col gap-2">
        <button
          v-for="category in categories"
          :key="category.tag"
          type="button"
          class="category-pill"
          :class="category.tag === selectedCategory ? 'category-pill-active' : ''"
          @click="emit('select-category', category.tag)"
        >
          <span>{{ category.label }}</span>
          <span class="category-count">{{ category.count }}</span>
        </button>
      </div>
    </UCard>

    <UCard class="border border-gray-200/60 dark:border-slate-700/40">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">时间筛选</h3>
        </div>
      </template>
      <div class="grid gap-2 sm:grid-cols-2">
        <UButton
          v-for="range in timeRanges"
          :key="range.value"
          size="xs"
          :variant="range.value === selectedRange ? 'solid' : 'outline'"
          color="primary"
          class="justify-between"
          @click="emit('select-range', range.value)"
        >
          {{ range.label }}
          <UIcon v-if="range.value === selectedRange" name="i-lucide-check" class="ml-1" />
        </UButton>
      </div>
    </UCard>

    <UCard class="border border-gray-200/60 dark:border-slate-700/40">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">热门话题</h3>
          <UBadge label="趋势" color="primary" variant="soft" />
        </div>
      </template>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="topic in trending"
          :key="topic.id"
          size="xs"
          variant="outline"
          color="neutral"
          class="rounded-full"
          @click="emit('select-topic', topic.tag)"
        >
          #{{ topic.label }}
          <span class="ml-1 text-[10px] text-gray-400">{{ topic.mentions }}</span>
        </UButton>
        <p v-if="!trending.length" class="text-xs text-gray-500 dark:text-gray-400">
          暂无趋势数据，稍后再来看看。
        </p>
      </div>
    </UCard>
  </aside>
</template>

<style scoped>
  .category-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid transparent;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: #475569;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      background-color 0.2s ease;
  }

  .category-pill:hover {
    border-color: rgba(59, 130, 246, 0.3);
    color: #2563eb;
  }

  :global(.dark) .category-pill {
    color: #e2e8f0;
  }

  :global(.dark) .category-pill:hover {
    border-color: rgba(59, 130, 246, 0.4);
    color: #60a5fa;
  }

  .category-pill-active {
    border-color: rgba(59, 130, 246, 0.6);
    background-color: rgba(59, 130, 246, 0.1);
    color: #2563eb;
  }

  :global(.dark) .category-pill-active {
    border-color: rgba(59, 130, 246, 0.5);
    background-color: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
  }

  .category-count {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  :global(.dark) .category-count {
    color: #94a3b8;
  }
</style>
