<script setup lang="ts">
  import { useNotesStore } from '~~/stores/notes'
  import { getAIImportanceScore } from '~/composables/note/useAIImportanceScore'
  import type {
    ImportanceLevel,
    NoteRecord,
    NoteSavePayload,
    NoteAIEvaluation,
    NoteAICompression,
  } from '~/composables/note/types'

  definePageMeta({
    layout: 'app',
  })

  const notesStore = useNotesStore()
  const router = useRouter()

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
    forgetNote,
    setNoteAIEvaluation,
    setNoteAICompression,
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
    defaults: noteDefaults,
  } = await useNoteContent()

  const { headerTitle, headerSubtitle, headerBadge } = usePageMeta(
    {
      title: pageTitle,
      subtitle: pageSubtitle,
      badge,
    },
    {
      title: noteDefaults.pageTitle,
      subtitle: noteDefaults.pageSubtitle,
      badge: null,
    }
  )

  const importanceOptions = computed(
    () => filtersConfig.value.importance ?? noteDefaults.importanceOptions
  )
  const searchPlaceholder = computed(
    () => searchConfig.value.placeholder ?? noteDefaults.search.placeholder
  )
  const timeFilterOptions = computed(
    () => searchConfig.value.timeOptions ?? noteDefaults.search.timeOptions
  )
  const importanceLabel = computed(
    () => searchConfig.value.importanceLabel ?? noteDefaults.search.importanceLabel
  )
  const timeLabel = computed(() => searchConfig.value.timeLabel ?? noteDefaults.search.timeLabel)

  const summaryLabelTemplate = useSummaryLabel(
    computed(() => filtersConfig.value.summaryLabel),
    noteDefaults.filters.summaryLabel,
    computed(() => filteredNotes.value.length)
  )

  const summaryLabel = computed(() => {
    if (!notesStore.isHydrated) {
      return '正在同步笔记...'
    }
    return summaryLabelTemplate.value
  })

  const searchText = computed({
    get: () => searchQuery.value,
    set: (value) => updateSearchQuery(value),
  })

  const { resolveImportanceBadge, useNoteItems } = useImportanceBadges()

  const editorHeadline = computed(() => (editorMode.value === 'edit' ? '编辑' : '新建笔记'))

  const editorSubtext = computed(() => {
    if (editorMode.value === 'edit') {
      return '更新当前记忆内容并保持其价值标签最新。'
    }
    return '记录新的灵感与想法，AI 会自动评估其重要度。'
  })

  const isEditingExisting = computed(() => editorMode.value === 'edit' && !!editingNote.value)

  const editingBadge = computed(() =>
    editingNote.value ? resolveImportanceBadge(editingNote.value.importance) : null
  )
  const editingAIScore = computed(() => getAIImportanceScore(editingNote.value))

  const editorHeaderBadges = computed(() => {
    if (!isEditingExisting.value) {
      return []
    }

    const badges: Array<{
      label: string
      color: string
      variant: 'solid' | 'soft' | 'subtle' | 'outline'
      icon?: string
    }> = []
    if (editingBadge.value) {
      badges.push(editingBadge.value)
    }

    if (typeof editingAIScore.value === 'number') {
      badges.push({
        label: `AI 价值 ${Math.round(editingAIScore.value)}%`,
        color: 'primary',
        variant: 'outline',
        icon: 'i-lucide-activity',
      })
    }

    return badges
  })

  const editorHeaderInfo = computed(() => {
    if (!isEditingExisting.value || !editingNote.value) {
      return [] as string[]
    }

    const info: string[] = []

    if (editingNote.value.lastAccessed) {
      info.push(`最近访问：${editingNote.value.lastAccessed}`)
    }

    if (editingNote.value.date) {
      info.push(`创建时间：${editingNote.value.date}`)
    }

    return info
  })

  const listConfigResolved = computed(() => listConfig.value ?? noteDefaults.list)
  const noteListHeader = computed(() => listConfigResolved.value.title ?? noteDefaults.list.title)
  const noteCreateLabel = computed(
    () => listConfigResolved.value.createLabel ?? noteDefaults.list.createLabel
  )
  const totalNotesLabel = computed(
    () => listConfigResolved.value.totalLabel ?? noteDefaults.list.totalLabel
  )
  const listHeaderIcon = computed(
    () => listConfigResolved.value.icon ?? noteDefaults.list.icon ?? 'i-lucide-notebook-pen'
  )

  const mergedEmptyState = useEmptyState(emptyStateConfig, noteDefaults.emptyState)
  const listEmptyState = useEmptyState(
    computed(() => listConfigResolved.value.empty ?? null),
    noteDefaults.list.empty
  )

  const noteListEmptyState = computed(() => {
    const listEmpty = listEmptyState.value
    const general = mergedEmptyState.value
    return {
      icon: listEmpty.icon ?? general.icon ?? noteDefaults.list.empty.icon ?? 'i-lucide-notebook',
      title: listEmpty.title ?? general.title ?? noteDefaults.list.empty.title,
      description:
        listEmpty.description ?? general.description ?? noteDefaults.list.empty.description,
      actionLabel:
        listEmpty.action?.label ??
        general.action?.label ??
        noteDefaults.list.empty.action?.label ??
        '新建笔记',
      actionIcon:
        listEmpty.action?.icon ??
        general.action?.icon ??
        noteDefaults.list.empty.action?.icon ??
        'i-lucide-plus',
    }
  })

  const noteItems = useNoteItems(filteredNotes)

  const totalNotesBadge = computed(() => `${totalNotesLabel.value}: ${notes.value.length}`)
  const highImportanceCount = computed(
    () => notes.value.filter((note) => note.importance === 'high').length
  )
  const fadingNotesCount = computed(
    () => notes.value.filter((note) => (note.fadeLevel ?? 0) >= 3).length
  )
  const activeFilteredCount = computed(() => filteredNotes.value.length)

  const noteEditorRef = ref<{ triggerSave?: () => void } | null>(null)
  const isEditorActive = computed(
    () => editorMode.value === 'edit' || editorMode.value === 'create'
  )

  const pendingAIEvaluation = ref<NoteAIEvaluation | null>(null)
  const pendingAICompression = ref<NoteAICompression | null>(null)

  watch(
    editingNote,
    (value) => {
      pendingAIEvaluation.value = value?.aiEvaluation ?? null
      pendingAICompression.value = value?.aiCompression ?? null
    },
    { immediate: true }
  )

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
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable

      if (isEditable && !(event.metaKey || event.ctrlKey)) {
        return
      }

      event.preventDefault()
      noteEditorRef.value?.triggerSave?.()
    },
  })

  useHead(() => ({
    title: headerTitle.value,
  }))

  const timeFilterValues = ['all', 'last7', 'last30', 'last90'] as const
  type TimeFilterValue = (typeof timeFilterValues)[number]

  const {
    state: forgetConfirm,
    dialogBindings: forgetDialogBindings,
    openForNote: _requestForget,
    confirm: confirmForget,
  } = useForgetConfirm({
    onExecuteForget: (note) => forgetNote(note),
  })

  const openNoteDetail = (note: NoteRecord) => {
    router.push({ path: `/memory/${note.id}` })
  }

  useNoteRouteSync({
    notes,
    onOpenNote: openEditorForNote,
  })

  watch(
    () => forgetConfirm.value.open,
    (value) => {
      if (!value) {
        forgetConfirm.value.note = null
      }
    }
  )

  const handleImportanceChange = (value: string | null) => {
    const nextValue = (value ?? 'all') as 'all' | ImportanceLevel
    setImportanceFilter(nextValue)
  }

  const handleTimeFilterChange = (value: string | null) => {
    const normalized = (value ?? 'all') as string
    const nextValue: TimeFilterValue = timeFilterValues.includes(normalized as TimeFilterValue)
      ? (normalized as TimeFilterValue)
      : 'all'
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

  const handleEditorEvaluationUpdated = async (value: NoteAIEvaluation | null) => {
    pendingAIEvaluation.value = value ?? null

    const current = editingNote.value
    if (current) {
      editingNote.value = { ...current, aiEvaluation: value ?? null }
    }

    if (editorMode.value !== 'edit' || !current?.id) {
      return
    }

    const updated = await setNoteAIEvaluation(current.id, value ?? null)
    if (updated) {
      editingNote.value = { ...updated }
    }
  }

  const handleEditorCompressionUpdated = async (value: NoteAICompression | null) => {
    pendingAICompression.value = value ?? null

    const current = editingNote.value
    if (current) {
      editingNote.value = { ...current, aiCompression: value ?? null }
    }

    if (editorMode.value !== 'edit' || !current?.id) {
      return
    }

    const updated = await setNoteAICompression(current.id, value ?? null)
    if (updated) {
      editingNote.value = { ...updated }
    }
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
        <UButton color="primary" size="lg" icon="i-lucide-plus" @click="openEditorForNew">
          {{ noteCreateLabel }}
        </UButton>
        <UButton
          variant="outline"
          size="lg"
          color="primary"
          icon="i-lucide-compass"
          @click="router.push('/discover')"
        >
          探索资讯
        </UButton>
      </div>
    </div>
    <ClientOnly>
      <template #default>
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

            <div
              class="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400"
            >
              <span>{{ summaryLabel }}</span>
              <UBadge :label="totalNotesBadge" color="neutral" variant="soft" />
            </div>

            <div class="note-stats-grid">
              <div class="note-stat-card">
                <p class="note-stat-label">高价值笔记</p>
                <p class="note-stat-value text-primary">
                  {{ highImportanceCount }}
                </p>
                <p class="note-stat-footnote">重点关注的核心记忆</p>
              </div>
              <div class="note-stat-card">
                <p class="note-stat-label">已折叠</p>
                <p class="note-stat-value text-amber-500">
                  {{ fadingNotesCount }}
                </p>
                <p class="note-stat-footnote">淡化等级 ≥ 3 的条目</p>
              </div>
              <div class="note-stat-card">
                <p class="note-stat-label">当前筛选</p>
                <p class="note-stat-value text-emerald-500">
                  {{ activeFilteredCount }}
                </p>
                <p class="note-stat-footnote">符合条件的笔记数量</p>
              </div>
            </div>
          </div>
        </UCard>

        <section class="note-workspace">
          <header class="note-workspace__header">
            <template v-if="noteItems.length">
              <NoteListPanel
                :items="noteItems"
                :active-id="activeNoteId ?? undefined"
                :header-title="noteListHeader"
                :total-label="totalNotesLabel"
                :icon="listHeaderIcon"
                :empty-state="noteListEmptyState"
                layout="horizontal"
                @select="openEditorForNote"
                @create="openEditorForNew"
                @detail="openNoteDetail"
              />
            </template>
            <template v-else>
              <UCard class="note-list-fallback">
                <template #header>
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <UIcon :name="listHeaderIcon" class="text-lg text-primary" />
                      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ noteListHeader }}
                      </h2>
                    </div>
                    <UBadge label="全部笔记: 0" variant="soft" />
                  </div>
                </template>
                <div
                  class="flex flex-col items-center justify-center gap-4 py-12 text-center text-gray-400"
                >
                  <UIcon name="i-lucide-notebook" class="text-3xl" />
                  <p class="text-sm">正在同步笔记...</p>
                </div>
              </UCard>
            </template>
          </header>

          <div class="note-editor-panel">
            <NoteEditor
              ref="noteEditorRef"
              :key="editingNote?.id ?? editorMode"
              :note-id="editingNote?.id"
              :initial-title="editingNote?.title"
              :initial-content="editingNote?.content"
              :initial-description="editingNote?.description"
              :fade-level="editingNote?.fadeLevel ?? 0"
              :initial-importance="editingNote?.importance"
              :initial-ai-evaluation="pendingAIEvaluation"
              :initial-ai-compression="pendingAICompression"
              :mode="editorMode"
              :config="editorConfig"
              :header-title="editorHeadline"
              :header-subtext="editorSubtext"
              :header-badges="editorHeaderBadges"
              :header-info="editorHeaderInfo"
              :new-button-label="noteCreateLabel"
              @save="handleEditorSave"
              @cancel="handleEditorCancel"
              @ai-evaluation-updated="handleEditorEvaluationUpdated"
              @ai-compression-updated="handleEditorCompressionUpdated"
              @new-note="openEditorForNew"
            />
          </div>
        </section>
      </template>
      <template #fallback>
        <div class="space-y-6">
          <USkeleton class="h-24 rounded-xl" />
          <USkeleton class="h-112 rounded-2xl" />
        </div>
      </template>
    </ClientOnly>
    <CommonConfirmDialog
      v-model="forgetConfirm.open"
      v-bind="forgetDialogBindings"
      @confirm="confirmForget"
      @cancel="forgetConfirm.open = false"
    />
  </div>
