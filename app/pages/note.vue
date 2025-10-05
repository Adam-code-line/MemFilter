<script setup lang="ts">
import { computed } from 'vue'
import { useNotesDashboard } from '~/composables/note'
import type { NoteSavePayload } from '~/composables/note'

definePageMeta({
  layout: 'app'
})

useHead({
  title: '笔记管理 - 忆滤'
})

const router = useRouter()

const { data: noteCopy } = await useAsyncData('note-config', () => queryCollection('note').first())

const {
  filteredNotes,
  noteStats,
  viewMode,
  importanceFilter,
  searchQuery,
  selectedNotes,
  selectedCount,
  isEditorOpen,
  editorMode,
  editingNote,
  setViewMode,
  setImportanceFilter,
  updateSearchQuery,
  toggleSelection,
  openEditorForNew,
  openEditorForNote,
  closeEditor,
  restoreNote,
  accelerateForgetting,
  toggleCollapse,
  saveNote
} = useNotesDashboard()

const noteConfig = computed(() => noteCopy.value ?? null)

const defaultImportanceOptions = [
  { label: '全部', value: 'all', icon: 'i-lucide-layers' },
  { label: '核心笔记', value: 'high', icon: 'i-lucide-rocket' },
  { label: '重要笔记', value: 'medium', icon: 'i-lucide-target' },
  { label: '次要笔记', value: 'low', icon: 'i-lucide-sparkles' },
  { label: '噪声信息', value: 'noise', icon: 'i-lucide-waves' }
]

const importanceOptions = computed(() => noteConfig.value?.filters?.importance ?? defaultImportanceOptions)
const searchPlaceholder = computed(() => noteConfig.value?.filters?.searchPlaceholder ?? '搜索笔记内容...')

const summaryLabel = computed(() => noteConfig.value?.filters?.summaryLabel ?? '找到 {count} 条笔记')
const summaryText = computed(() => summaryLabel.value.replace('{count}', filteredNotes.value.length.toString()))

const selectedLabel = computed(() => noteConfig.value?.filters?.selectedLabel ?? '已选择 {count} 条')
const selectedSummary = computed(() => selectedCount.value > 0
  ? selectedLabel.value.replace('{count}', selectedCount.value.toString())
  : '')

const viewLabels = computed(() => ({
  card: noteConfig.value?.filters?.viewToggle?.card ?? '卡片视图',
  list: noteConfig.value?.filters?.viewToggle?.list ?? '列表视图'
}))

const headerBadge = computed(() => noteConfig.value?.badge)
const headerTitle = computed(() => noteConfig.value?.title ?? '笔记管理')
const headerSubtitle = computed(() => noteConfig.value?.subtitle ?? '')
const quickActions = computed(() => noteConfig.value?.actions ?? [])
const emptyState = computed(() => noteConfig.value?.emptyState)
const editorConfig = computed(() => noteConfig.value?.editor ?? {})
const modalTitle = computed(() => editorConfig.value?.modalTitle ?? (editorMode.value === 'edit' ? '编辑笔记' : '新建笔记'))
const modalDescription = computed(() => editorConfig.value?.modalDescription ?? '使用忆滤笔记编辑器创建或更新内容。')

const statsCards = computed(() => {
  const items = noteConfig.value?.stats?.items ?? []
  const metrics = noteStats.value
  return items.map(item => ({
    ...item,
    metric: Object.prototype.hasOwnProperty.call(metrics, item.key)
      ? (metrics as Record<string, number>)[item.key]
      : null
  }))
})

const handleQuickAction = (action: any) => {
  if (action.key === 'create') {
    openEditorForNew()
    return
  }

  if (action.to) {
    router.push(action.to)
    return
  }

  if (action.href && process.client) {
    window.open(action.href, action.target ?? '_blank')
  }
}

const handleEditorSave = (payload: NoteSavePayload) => {
  saveNote(payload)
}

const handleEditorCancel = () => {
  closeEditor()
}

