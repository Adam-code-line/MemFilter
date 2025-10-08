<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { NoteRecord } from '~/composables/note'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '~~/stores/notes'
import { useMemoryContent } from '~/composables/memory/useMemoryContent'

definePageMeta({
  layout: 'app'
})

const notesStore = useNotesStore()
notesStore.ensureInitialized()

const router = useRouter()

const { notes } = storeToRefs(notesStore)

const importancePriority = {
  high: 0,
  medium: 1,
  low: 2,
  noise: 3
} as const

const sortByImportance = (collection: any[]) =>
  [...collection].sort((a, b) => {
    const importanceDelta = (importancePriority[a.importance as keyof typeof importancePriority] ?? 99) -
      (importancePriority[b.importance as keyof typeof importancePriority] ?? 99)
    if (importanceDelta !== 0) {
      return importanceDelta
    }
    const scoreDelta = (b.importanceScore ?? 0) - (a.importanceScore ?? 0)
    if (scoreDelta !== 0) {
      return scoreDelta
    }
    return (a.fadeLevel ?? 0) - (b.fadeLevel ?? 0)
  })

const resolveMemoryBucket = (note: any): 'fresh' | 'fading' | 'archived' => {
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

const categorizedMemories = computed(() => {
  const fresh: any[] = []
  const fading: any[] = []
  const archived: any[] = []

  for (const note of notes.value) {
    const bucket = resolveMemoryBucket(note)

    if (bucket === 'fresh') {
      fresh.push(note)
    } else if (bucket === 'fading') {
      fading.push(note)
    } else {
      archived.push(note)
    }
  }

  return {
    fresh: sortByImportance(fresh),
    fading: sortByImportance(fading),
    archived: sortByImportance(archived)
  }
})

const {
  badge,
  pageTitle,
  pageSubtitle,
  introDescription,
  statsSource,
  sectionSource,
  detail,
  defaults: memoryDefaults
} = await useMemoryContent()

useHead(() => ({
  title: pageTitle.value ?? '记忆回溯'
}))

const forgetConfirm = ref<{
  open: boolean
  note: NoteRecord | null
  title: string
  description: string
  confirmLabel: string
  confirmColor: 'primary' | 'secondary' | 'neutral' | 'error' | 'warning' | 'success' | 'info'
  confirmVariant: 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'
  icon: string
}>(
  {
    open: false,
    note: null,
    title: '',
    description: '',
    confirmLabel: '确认',
    confirmColor: 'error',
    confirmVariant: 'solid',
    icon: 'i-lucide-alert-triangle'
  }
)

const openCoreForgetConfirm = (note: NoteRecord) => {
  forgetConfirm.value = {
    open: true,
    note,
    title: '确认折叠核心记忆？',
    description: `《${note.title || '未命名笔记'}》被标记为核心记忆，确认后将进入折叠区，可在遗忘日志中彻底清理。`,
    confirmLabel: '确认遗忘',
    confirmColor: 'error',
    confirmVariant: 'solid',
    icon: 'i-lucide-shield-alert'
  }
}

watch(
  () => forgetConfirm.value.open,
  value => {
    if (!value) {
      forgetConfirm.value.note = null
      forgetConfirm.value.title = ''
      forgetConfirm.value.description = ''
      forgetConfirm.value.confirmLabel = '确认'
      forgetConfirm.value.confirmColor = 'error'
      forgetConfirm.value.confirmVariant = 'solid'
      forgetConfirm.value.icon = 'i-lucide-alert-triangle'
    }
  }
)

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

const statColorMap: Record<string, string> = {
  primary: 'text-primary-500',
  warning: 'text-amber-500',
  neutral: 'text-slate-500',
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  secondary: 'text-slate-500'
}

const stats = computed(() =>
  statsSource.value.map(stat => {
    const defaults = memoryDefaults.stats.find(item => item.key === stat.key)
    const key = stat.key as keyof typeof categorizedMemories.value
    const value = categorizedMemories.value[key]?.length ?? 0
    return {
      ...(defaults ?? {}),
      ...stat,
      value,
      colorClass: stat.color ? statColorMap[stat.color] ?? 'text-primary-500' : 'text-primary-500'
    }
  })
)

const sections = computed(() =>
  sectionSource.value.map(section => {
    const defaults = memoryDefaults.sections.find(item => item.key === section.key)
    const items = categorizedMemories.value[section.key] ?? []
    const emptyDefaults = defaults?.empty ?? {}
    return {
      ...(defaults ?? {}),
      ...section,
      items,
      count: items.length,
      accent: section.accent ?? defaults?.accent ?? 'neutral',
      empty: {
        title: section.empty?.title ?? emptyDefaults.title ?? detail.value.emptyFallback.title ?? '',
        description: section.empty?.description ?? emptyDefaults.description ?? detail.value.emptyFallback.description ?? ''
      }
    }
  })
)

const handleRestore = (note: NoteRecord) => notesStore.restoreNote(note)
const handleAccelerate = (note: NoteRecord) => notesStore.accelerateForgetting(note)
const handleForget = (note: NoteRecord) => notesStore.directForget(note)

const requestForget = (note: NoteRecord) => {
  if (note.importance === 'high') {
    openCoreForgetConfirm(note)
  } else {
    handleForget(note)
  }
}

const confirmCoreForget = () => {
  const note = forgetConfirm.value.note
  if (!note) {
    return
  }
  handleForget(note)
  resetForgetConfirm()
}

const selectedNote = ref<NoteRecord | null>(null)
const detailDialogOpen = ref(false)

const detailStatus = computed(() => {
  if (!selectedNote.value) {
    return null
  }
  if ((selectedNote.value.fadeLevel ?? 0) >= 4) {
    return {
      label: '已彻底遗忘',
      color: 'error'
    }
  }
  const bucket = resolveMemoryBucket(selectedNote.value)
  const sectionDefaults = memoryDefaults.sections.find(item => item.key === bucket)
  const sectionConfig = sectionSource.value.find(item => item.key === bucket)
  return {
    label: sectionConfig?.title ?? sectionDefaults?.title ?? '',
    color: sectionConfig?.accent ?? sectionDefaults?.accent ?? 'primary'
  }
})

const detailActions = computed(() => {
  const note = selectedNote.value
  if (!note) {
    return []
  }

  const actionsConfig = detail.value.actions
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
    key: 'open-note',
    label: '在笔记中编辑',
    icon: 'i-lucide-square-pen',
    color: 'primary',
    variant: 'solid'
  })

  return actions
})

