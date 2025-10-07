import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '~~/stores/notes'
import type {
  ImportanceLevel,
  NoteDashboardOptions,
  NoteRecord,
  NoteSavePayload
} from './types'

type ImportanceFilter = 'all' | ImportanceLevel

const importancePriority: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  noise: 3
}

export const useNotesDashboard = (options: NoteDashboardOptions = {}) => {
  const notesStore = useNotesStore()
  notesStore.ensureInitialized(options.initialNotes, options)

  const { notes, noteStats } = storeToRefs(notesStore)

  const viewMode = ref<'card' | 'list'>('card')
  const importanceFilter = ref<ImportanceFilter>('all')
  const searchQuery = ref('')
  const selectedNotes = ref<number[]>([])
  const selectedCount = computed(() => selectedNotes.value.length)
  const editorMode = ref<'create' | 'edit'>('create')
  const editingNote = ref<NoteRecord | null>(null)
  const activeNoteId = ref<number | null>(null)

  const filteredNotes = computed(() => {
    let data = [...notes.value]

    if (importanceFilter.value !== 'all') {
      data = data.filter(note => note.importance === importanceFilter.value)
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase()
      data = data.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        (note.description ?? '').toLowerCase().includes(query)
      )
    }

    data.sort((a, b) => {
      const importanceDelta = (importancePriority[a.importance] ?? 99) - (importancePriority[b.importance] ?? 99)
      if (importanceDelta !== 0) {
        return importanceDelta
      }
      const scoreDelta = (b.importanceScore ?? 0) - (a.importanceScore ?? 0)
      if (scoreDelta !== 0) {
        return scoreDelta
      }
      return (b.id ?? 0) - (a.id ?? 0)
    })

    return data
  })

  const setViewMode = (mode: 'card' | 'list') => {
    viewMode.value = mode
  }

  const setImportanceFilter = (value: ImportanceFilter) => {
    importanceFilter.value = value
  }

  const updateSearchQuery = (value: string) => {
    searchQuery.value = value
  }

  const toggleSelection = (id: number) => {
    if (selectedNotes.value.includes(id)) {
      selectedNotes.value = selectedNotes.value.filter(selectedId => selectedId !== id)
    } else {
      selectedNotes.value = [...selectedNotes.value, id]
    }
  }

  const openEditorForNew = () => {
    editorMode.value = 'create'
    editingNote.value = null
    activeNoteId.value = null
  }

  const openEditorForNote = (note: NoteRecord) => {
    editorMode.value = 'edit'
    editingNote.value = { ...note }
    activeNoteId.value = note.id
  }

  const closeEditor = () => {
    editorMode.value = 'create'
    editingNote.value = null
    activeNoteId.value = null
  }

  const restoreNote = (note: NoteRecord) => {
    notesStore.restoreNote(note)
  }

  const accelerateForgetting = (note: NoteRecord) => {
    notesStore.accelerateForgetting(note)
  }

  const forgetNote = (note: NoteRecord) => {
    notesStore.directForget(note)
  }

  const saveNote = (payload: NoteSavePayload) => {
    if (!payload.title || !payload.content) {
      return
    }

    if (editorMode.value === 'edit' && editingNote.value) {
      const updated = notesStore.upsertNote(payload, editingNote.value)
      if (updated) {
        editingNote.value = { ...updated }
        activeNoteId.value = updated.id
      }
    } else {
      const created = notesStore.upsertNote(payload, null)
      if (created) {
        editorMode.value = 'edit'
        editingNote.value = { ...created }
        activeNoteId.value = created.id
      }
    }
  }

  return {
    // state
    notes,
    filteredNotes,
    noteStats,
    viewMode,
    importanceFilter,
    searchQuery,
    selectedNotes,
    selectedCount,
    editorMode,
    editingNote,
    activeNoteId,

    // actions
    setViewMode,
    setImportanceFilter,
    updateSearchQuery,
    toggleSelection,
    openEditorForNew,
    openEditorForNote,
    closeEditor,
    saveNote,
    restoreNote,
    accelerateForgetting,
    forgetNote
  }
}
