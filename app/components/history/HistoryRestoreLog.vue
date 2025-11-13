<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    default: '恢复记录'
  },
  description: {
    type: String,
    default: undefined
  },
  emptyTitle: {
    type: String,
    default: '暂无恢复记录'
  },
  emptyDescription: {
    type: String,
    default: undefined
  },
  items: {
    type: Array as () => Array<{ id: number; title: string; restoredAt: Date; meta?: string }>,
    default: () => []
  }
})
</script>

<template>
  <UCard class="border border-gray-200/70 dark:border-white/10">
    <template #header>
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
        <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
      </div>
    </template>

    <ul v-if="items.length" class="space-y-4">
      <li
        v-for="item in items"
        :key="`${item.id}-${item.restoredAt.getTime()}`"
        class="rounded-lg border border-dashed border-primary-400/50 bg-primary-500/5 px-4 py-3"
      >
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-primary-600 dark:text-primary-300">{{ item.title }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            恢复时间：{{ item.restoredAt.toLocaleString() }}
          </p>
          <p v-if="item.meta" class="text-xs text-gray-500 dark:text-gray-400">
            {{ item.meta }}
          </p>
        </div>
      </li>
    </ul>

    <div v-else class="flex flex-col items-center gap-2 py-10 text-center">
      <UIcon name="i-lucide-book-open-check" class="text-2xl text-primary-400" />
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ emptyTitle }}</p>
      <p v-if="emptyDescription" class="text-sm text-gray-500 dark:text-gray-400">{{ emptyDescription }}</p>
    </div>
  </UCard>
</template>