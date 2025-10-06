<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    default: '最近遗忘事件'
  },
  description: {
    type: String,
    default: undefined
  },
  emptyTitle: {
    type: String,
    default: '暂无记录'
  },
  emptyDescription: {
    type: String,
    default: undefined
  },
  events: {
    type: Array as () => Array<{
      id: number
      title: string
      snippet: string
      timestamp: string
      status: 'recoverable' | 'archived'
      icon?: string
    }>,
    default: () => []
  }
})

const emit = defineEmits<{
  inspect: [eventId: number]
}>()

const statusColors: Record<string, string> = {
  recoverable: 'bg-amber-500/80',
  archived: 'bg-slate-400/80'
}
const statusLabels: Record<string, string> = {
  recoverable: '等待决策',
  archived: '已折叠'
}
</script>

<template>
  <UCard class="border border-gray-200/70 dark:border-white/10">
    <template #header>
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
        <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
      </div>
    </template>

    <div v-if="events.length" class="space-y-6">
      <div
        v-for="item in events"
        :key="item.id"
        class="group relative pl-8"
      >
        <span
          class="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white shadow ring-4 ring-primary-500/10 dark:border-slate-900"
          :class="statusColors[item.status] || 'bg-slate-400/80'"
        />
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ item.title }}</span>
            <UBadge :label="statusLabels[item.status] || '已淡化'" size="xs" variant="soft" />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.timestamp }}</p>
          <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{{ item.snippet }}</p>
          <UButton
            variant="ghost"
            size="2xs"
            class="self-start opacity-0 transition group-hover:opacity-100"
            icon="i-lucide-eye"
            @click="emit('inspect', item.id)"
          >
            查看详情
          </UButton>
        </div>
      </div>
    </div>
    <div v-else class="flex flex-col items-center gap-2 py-10 text-center">
      <UIcon name="i-lucide-sparkles" class="text-2xl text-primary-400" />
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ emptyTitle }}</p>
      <p v-if="emptyDescription" class="text-sm text-gray-500 dark:text-gray-400">{{ emptyDescription }}</p>
    </div>
  </UCard>
</template>