</template>

<style scoped>
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .note-stats-grid {
    display: grid;
    gap: 1rem;
    margin-top: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .note-stat-card {
    position: relative;
    padding: 1.1rem 1.25rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(241, 245, 249, 0.85));
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  }

  .dark .note-stat-card {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.88));
    border-color: rgba(51, 65, 85, 0.45);
    box-shadow: 0 12px 28px rgba(2, 6, 23, 0.45);
  }

  .note-stat-label {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(71, 85, 105, 0.85);
    margin-bottom: 0.4rem;
  }

  .dark .note-stat-label {
    color: rgba(148, 163, 184, 0.72);
  }

  .note-stat-value {
    font-size: 1.85rem;
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 0.25rem;
  }

  .note-stat-footnote {
    font-size: 0.78rem;
    color: rgba(100, 116, 139, 0.85);
  }

  .dark .note-stat-footnote {
    color: rgba(148, 163, 184, 0.7);
  }

  .note-workspace {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-top: 2.25rem;
  }

  .note-workspace__header {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .note-editor-panel {
    width: 100%;
  }

  .note-list-fallback {
    border: 1px solid rgba(148, 163, 184, 0.22);
  }

  @media (max-width: 1024px) {
    .note-editor-panel {
      padding: 1.1rem;
    }
  }
</style>