const openDetail = (note: NoteRecord) => {
  selectedNote.value = note
  detailDialogOpen.value = true
}

const closeDetail = () => {
  detailDialogOpen.value = false
}

const handleDetailAction = (key: string) => {
  const note = selectedNote.value
  if (!note) {
    return
  }

  switch (key) {
    case 'restore':
      handleRestore(note)
      break
    case 'accelerate':
      handleAccelerate(note)
      break
    case 'forget':
      requestForget(note)
      break
    case 'open-note':
      router.push({ path: '/note', query: { noteId: String(note.id ?? '') } })
      detailDialogOpen.value = false
      break
    default:
      break
  }
}

watch(notes, newNotes => {
  if (!newNotes.length) {
    selectedNote.value = null
    detailDialogOpen.value = false
    return
  }

  if (selectedNote.value) {
    const refreshed = newNotes.find(item => item.id === selectedNote.value?.id)
    if (refreshed) {
      selectedNote.value = refreshed
      return
    }
  }

  selectedNote.value = newNotes[0]
}, { immediate: true })
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-10">
    <section class="space-y-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <UBadge
            v-if="badge"
            :label="badge.label"
            :color="badge.color ?? 'primary'"
            variant="soft"
            :icon="badge.icon"
          />
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
        </div>
        <p v-if="pageSubtitle" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
          {{ pageSubtitle }}
        </p>
        <p v-if="introDescription" class="text-gray-600 dark:text-gray-400 max-w-3xl">
          {{ introDescription }}
        </p>
      </div>

      <UCard class="border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
        <div class="grid gap-6 sm:grid-cols-3">
          <div
            v-for="stat in stats"
            :key="stat.key"
            class="flex flex-col gap-2"
          >
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <UIcon v-if="stat.icon" :name="stat.icon" class="text-base text-primary" />
              <span>{{ stat.label }}</span>
            </div>
            <span :class="['text-2xl font-semibold', stat.colorClass]">{{ stat.value }}</span>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ stat.description }}</p>
          </div>
        </div>
      </UCard>
    </section>

    <section v-for="section in sections" :key="section.key" class="space-y-4">
      <UCard class="border border-gray-200/70 dark:border-white/10">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <UIcon v-if="section.icon" :name="section.icon" class="text-lg text-primary" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ section.title }}</h2>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                {{ section.description }}
              </p>
            </div>
            <UBadge :label="`${section.count} 条`" :color="section.accent ?? 'neutral'" variant="subtle" />
          </div>
        </template>

        <div v-if="section.items.length" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <MemoryCard
            v-for="note in section.items"
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
            @open="openDetail(note)"
            @restore="handleRestore(note)"
            @accelerate-forgetting="handleAccelerate(note)"
            @forget="requestForget(note)"
          />
        </div>

        <UAlert
          v-else
          icon="i-lucide-check-circle-2"
          :title="section.empty.title || detail.emptyFallback.title || '暂无内容'"
          :description="section.empty.description || detail.emptyFallback.description || '稍后再来看看。'"
          color="neutral"
          variant="soft"
          class="border border-dashed border-gray-300/60 dark:border-white/20"
        />
      </UCard>
    </section>
  </div>

  <CommonConfirmDialog
    v-model="forgetConfirm.open"
    :title="forgetConfirm.title"
    :description="forgetConfirm.description"
    :icon="forgetConfirm.icon"
    :confirm-label="forgetConfirm.confirmLabel"
    :confirm-color="forgetConfirm.confirmColor"
    :confirm-variant="forgetConfirm.confirmVariant"
    @confirm="confirmCoreForget"
    @cancel="resetForgetConfirm"
  />

  <MemoryDetailDialog
    v-model="detailDialogOpen"
    :title="detail.title"
    :eyebrow="detail.eyebrow"
    :clear-label="detail.clearLabel"
    :note="selectedNote"
    :actions="detailActions"
    :status-label="detailStatus?.label"
    :status-color="detailStatus?.color"
    @action="handleDetailAction"
    @close="closeDetail"
  />
</template>

<style scoped>
.memory-card-item {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.memory-card-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
}
</style>