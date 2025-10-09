import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { NoteRecord } from '~/composables/note'

type MemoryBucket = 'fresh' | 'fading' | 'archived'

type ActionVariant = 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'

type DetailActionConfig = {
  label: string
  icon?: string
  color?: string
  variant?: ActionVariant
  tooltip?: string
}

type DetailActionMap = {
  restore: DetailActionConfig
  accelerate: DetailActionConfig
  forget: DetailActionConfig
}

interface MemorySectionConfig {
  key: MemoryBucket
  title?: string
  accent?: string
}

interface DetailStatus {
  label: string
  color: string
}

interface UseMemoryDetailControllerOptions {
  notes: Ref<NoteRecord[]>
  sectionSource: ComputedRef<MemorySectionConfig[]>
  sectionDefaults: MemorySectionConfig[]
  detailPanel: ComputedRef<{ actions: DetailActionMap }>
  onRestore: (note: NoteRecord) => void
  onAccelerate: (note: NoteRecord) => void
  onForget: (note: NoteRecord) => void
  onOpenNote: (note: NoteRecord) => void
  autoSelectFirst?: boolean
}

const resolveMemoryBucket = (note: NoteRecord | null): MemoryBucket | null => {
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

export const useMemoryDetailController = (options: UseMemoryDetailControllerOptions) => {
  const selectedNote = ref<NoteRecord | null>(null)
  const detailDialogOpen = ref(false)

  const detailStatus = computed<DetailStatus | null>(() => {
    const note = selectedNote.value
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

    const defaults = options.sectionDefaults.find(item => item.key === bucket)
    const config = options.sectionSource.value.find(item => item.key === bucket)

    return {
      label: config?.title ?? defaults?.title ?? '',
      color: config?.accent ?? defaults?.accent ?? 'primary'
    }
  })

  const buildDetailActions = (note: NoteRecord | null) => {
    if (!note) {
      return [] as Array<{ key: string } & DetailActionConfig>
    }

    const actionsConfig = options.detailPanel.value.actions
    const actions: Array<{ key: string } & DetailActionConfig> = []

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
  }

  const detailActions = computed(() => buildDetailActions(selectedNote.value))

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
        options.onRestore(note)
        break
      case 'accelerate':
        options.onAccelerate(note)
        break
      case 'forget':
        options.onForget(note)
        break
      case 'open-note':
        options.onOpenNote(note)
        closeDetail()
        break
      default:
        break
    }
  }

  const autoSelectFirst = options.autoSelectFirst ?? false

  watch(options.notes, newNotes => {
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

      if (!autoSelectFirst) {
        selectedNote.value = null
        return
      }
    }

    if (autoSelectFirst && !selectedNote.value) {
      selectedNote.value = newNotes[0] ?? null
    }
  }, { immediate: true })

  return {
    selectedNote,
    detailDialogOpen,
    detailStatus,
    detailActions,
    openDetail,
    closeDetail,
    handleDetailAction
  }
}

export type UseMemoryDetailControllerReturn = ReturnType<typeof useMemoryDetailController>
