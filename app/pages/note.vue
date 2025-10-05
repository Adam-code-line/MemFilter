<script setup lang="ts">
import { computed } from 'vue'
import { useNotesDashboard } from '~/composables/note'
import type { NoteSavePayload } from '~/composables/note'

definePageMeta({
  layout: 'app'
})

useHead({
  title: '笔记管理'
})

const { data: noteCopy } = await useAsyncData('note-config', () => queryCollection('note').first())

const {
  notes,
  filteredNotes,
  importanceFilter,
  searchQuery,
  editorMode,
  editingNote,
  activeNoteId,
  setImportanceFilter,
  updateSearchQuery,
  openEditorForNew,
  openEditorForNote,
  closeEditor,
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

const headerBadge = computed(() => noteConfig.value?.badge)
const headerTitle = computed(() => noteConfig.value?.title ?? '笔记编辑')
const headerSubtitle = computed(() => noteConfig.value?.subtitle ?? '')
const emptyState = computed(() => noteConfig.value?.emptyState)
const editorConfig = computed(() => noteConfig.value?.editor ?? {})
const listConfig = computed(() => noteConfig.value?.list)

const importanceLabels: Record<string, string> = {
  high: '核心',
  medium: '重要',
  low: '次要',
  noise: '噪声'
}

const importanceColorMap: Record<string, 'primary' | 'blue' | 'gray' | 'neutral'> = {
  high: 'primary',
  medium: 'blue',
  low: 'gray',
  noise: 'neutral'
}

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

const noteListHeader = computed(() => listConfig.value?.title ?? '笔记列表')
const noteCreateLabel = computed(() => listConfig.value?.createLabel ?? '新建笔记')
const totalNotesLabel = computed(() => listConfig.value?.totalLabel ?? '全部笔记')
const emptyListTitle = computed(() => emptyState.value?.title ?? '暂无笔记')
const emptyListDescription = computed(() => emptyState.value?.description ?? '开始创建您的第一条笔记。')

const noteItems = computed(() => filteredNotes.value.map(note => ({
  id: note.id,
  record: note,
  title: note.title || '未命名笔记',
  description: note.date ?? '',
  iconName: typeof note.icon === 'string' && note.icon.startsWith('i-') ? note.icon : undefined,
  iconFallback: typeof note.icon === 'string' && !note.icon.startsWith('i-') ? note.icon : '📝',
  importance: importanceLabels[note.importance] ?? '未分类',
  importanceColor: importanceColorMap[note.importance] ?? 'neutral'
})))

const handleEditorSave = (payload: NoteSavePayload) => {
  saveNote(payload)
}

const handleEditorCancel = () => {
  closeEditor()
}

const handleContentChange = (_value: string) => {
  // 占位钩子，未来可在此响应内容变化
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8">
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
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

        <UBadge
          :label="`${totalNotesLabel}: ${notes.length}`"
          color="neutral"
          variant="soft"
        />
      </div>
    </UCard>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section>
        <UCard class="border border-gray-200/80 dark:border-white/10">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-notebook-pen" class="text-lg text-primary" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ noteListHeader }}
                </h2>
              </div>
              <UBadge :label="`${filteredNotes.length} 条`" variant="soft" />
            </div>
          </template>

          <div v-if="filteredNotes.length" class="flex flex-col divide-y divide-gray-200/70 dark:divide-white/5">
            <button
              v-for="note in noteItems"
              :key="note.id"
              type="button"
              class="flex items-start gap-3 px-3 py-3 text-left transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              :class="note.id === activeNoteId ? 'bg-primary/10 ring-1 ring-primary/30 rounded-lg' : ''"
              @click="openEditorForNote(note.record)"
            >
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UIcon v-if="note.iconName" :name="note.iconName" class="text-base" />
                <span v-else class="text-base">{{ note.iconFallback }}</span>
              </div>
              <div class="flex-1 space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="font-medium text-gray-900 dark:text-white line-clamp-1">
                    {{ note.title }}
                  </p>
                  <UBadge :label="note.importance" :color="note.importanceColor" variant="subtle" />
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ note.description }}
                </p>
              </div>
            </button>
          </div>

          <div v-else class="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <UIcon :name="emptyState?.icon ?? 'i-lucide-notebook'" class="text-4xl text-gray-300 dark:text-gray-600" />
            <div class="space-y-2">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ emptyListTitle }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ emptyListDescription }}
              </p>
            </div>
            <UButton
              color="primary"
              icon="i-lucide-plus"
              @click="openEditorForNew"
            >
              {{ noteCreateLabel }}
            </UButton>
          </div>
        </UCard>
      </section>

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
                  新建
                </UButton>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ editorSubtext }}
              </p>
              <div v-if="isEditingExisting" class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <UBadge
                  :label="editingNote?.importance === 'high' ? '高价值' : '正在回顾'"
                  :color="editingNote?.importance === 'high' ? 'primary' : 'neutral'"
                  variant="soft"
                />
                <span v-if="editingNote?.lastAccessed">最近访问：{{ editingNote.lastAccessed }}</span>
                <span v-if="editingNote?.date">创建时间：{{ editingNote.date }}</span>
              </div>
            </div>
          </template>

          <NoteEditor
            :key="editingNote?.id ?? editorMode"
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
        </UCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
