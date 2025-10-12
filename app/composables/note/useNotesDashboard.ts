
import { onServerPrefetch } from '#imports'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '~~/stores/notes'
import type {
  ImportanceLevel,
  NoteDashboardOptions,
  NoteRecord,
  NoteSavePayload
} from './types'

type ImportanceFilter = 'all' | ImportanceLevel
type TimeFilter = 'all' | 'last7' | 'last30' | 'last90'

const importancePriority: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  noise: 3
}

const extractNoteTimestamp = (note: NoteRecord) => {
  const parseDate = (value?: string) => {
    if (!value) {
      return null
    }

    const normalized = value
      .replaceAll('/', '-')
      .replaceAll('.', '-')
      .replaceAll('年', '-')
      .replaceAll('月', '-')
      .replace('日', '')
    const parsed = Date.parse(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }

  const fromUpdated = parseDate(note.updatedAt)
  if (fromUpdated !== null) {
    return fromUpdated
  }

  const fromCreated = parseDate(note.createdAt)
  if (fromCreated !== null) {
    return fromCreated
  }

  if (typeof note.id === 'number' && Number.isFinite(note.id)) {
    return note.id
  }

  const numericId = Number(note.id)
  if (Number.isFinite(numericId)) {
    return numericId
  }

  return null
}

export const useNotesDashboard = (options: NoteDashboardOptions = {}) => {
  const notesStore = useNotesStore()
  const initializePromise = notesStore.ensureInitialized(options.initialNotes, options)

  if (import.meta.server) {
    onServerPrefetch(() => initializePromise)
  } else {
    initializePromise.catch(error => {
      console.warn('[notes] Failed to initialize dashboard on client', error)
    })
  }

  const { notes, noteStats } = storeToRefs(notesStore)

  const viewMode = ref<'card' | 'list'>('card')
  const importanceFilter = ref<ImportanceFilter>('all')
  const searchQuery = ref('')
  const timeFilter = ref<TimeFilter>('all')
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

    if (timeFilter.value !== 'all') {
      const now = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000
      const filterMap: Record<Exclude<TimeFilter, 'all'>, number> = {
        last7: 7,
        last30: 30,
        last90: 90
      }
      const thresholdDays = filterMap[timeFilter.value as Exclude<TimeFilter, 'all'>]
      const threshold = now - thresholdDays * dayInMs

      data = data.filter(note => {
        const timestamp = extractNoteTimestamp(note)
        if (!timestamp) {
          return false
        }
        return timestamp >= threshold
      })
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
      const timestampDelta = (extractNoteTimestamp(b) ?? 0) - (extractNoteTimestamp(a) ?? 0)
      if (timestampDelta !== 0) {
        return timestampDelta
      }
      return (Number(b.id) || 0) - (Number(a.id) || 0)
    })

    return data
  })

  const setViewMode = (mode: 'card' | 'list') => {
    viewMode.value = mode
  }

  const setImportanceFilter = (value: ImportanceFilter) => {
    importanceFilter.value = value
  }

  const setTimeFilter = (value: TimeFilter) => {
    timeFilter.value = value
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

  const restoreNote = async (note: NoteRecord) => {
    try {
      await notesStore.restoreNote(note)
    } catch (error) {
      console.error('[notes] 恢复笔记失败', error)
    }
  }

  const accelerateForgetting = async (note: NoteRecord) => {
    try {
      await notesStore.accelerateForgetting(note)
    } catch (error) {
      console.error('[notes] 加速遗忘失败', error)
    }
  }

  const forgetNote = async (note: NoteRecord) => {
    try {
      await notesStore.directForget(note)
    } catch (error) {
      console.error('[notes] 直接遗忘失败', error)
    }
  }

  const purgeNote = async (note: NoteRecord) => {
    try {
      return await notesStore.purgeNote(note)
    } catch (error) {
      console.error('[notes] 删除笔记失败', error)
      return null
    }
  }

  const refreshNotes = async () => {
    try {
      await notesStore.refreshFromServer()
    } catch (error) {
      console.error('[notes] 同步笔记失败', error)
    }
  }

  const saveNote = async (payload: NoteSavePayload) => {
    if (!payload.title || !payload.content) {
      return
    }

    if (editorMode.value === 'edit' && editingNote.value) {
      const updated = await notesStore.upsertNote(payload, editingNote.value)
      if (updated) {
        editingNote.value = { ...updated }
        activeNoteId.value = updated.id
      }
    } else {
      const created = await notesStore.upsertNote(payload, null)
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
    timeFilter,
    selectedNotes,
    selectedCount,
    editorMode,
    editingNote,
    activeNoteId,

    // actions
    setViewMode,
    setImportanceFilter,
    setTimeFilter,
    updateSearchQuery,
    toggleSelection,
    openEditorForNew,
    openEditorForNote,
    closeEditor,
  saveNote,
    restoreNote,
    accelerateForgetting,
    forgetNote,
    refreshNotes,
    purgeNote
  }
}
