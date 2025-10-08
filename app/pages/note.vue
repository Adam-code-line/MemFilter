<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNoteContent, useNotesDashboard } from '~/composables/note'
import type { ImportanceLevel, NoteRecord, NoteSavePayload } from '~/composables/note'
import { useMemoryContent } from '~/composables/memory/useMemoryContent'

definePageMeta({
  layout: 'app'
})

const {
  notes,
  filteredNotes,
  importanceFilter,
  searchQuery,
  timeFilter,
  editorMode,
  editingNote,
  activeNoteId,
  setImportanceFilter,
  setTimeFilter,
  updateSearchQuery,
  openEditorForNew,
  openEditorForNote,
  closeEditor,
  saveNote,
  restoreNote,
  accelerateForgetting,
  forgetNote
} = useNotesDashboard()

const route = useRoute()
const router = useRouter()

const {
  badge: headerBadge,
  pageTitle,
  pageSubtitle,
  filters: filtersConfig,
  search: searchConfig,
  list: listConfig,
  emptyState: emptyStateConfig,
  editor: editorConfig,
  defaults: noteDefaults
} = await useNoteContent()

const {
  detail: memoryDetail,
  sectionSource: memorySectionSource,
  defaults: memoryDefaults
} = await useMemoryContent()

const importanceOptions = computed(() => filtersConfig.value.importance ?? noteDefaults.importanceOptions)
const searchConfigResolved = computed(() => searchConfig.value ?? noteDefaults.search)
const searchPlaceholder = computed(() => searchConfigResolved.value.placeholder ?? noteDefaults.search.placeholder)
const timeFilterOptions = computed(() => searchConfigResolved.value.timeOptions ?? noteDefaults.search.timeOptions)
const importanceLabel = computed(() => searchConfigResolved.value.importanceLabel ?? noteDefaults.search.importanceLabel)
const timeLabel = computed(() => searchConfigResolved.value.timeLabel ?? noteDefaults.search.timeLabel)

const headerTitle = computed(() => pageTitle.value ?? noteDefaults.pageTitle)
const headerSubtitle = computed(() => pageSubtitle.value ?? noteDefaults.pageSubtitle)
const emptyState = computed(() => emptyStateConfig.value ?? noteDefaults.emptyState)
const summaryLabel = computed(() => {
  const template = filtersConfig.value.summaryLabel ?? noteDefaults.filters.summaryLabel
  return template.replace('{count}', String(filteredNotes.value.length))
})
const totalNotesBadge = computed(() => `${totalNotesLabel.value}: ${notes.value.length}`)

useHead(() => ({
  title: headerTitle.value
}))

const searchText = computed({
  get: () => searchQuery.value,
  set: value => updateSearchQuery(value)
})

const importanceBadgeMap: Record<ImportanceLevel, { label: string; color: string; variant: 'solid' | 'soft' | 'subtle' | 'outline'; icon: string }> = {
  high: { label: '核心记忆', color: 'primary', variant: 'solid', icon: 'i-lucide-flame' },
  medium: { label: '重点追踪', color: 'amber', variant: 'soft', icon: 'i-lucide-target' },
  low: { label: '随手记录', color: 'gray', variant: 'subtle', icon: 'i-lucide-pen-line' },
  noise: { label: '噪声过滤', color: 'neutral', variant: 'outline', icon: 'i-lucide-waves' }
}

const timeFilterValues = ['all', 'last7', 'last30', 'last90'] as const
type TimeFilterValue = typeof timeFilterValues[number]

const resolveImportanceBadge = (importance: ImportanceLevel) =>
  importanceBadgeMap[importance] ?? { label: '未分类', color: 'neutral', variant: 'subtle', icon: 'i-lucide-circle' }

const editorHeadline = computed(() => {
  if (editorMode.value === 'edit') {
    return editingNote.value?.title ? `编辑：${editingNote.value.title}` : '编辑笔记'
  }
  return '新建笔记'
})

const editorSubtext = computed(() => {
  if (editorMode.value === 'edit') {
    return '更新当前记忆内容并保持其价值标签最新。'
  }
  return '记录新的灵感与想法，AI 会自动评估其重要度。'
})

const isEditingExisting = computed(() => editorMode.value === 'edit' && !!editingNote.value)

const editingBadge = computed(() => (editingNote.value ? resolveImportanceBadge(editingNote.value.importance) : null))

