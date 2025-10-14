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
  layout?: 'vertical' | 'horizontal'
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
  detailLabel: '查看详情',
  layout: 'vertical'
})

const emit = defineEmits<{
  (event: 'select', record: NoteRecord): void
  (event: 'create'): void
  (event: 'detail', record: NoteRecord): void
}>()

const totalCount = computed(() => props.items.length)
const detailLabel = computed(() => props.detailLabel)
const isHorizontal = computed(() => props.layout === 'horizontal')

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

    <div
      v-if="items.length"
      :class="isHorizontal ? 'note-strip' : 'note-list'"
    >
      <div
        v-for="item in items"
        :key="item.id"
        role="button"
        tabindex="0"
        :class="[
          'note-list-item',
          isHorizontal ? 'note-list-item--horizontal' : 'note-list-item--vertical',
          item.id === activeId ? 'note-list-item--active' : ''
        ]"
        @click="handleSelect(item)"
        @keydown.enter.prevent="handleSelect(item)"
        @keydown.space.prevent="handleSelect(item)"
      >
        <div class="note-list-icon">
          <UIcon v-if="item.iconName" :name="item.iconName" class="text-base" />
          <span v-else class="text-base">{{ item.iconFallback }}</span>
        </div>
        <div class="note-list-content">
          <div class="note-list-header">
            <p class="note-list-title">
              {{ item.title }}
            </p>
            <div class="note-list-meta">
              <UBadge
                :label="item.badge.label"
                :color="item.badge.color"
                :variant="item.badge.variant"
                :icon="item.badge.icon"
              />
              <span class="note-list-score">价值 {{ item.score }}%</span>
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
          <p class="note-list-description">
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
.note-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.note-strip {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scroll-behavior: smooth;
}

.note-strip::-webkit-scrollbar {
  height: 6px;
}

.note-strip::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.35);
  border-radius: 999px;
}

.note-list-item {
  display: flex;
  position: relative;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border-radius: 0.9rem;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}

.note-list-item--vertical {
  align-items: flex-start;
  border: 1px solid transparent;
  background: rgba(248, 250, 252, 0.6);
}

.dark .note-list-item--vertical {
  background: rgba(30, 41, 59, 0.65);
}

.note-list-item--horizontal {
  flex-direction: column;
  min-width: 260px;
  max-width: 320px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}

.dark .note-list-item--horizontal {
  border-color: rgba(71, 85, 105, 0.4);
  box-shadow: 0 12px 32px rgba(2, 6, 23, 0.45);
}

.note-list-item:hover,
.note-list-item:focus-visible {
  background: rgba(59, 130, 246, 0.08);
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.25);
}

.note-list-item--active {
  background: rgba(59, 130, 246, 0.12);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
  border-color: rgba(59, 130, 246, 0.35);
}

.note-list-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  color: rgb(37, 99, 235);
}

.dark .note-list-icon {
  background: rgba(96, 165, 250, 0.15);
  color: rgb(147, 197, 253);
}

.note-list-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.note-list-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.note-list-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: rgb(15, 23, 42);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .note-list-title {
  color: rgb(226, 232, 240);
}

.note-list-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.note-list-score {
  font-size: 0.7rem;
  color: rgba(71, 85, 105, 0.75);
}

.dark .note-list-score {
  color: rgba(148, 163, 184, 0.7);
}

.note-list-description {
  font-size: 0.78rem;
  color: rgba(71, 85, 105, 0.78);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dark .note-list-description {
  color: rgba(148, 163, 184, 0.72);
}

@media (max-width: 768px) {
  .note-list-item {
    padding: 0.9rem 1rem;
  }

  .note-list-item--horizontal {
    min-width: 220px;
  }
}
</style>
