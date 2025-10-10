
import type { NoteRecord } from './types'
import { useRoute, useRouter } from '#imports'

interface UseNoteRouteSyncOptions {
  notes: ComputedRef<NoteRecord[]>
  onOpenNote: (note: NoteRecord) => void
}

export const useNoteRouteSync = ({ notes, onOpenNote }: UseNoteRouteSyncOptions) => {
  const route = useRoute()
  const router = useRouter()
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

    onOpenNote(target)
    pendingNoteId.value = null
    clearRouteNoteId()
  }, { immediate: true })
}