const handleContentChange = (_value: string) => {
  // no-op placeholder for now; consumers can react to content edits later
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <UModal v-model="isEditorOpen" class="max-w-4xl w-full">
      <template #title>
        <span class="sr-only">{{ modalTitle }}</span>
      </template>
      <template #description>
        <span class="sr-only">{{ modalDescription }}</span>
      </template>
      <div class="w-full max-w-3xl mx-auto">
        <NoteEditor
          class="w-full"
          :initial-title="editingNote?.title"
          :initial-content="editingNote?.content"
          :fade-level="editingNote?.fadeLevel ?? 0"
          :mode="editorMode"
          :config="editorConfig"
          @save="handleEditorSave"
          @cancel="handleEditorCancel"
          @content-change="handleContentChange"
        />
      </div>
    </UModal>

    <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-3">
          <UBadge
            v-if="headerBadge"
            :label="headerBadge.label"
            :color="headerBadge.color ?? 'primary'"
            :variant="headerBadge.variant ?? 'soft'"
            :icon="headerBadge.icon"
          />
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ headerTitle }}
          </h1>
        </div>
        <p v-if="headerSubtitle" class="text-gray-600 dark:text-gray-400 max-w-2xl">
          {{ headerSubtitle }}
        </p>
      </div>

      <UFieldGroup size="md" variant="ghost" class="self-start">
        <UButton
          :variant="viewMode === 'card' ? 'solid' : 'ghost'"
          icon="i-lucide-grid-3x3"
          @click="setViewMode('card')"
        >
          {{ viewLabels.card }}
        </UButton>
        <UButton
          :variant="viewMode === 'list' ? 'solid' : 'ghost'"
          icon="i-lucide-list"
          @click="setViewMode('list')"
        >
          {{ viewLabels.list }}
        </UButton>
      </UFieldGroup>
    </div>

    <div v-if="quickActions.length" class="flex flex-wrap gap-3">
      <UButton
        v-for="action in quickActions"
        :key="action.key ?? action.label"
        :label="action.label"
        :icon="action.icon"
        :variant="action.variant ?? 'outline'"
        :color="action.color ?? 'neutral'"
        size="lg"
        @click="handleQuickAction(action)"
      />
    </div>

    <div v-if="statsCards.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <CommonFloatingCard
        v-for="(card, index) in statsCards"
        :key="card.key ?? index"
        :title="card.title"
        :description="card.description"
        :icon="card.icon"
        :size="card.size ?? 'sm'"
        :variant="card.variant ?? 'glass'"
        :animation-type="card.animation?.type ?? 'float'"
        :animation-delay="card.animation?.delay ?? index * 0.15"
        class="stats-card"
      >
        <template #default>
          <div v-if="card.metric !== null" class="text-3xl font-semibold text-blue-600 dark:text-blue-400 text-center">
            {{ card.metric }}
          </div>
        </template>
      </CommonFloatingCard>
    </div>

    <UCard class="border border-gray-200/80 dark:border-white/10">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            :model-value="searchQuery"
            :placeholder="searchPlaceholder"
            icon="i-lucide-search"
            class="w-full min-w-[240px] sm:w-72"
            @update:model-value="updateSearchQuery"
          />

          <USelectMenu
            :model-value="importanceFilter"
            :options="importanceOptions"
            option-attribute="label"
            value-attribute="value"
            size="md"
            class="min-w-[180px]"
            @update:model-value="setImportanceFilter"
          />
        </div>

        <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>{{ summaryText }}</span>
          <UBadge
            v-if="selectedSummary"
            :label="selectedSummary"
            color="primary"
            variant="soft"
          />
        </div>
      </div>
    </UCard>

    <div v-if="filteredNotes.length" class="space-y-6">
      <div v-if="viewMode === 'card'" class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MemoryCard
          v-for="note in filteredNotes"
          :key="note.id"
          :title="note.title"
          :date="note.date"
          :snippet="note.content"
          :icon="note.icon"
          :importance="note.importance"
          :importance-score="note.importanceScore"
          :fade-level="note.fadeLevel"
          :forgetting-progress="note.forgettingProgress"
          :days-until-forgotten="note.daysUntilForgotten"
          :last-accessed="note.lastAccessed"
          :is-collapsed="note.isCollapsed"
          class="memory-card-item"
          @open="openEditorForNote(note)"
          @restore="restoreNote(note)"
          @accelerate-forgetting="accelerateForgetting(note)"
          @toggle-collapse="toggleCollapse(note)"
        />
      </div>

      <UCard v-else class="border border-gray-200/70 dark:border-white/10">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ noteConfig?.list?.title ?? '笔记列表' }}
            </h2>
            <UBadge :label="`${filteredNotes.length} 条`" variant="soft" />
          </div>
        </template>

        <div class="space-y-2">
          <MemoryItem
            v-for="note in filteredNotes"
            :key="note.id"
            :title="note.title"
            :date="note.date"
            :snippet="note.content"
            :icon="note.icon"
            :importance="note.importance"
            :importance-score="note.importanceScore"
            :fade-level="note.fadeLevel"
            :forgetting-progress="note.forgettingProgress"
            :days-until-forgotten="note.daysUntilForgotten"
            :is-collapsed="note.isCollapsed"
            :is-selected="selectedNotes.includes(note.id)"
            @select="toggleSelection(note.id)"
            @view="openEditorForNote(note)"
            @edit="openEditorForNote(note)"
            @restore="restoreNote(note)"
            @expand="toggleCollapse(note)"
            @accelerate-forgetting="accelerateForgetting(note)"
          />
        </div>

        <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>{{ selectedSummary || summaryText }}</span>
            <UButton
              variant="ghost"
              size="sm"
              icon="i-lucide-plus"
              @click="openEditorForNew"
            >
              {{ noteConfig?.list?.createLabel ?? '新建笔记' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <div v-else class="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <UIcon
        :name="emptyState?.icon ?? 'i-lucide-notebook'"
        class="text-5xl text-gray-300 dark:text-gray-600"
      />
      <div class="space-y-2">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ emptyState?.title ?? '没有找到匹配的笔记' }}
        </h3>
        <p class="text-gray-600 dark:text-gray-400">
          {{ emptyState?.description ?? '开始创建您的第一条笔记吧。' }}
        </p>
      </div>
      <UButton
        :label="emptyState?.actionLabel ?? '新建笔记'"
        icon="i-lucide-plus"
        size="lg"
        @click="openEditorForNew"
      />
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.memory-card-item {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.memory-card-item:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 36px rgba(15, 23, 42, 0.18);
}

@media (max-width: 768px) {
  .memory-card-item:hover {
    transform: none;
    box-shadow: none;
  }
}
</style>
