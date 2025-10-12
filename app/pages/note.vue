<script setup lang="ts">
import { useNotesStore } from "~~/stores/notes";

definePageMeta({
  layout: 'app'
})

const notesStore = useNotesStore()
await notesStore.ensureInitialized()
console.info('[note page] notes after init', notesStore.notes.length)

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
  forgetNote,
  refreshNotes
} = useNotesDashboard()

const {
  badge,
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

const { headerTitle, headerSubtitle, headerBadge } = usePageMeta(
  {
    title: pageTitle,
    subtitle: pageSubtitle,
    badge
  },
  {
    title: noteDefaults.pageTitle,
    subtitle: noteDefaults.pageSubtitle,
    badge: null
  }
)

const importanceOptions = computed(() => filtersConfig.value.importance ?? noteDefaults.importanceOptions)
const searchPlaceholder = computed(() => searchConfig.value.placeholder ?? noteDefaults.search.placeholder)
const timeFilterOptions = computed(() => searchConfig.value.timeOptions ?? noteDefaults.search.timeOptions)
const importanceLabel = computed(() => searchConfig.value.importanceLabel ?? noteDefaults.search.importanceLabel)
const timeLabel = computed(() => searchConfig.value.timeLabel ?? noteDefaults.search.timeLabel)

const summaryLabel = useSummaryLabel(
  computed(() => filtersConfig.value.summaryLabel),
  noteDefaults.filters.summaryLabel,
  computed(() => filteredNotes.value.length)
)

const searchText = computed({
  get: () => searchQuery.value,
  set: value => updateSearchQuery(value)
})

const { resolveImportanceBadge, useNoteItems } = useImportanceBadges()

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

const listConfigResolved = computed(() => listConfig.value ?? noteDefaults.list)
const noteListHeader = computed(() => listConfigResolved.value.title ?? noteDefaults.list.title)
const noteCreateLabel = computed(() => listConfigResolved.value.createLabel ?? noteDefaults.list.createLabel)
const totalNotesLabel = computed(() => listConfigResolved.value.totalLabel ?? noteDefaults.list.totalLabel)
const listHeaderIcon = computed(() => listConfigResolved.value.icon ?? noteDefaults.list.icon ?? 'i-lucide-notebook-pen')

const mergedEmptyState = useEmptyState(emptyStateConfig, noteDefaults.emptyState)
const listEmptyState = useEmptyState(computed(() => listConfigResolved.value.empty ?? null), noteDefaults.list.empty)

const noteListEmptyState = computed(() => {
  const listEmpty = listEmptyState.value
  const general = mergedEmptyState.value
  return {
    icon: listEmpty.icon ?? general.icon ?? noteDefaults.list.empty.icon ?? 'i-lucide-notebook',
    title: listEmpty.title ?? general.title ?? noteDefaults.list.empty.title,
    description: listEmpty.description ?? general.description ?? noteDefaults.list.empty.description,
    actionLabel: listEmpty.action?.label ?? general.action?.label ?? noteDefaults.list.empty.action?.label ?? '新建笔记',
    actionIcon: listEmpty.action?.icon ?? general.action?.icon ?? noteDefaults.list.empty.action?.icon ?? 'i-lucide-plus'
  }
})

const noteItems = useNoteItems(filteredNotes)

const totalNotesBadge = computed(() => `${totalNotesLabel.value}: ${notes.value.length}`)

const noteEditorRef = ref<{ triggerSave?: () => void } | null>(null)
const isEditorActive = computed(() => editorMode.value === 'edit' || editorMode.value === 'create')

const handleIngestionPromoted = async () => {
  await refreshNotes()
}

useKeyboardShortcut({
  key: 'Enter',
  allowInInput: true,
  stopPropagation: true,
  when: () => isEditorActive.value,
  handler: (event) => {
    if (event.repeat || event.isComposing) {
      return
    }

    const target = event.target as HTMLElement | null
    const isEditable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable

    if (isEditable && !(event.metaKey || event.ctrlKey)) {
      return
    }

    event.preventDefault()
    noteEditorRef.value?.triggerSave?.()
  }
})

useHead(() => ({
  title: headerTitle.value
}))

const timeFilterValues = ['all', 'last7', 'last30', 'last90'] as const
type TimeFilterValue = typeof timeFilterValues[number]

const { state: forgetConfirm, dialogBindings: forgetDialogBindings, openForNote: requestForget, confirm: confirmForget } = useForgetConfirm({
  onExecuteForget: note => forgetNote(note)
})

const {
  selectedNote: selectedDetailNote,
  detailDialogOpen,
  detailStatus,
  detailActions,
  openDetail,
  closeDetail,
  handleDetailAction
} = useMemoryDetailController({
  notes,
  sectionSource: memorySectionSource,
  sectionDefaults: memoryDefaults.sections,
  detailPanel: memoryDetail,
  onRestore: restoreNote,
  onAccelerate: accelerateForgetting,
  onForget: requestForget,
  onOpenNote: note => {
    openEditorForNote(note)
  }
})

const openNoteDetail = (note: NoteRecord) => {
  openDetail(note)
}

const closeNoteDetail = () => {
  closeDetail()
}

useNoteRouteSync({
  notes,
  onOpenNote: openEditorForNote
})

watch(() => forgetConfirm.value.open, value => {
  if (!value) {
    forgetConfirm.value.note = null
  }
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

const handleEditorSave = async (payload: NoteSavePayload) => {
  try {
    await saveNote(payload)
  } catch (error) {
    console.error('[note] 保存笔记失败', error)
  }
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
  <div class="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
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

        <div class="flex flex-wrap items-center gap-3 self-start">
          <UButton
            size="lg"
            color="primary"
            icon="i-lucide-plus"
            @click="openEditorForNew"
          >
            {{ noteCreateLabel }}
          </UButton>
          <NoteIngestionPanel @promoted="handleIngestionPromoted" />
        </div>
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

  <div class="grid gap-8 items-start lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
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
            ref="noteEditorRef"
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
    v-bind="forgetDialogBindings"
    @confirm="confirmForget"
    @cancel="forgetConfirm.open = false"
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