const listEmpty = computed(() => listConfig.value?.empty ?? noteDefaults.list.empty)
const noteListHeader = computed(() => listConfig.value?.title ?? noteDefaults.list.title)
const noteCreateLabel = computed(() => listConfig.value?.createLabel ?? noteDefaults.list.createLabel)
const totalNotesLabel = computed(() => listConfig.value?.totalLabel ?? noteDefaults.list.totalLabel)
const listHeaderIcon = computed(() => listConfig.value?.icon ?? noteDefaults.list.icon ?? 'i-lucide-notebook-pen')
const emptyListTitle = computed(() => listEmpty.value?.title ?? emptyState.value?.title ?? noteDefaults.list.empty.title)
const emptyListDescription = computed(() => listEmpty.value?.description ?? emptyState.value?.description ?? noteDefaults.list.empty.description)
const emptyListActionLabel = computed(() => listEmpty.value?.action?.label ?? emptyState.value?.action?.label ?? noteDefaults.list.empty.action.label)
const emptyListActionIcon = computed(() => listEmpty.value?.action?.icon ?? emptyState.value?.action?.icon ?? noteDefaults.list.empty.action.icon ?? 'i-lucide-plus')
const emptyListIcon = computed(() => emptyState.value?.icon ?? 'i-lucide-notebook')
const noteListEmptyState = computed(() => ({
  icon: emptyListIcon.value,
  title: emptyListTitle.value,
  description: emptyListDescription.value,
  actionLabel: emptyListActionLabel.value,
  actionIcon: emptyListActionIcon.value
}))

const noteItems = computed(() =>
  filteredNotes.value.map(note => {
    const badge = resolveImportanceBadge(note.importance)
    return {
      id: note.id,
      record: note,
      title: note.title || '未命名笔记',
      description: note.date ?? '',
      iconName: typeof note.icon === 'string' && note.icon.startsWith('i-') ? note.icon : undefined,
      iconFallback: typeof note.icon === 'string' && !note.icon.startsWith('i-') ? note.icon : '📝',
      badge,
      score: Math.round(note.importanceScore ?? 0)
    }
  })
)

const detailDialogOpen = ref(false)
const selectedDetailNote = ref<NoteRecord | null>(null)

const resolveMemoryBucket = (note: NoteRecord | null): 'fresh' | 'fading' | 'archived' | null => {
  if (!note) {
    return null
  }

  const fadeLevel = note.fadeLevel ?? 0

  if (fadeLevel >= 4 || note.isCollapsed) {
    return 'archived'
  }

  if (fadeLevel >= 1) {
    return 'fading'
  }

  if (note.importance !== 'high' && (note.forgettingProgress ?? 0) > 50) {
    return 'fading'
  }

  return 'fresh'
}

const detailStatus = computed(() => {
  const note = selectedDetailNote.value
  if (!note) {
    return null
  }

  if ((note.fadeLevel ?? 0) >= 4) {
    return {
      label: '已彻底遗忘',
      color: 'error'
    }
  }

  const bucket = resolveMemoryBucket(note)
  if (!bucket) {
    return null
  }

  const defaults = memoryDefaults.sections.find(item => item.key === bucket)
  const config = memorySectionSource.value.find(item => item.key === bucket)

  return {
    label: config?.title ?? defaults?.title ?? '',
    color: config?.accent ?? defaults?.accent ?? 'primary'
  }
})

const buildDetailActions = (note: NoteRecord | null) => {
  if (!note) {
    return []
  }

  const actionsConfig = memoryDetail.value.actions
  const actions: Array<{
    key: string
    label: string
    icon?: string
    color?: string
    variant?: 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'
    tooltip?: string
  }> = []

  if ((note.fadeLevel ?? 0) > 0 || note.isCollapsed) {
    actions.push({
      key: 'restore',
      ...actionsConfig.restore
    })
  }

  if ((note.forgettingProgress ?? 0) < 100 && (note.fadeLevel ?? 0) < 4) {
    actions.push({
      key: 'accelerate',
      ...actionsConfig.accelerate
    })
  }

  if ((note.fadeLevel ?? 0) < 4) {
    actions.push({
      key: 'forget',
      ...actionsConfig.forget
    })
  }

  actions.push({
    key: 'edit',
    label: '在编辑器中打开',
    icon: 'i-lucide-square-pen',
    color: 'primary',
    variant: 'soft'
  })

  return actions
}

