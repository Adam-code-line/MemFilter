import { computed, type ComputedRef } from 'vue'
import {
  buildMemoryDetailActions,
  buildMemoryDetailStatus,
  type DetailActionMap,
  type DetailStatus,
  type MemorySectionConfig,
} from './useMemoryDetailHelpers'
import type { NoteRecord } from '../note/types'

interface UseMemoryDetailPageOptions {
  sectionSource: ComputedRef<MemorySectionConfig[]>
  sectionDefaults: MemorySectionConfig[]
  detailPanel: ComputedRef<{ actions: DetailActionMap }>
  onRestore: (note: NoteRecord) => Promise<void> | void
  onAccelerate: (note: NoteRecord) => Promise<void> | void
  onForgetRequest: (note: NoteRecord) => void
  onOpenNote: (note: NoteRecord) => void
  includeOpenNoteAction?: boolean
}

export const useMemoryDetailPage = (
  currentNote: ComputedRef<NoteRecord | null>,
  options: UseMemoryDetailPageOptions
) => {
  const detailStatus = computed<DetailStatus | null>(() =>
    buildMemoryDetailStatus(currentNote.value, options.sectionSource, options.sectionDefaults)
  )

  const detailActions = computed(() =>
    buildMemoryDetailActions(currentNote.value, options.detailPanel.value.actions, {
      includeOpenNote: options.includeOpenNoteAction ?? true,
    })
  )

  const handleAction = async (key: string) => {
    const note = currentNote.value
    if (!note) {
      return
    }

    switch (key) {
      case 'restore':
        await Promise.resolve(options.onRestore(note))
        break
      case 'accelerate':
        await Promise.resolve(options.onAccelerate(note))
        break
      case 'forget':
        options.onForgetRequest(note)
        break
      case 'open-note':
        options.onOpenNote(note)
        break
      default:
        break
    }
  }

  return {
    detailStatus,
    detailActions,
    handleAction,
  }
}
