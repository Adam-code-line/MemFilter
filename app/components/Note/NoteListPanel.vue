<script setup lang="ts">

export interface NoteListItem {
  id: number | string
  record: NoteRecord
  title: string
  description: string
  iconName?: string
  iconFallback?: string
  badge: {
    label: string
    color: string
    variant: 'solid' | 'soft' | 'subtle' | 'outline'
    icon?: string
  }
  score: number
}

const props = withDefaults(defineProps<{
  items: NoteListItem[]
  activeId?: number | string | null
  headerTitle?: string
  totalLabel?: string
  icon?: string
  emptyState?: {
    icon: string
    title: string
    description: string
    actionLabel: string
    actionIcon: string
  }
  detailLabel?: string
}>(), {
  items: () => [],
  activeId: null,
  headerTitle: '我的笔记',
  totalLabel: '共',
  icon: 'i-lucide-notebook-pen',
  emptyState: () => ({
    icon: 'i-lucide-notebook',
    title: '暂无笔记',
    description: '开始创建您的第一条笔记。',
    actionLabel: '新建笔记',
    actionIcon: 'i-lucide-plus'
  }),
  detailLabel: '查看详情'
})

const emit = defineEmits<{
  (event: 'select', record: NoteRecord): void
  (event: 'create'): void
  (event: 'detail', record: NoteRecord): void
}>()

const totalCount = computed(() => props.items.length)
const detailLabel = computed(() => props.detailLabel)

const handleSelect = (item: NoteListItem) => {
  emit('select', item.record)
}

const handleCreate = () => {
  emit('create')
}

const handleDetail = (item: NoteListItem) => {
  emit('detail', item.record)
}
</script>

<template>
  <UCard class="border border-gray-200/80 dark:border-white/10">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UIcon :name="icon" class="text-lg text-primary" />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ headerTitle }}
          </h2>
        </div>
        <UBadge :label="`${totalLabel}: ${totalCount}`" variant="soft" />
      </div>
    </template>

    <div v-if="items.length" class="flex flex-col divide-y divide-gray-200/70 dark:divide-white/5">
      <div
        v-for="item in items"
        :key="item.id"
        role="button"
        tabindex="0"
  class="flex items-start gap-3 px-4 py-4 text-left transition rounded-lg hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        :class="item.id === activeId ? 'bg-primary/10 ring-1 ring-primary/30 rounded-lg' : ''"
        @click="handleSelect(item)"
        @keydown.enter.prevent="handleSelect(item)"
        @keydown.space.prevent="handleSelect(item)"
      >
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UIcon v-if="item.iconName" :name="item.iconName" class="text-base" />
          <span v-else class="text-base">{{ item.iconFallback }}</span>
        </div>
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="flex-1 min-w-0 font-medium text-gray-900 dark:text-white line-clamp-1 truncate">
              {{ item.title }}
            </p>
            <div class="flex shrink-0 items-center gap-2">
              <UBadge
                :label="item.badge.label"
                :color="item.badge.color"
                :variant="item.badge.variant"
                :icon="item.badge.icon"
              />
              <span class="text-[11px] text-gray-400 dark:text-gray-500">价值 {{ item.score }}%</span>
              <UButton
                variant="ghost"
                color="primary"
                size="xs"
                icon="i-lucide-eye"
                :aria-label="detailLabel"
                class="shrink-0"
                @click.stop="handleDetail(item)"
              >
                <span class="hidden sm:inline">{{ detailLabel }}</span>
                <span class="sr-only sm:hidden">{{ detailLabel }}</span>
              </UButton>
            </div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <UIcon :name="emptyState.icon" class="text-4xl text-gray-300 dark:text-gray-600" />
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ emptyState.title }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ emptyState.description }}
        </p>
      </div>
      <UButton
        color="primary"
        :icon="emptyState.actionIcon"
        @click="handleCreate"
      >
        {{ emptyState.actionLabel }}
      </UButton>
    </div>
  </UCard>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