const detailActions = computed(() => buildDetailActions(selectedDetailNote.value))

const openNoteDetail = (note: NoteRecord) => {
  selectedDetailNote.value = note
  detailDialogOpen.value = true
}

const closeNoteDetail = () => {
  detailDialogOpen.value = false
}

const forgetConfirm = ref({
  open: false,
  note: null as NoteRecord | null,
  title: '',
  description: '',
  confirmLabel: '确认',
  confirmColor: 'error' as const,
  confirmVariant: 'solid' as const,
  icon: 'i-lucide-alert-triangle'
})

const resetForgetConfirm = () => {
  forgetConfirm.value = {
    open: false,
    note: null,
    title: '',
    description: '',
    confirmLabel: '确认',
    confirmColor: 'error',
    confirmVariant: 'solid',
    icon: 'i-lucide-alert-triangle'
  }
}

const requestForget = (note: NoteRecord) => {
  forgetConfirm.value = {
    open: true,
    note,
    title: note.importance === 'high' ? '确认折叠核心记忆？' : '确认遗忘这条记忆？',
    description: note.importance === 'high'
      ? `《${note.title || '未命名笔记'}》被标记为核心记忆，确认后将进入折叠区，可在遗忘日志中彻底清理。`
      : `遗忘后《${note.title || '未命名笔记'}》将立即归档并从活跃列表移除。`,
    confirmLabel: '确认遗忘',
    confirmColor: 'error',
    confirmVariant: 'solid',
    icon: note.importance === 'high' ? 'i-lucide-shield-alert' : 'i-lucide-alert-triangle'
  }
}

const handleDetailAction = (key: string) => {
  const note = selectedDetailNote.value
  if (!note) {
    return
  }

  switch (key) {
    case 'restore':
      restoreNote(note)
      break
    case 'accelerate':
      accelerateForgetting(note)
      break
    case 'forget':
      requestForget(note)
      break
    case 'edit':
      openEditorForNote(note)
      detailDialogOpen.value = false
      break
    default:
      break
  }
}

const confirmForget = () => {
  const note = forgetConfirm.value.note
  if (!note) {
    resetForgetConfirm()
    return
  }

  forgetNote(note)
  resetForgetConfirm()
}

watch(notes, newNotes => {
  if (!newNotes.length) {
    selectedDetailNote.value = null
    detailDialogOpen.value = false
    return
  }

  if (selectedDetailNote.value) {
    const refreshed = newNotes.find(item => item.id === selectedDetailNote.value?.id)
    if (refreshed) {
      selectedDetailNote.value = refreshed
    }
  }
})

watch(() => forgetConfirm.value.open, value => {
  if (!value) {
    forgetConfirm.value.note = null
  }
})

const pendingNoteId = ref<string | null>(null)

const clearRouteNoteId = () => {
  if (route.query.noteId === undefined) {
    return
  }

  const nextQuery = { ...route.query } as Record<string, any>
  delete nextQuery.noteId
  router.replace({ query: nextQuery })
}

watch(
  () => route.query.noteId,
  value => {
    if (Array.isArray(value)) {
      pendingNoteId.value = value[0] ?? null
    } else if (typeof value === 'string') {
      pendingNoteId.value = value
    } else {
      pendingNoteId.value = null
    }
  },
  { immediate: true }
)

watch([notes, pendingNoteId], ([noteList, noteId]) => {
  if (!noteId) {
    return
  }

  const target = noteList.find(note => String(note.id) === noteId)
  if (!target) {
    return
  }

  openEditorForNote(target)
  pendingNoteId.value = null
  clearRouteNoteId()
})

const handleImportanceChange = (value: string | null) => {
  const nextValue = (value ?? 'all') as 'all' | ImportanceLevel
  setImportanceFilter(nextValue)
}

const handleTimeFilterChange = (value: string | null) => {
  const normalized = (value ?? 'all') as string
  const nextValue: TimeFilterValue = timeFilterValues.includes(normalized as TimeFilterValue) ? (normalized as TimeFilterValue) : 'all'
  setTimeFilter(nextValue)
}

const handleSearchTrigger = () => {
  updateSearchQuery(searchText.value.trim())
}

const handleEditorSave = (payload: NoteSavePayload) => {
  saveNote(payload)
}

const handleEditorCancel = () => {
  closeEditor()
}

const handleContentChange = (_value: string) => {
  // 占位钩子，未来可在此响应内容变化
}

const resetFilters = () => {
  updateSearchQuery('')
  setImportanceFilter('all')
  setTimeFilter('all')
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      <UButton
        size="lg"
        color="primary"
        icon="i-lucide-plus"
        class="self-start"
        @click="openEditorForNew"
      >
        {{ noteCreateLabel }}
      </UButton>
    </div>

    <UCard class="border border-gray-200/80 dark:border-white/10">
      <div class="space-y-4">
        <CommonSearchToolbar
          v-model="searchText"
          :placeholder="searchPlaceholder"
          :importance-options="importanceOptions"
          :importance-value="importanceFilter"
          :importance-label="importanceLabel"
          :time-options="timeFilterOptions"
          :time-value="timeFilter"
          :time-label="timeLabel"
          layout="horizontal"
          clear-label="重置筛选"
          search-label="查找笔记"
          @update:importance="handleImportanceChange"
          @update:time="handleTimeFilterChange"
          @search="handleSearchTrigger"
          @reset="resetFilters"
        />

        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span>{{ summaryLabel }}</span>
          <UBadge
            :label="totalNotesBadge"
            color="neutral"
            variant="soft"
          />
        </div>
      </div>
    </UCard>

    <div class="grid gap-8 items-start lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.6fr)] xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.5fr)]">
      <aside>
        <UCard class="border border-primary/20 dark:border-primary/40 shadow-lg/40 lg:sticky lg:top-24">
          <template #header>
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
                  {{ editorHeadline }}
                </h2>
                <UButton
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-plus"
                  class="shrink-0"
                  @click="openEditorForNew"
                >
                  {{ noteCreateLabel }}
                </UButton>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ editorSubtext }}
              </p>
              <div v-if="isEditingExisting" class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <UBadge
                  v-if="editingBadge"
                  :label="editingBadge.label"
                  :color="editingBadge.color"
                  :variant="editingBadge.variant"
                  :icon="editingBadge.icon"
                />
                <UBadge
                  v-if="typeof editingNote?.importanceScore === 'number'"
                  :label="`价值 ${Math.round(editingNote.importanceScore ?? 0)}%`"
                  color="primary"
                  variant="outline"
                  icon="i-lucide-activity"
                />
                <span v-if="editingNote?.lastAccessed">最近访问：{{ editingNote.lastAccessed }}</span>
                <span v-if="editingNote?.date">创建时间：{{ editingNote.date }}</span>
              </div>
            </div>
          </template>

          <NoteEditor
            :key="editingNote?.id ?? editorMode"
            class="w-full lg:min-h-[560px]"
            :initial-title="editingNote?.title"
            :initial-content="editingNote?.content"
            :initial-description="editingNote?.description"
            :fade-level="editingNote?.fadeLevel ?? 0"
            :initial-importance="editingNote?.importance"
            :mode="editorMode"
            :config="editorConfig"
            @save="handleEditorSave"
            @cancel="handleEditorCancel"
            @content-change="handleContentChange"
          />
        </UCard>
      </aside>

      <section class="w-full">
        <NoteListPanel
          :items="noteItems"
          :active-id="activeNoteId ?? undefined"
          :header-title="noteListHeader"
          :total-label="totalNotesLabel"
          :icon="listHeaderIcon"
          :empty-state="noteListEmptyState"
          @select="openEditorForNote"
          @create="openEditorForNew"
          @detail="openNoteDetail"
        />
      </section>
    </div>
  </div>

  <MemoryDetailDialog
    v-model="detailDialogOpen"
    :title="memoryDetail.title"
    :eyebrow="memoryDetail.eyebrow"
    :clear-label="memoryDetail.clearLabel"
    :note="selectedDetailNote"
    :actions="detailActions"
    :status-label="detailStatus?.label"
    :status-color="detailStatus?.color"
    width="sm:max-w-4xl"
    @action="handleDetailAction"
    @close="closeNoteDetail"
  />

  <CommonConfirmDialog
    v-model="forgetConfirm.open"
    :title="forgetConfirm.title"
    :description="forgetConfirm.description"
    :icon="forgetConfirm.icon"
    :confirm-label="forgetConfirm.confirmLabel"
    :confirm-color="forgetConfirm.confirmColor"
    :confirm-variant="forgetConfirm.confirmVariant"
    @confirm="confirmForget"
    @cancel="resetForgetConfirm"
  />
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
