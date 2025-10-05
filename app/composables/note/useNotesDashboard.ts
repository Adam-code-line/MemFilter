import { computed, ref } from 'vue'
import type {
  FadeLevel,
  ImportanceLevel,
  NoteDashboardOptions,
  NoteRecord,
  NoteSavePayload
} from './types'

const createDefaultNotes = (): NoteRecord[] => ([
  {
    id: 1,
    title: '深度学习原理笔记',
    content: '深度学习是机器学习的一个分支，通过构建具有多层次的人工神经网络来学习数据的高层次特征表示...',
    date: '2小时前',
    lastAccessed: '30分钟前',
    icon: '🧠',
    importance: 'high',
    importanceScore: 92,
    fadeLevel: 0,
    forgettingProgress: 0,
    isCollapsed: false
  },
  {
    id: 2,
    title: 'Vue 3 组合式 API 学习',
    content: 'Vue 3 引入了组合式 API，这是一套基于函数的 API，可以更灵活地组织组件逻辑...',
    date: '5小时前',
    lastAccessed: '2小时前',
    icon: '⚡',
    importance: 'medium',
    importanceScore: 78,
    fadeLevel: 1,
    forgettingProgress: 25,
    daysUntilForgotten: 6,
    isCollapsed: false
  },
  {
    id: 3,
    title: '数据结构 - 树的遍历',
    content: '树的遍历是数据结构中的重要概念，包括前序遍历、中序遍历、后序遍历等...',
    date: '1天前',
    lastAccessed: '8小时前',
    icon: '🌳',
    importance: 'medium',
    importanceScore: 65,
    fadeLevel: 2,
    forgettingProgress: 45,
    daysUntilForgotten: 3,
    isCollapsed: false
  },
  {
    id: 4,
    title: '会议记录 - 产品需求讨论',
    content: '今天讨论了新功能的需求，包括用户界面设计、后端 API 设计等方面...',
    date: '3天前',
    lastAccessed: '2天前',
    icon: '📝',
    importance: 'low',
    importanceScore: 42,
    fadeLevel: 3,
    forgettingProgress: 70,
    daysUntilForgotten: 1,
    isCollapsed: false
  },
  {
    id: 5,
    title: '随手记录的想法',
    content: '今天路上想到的一些零散想法，可能没什么用处...',
    date: '1周前',
    lastAccessed: '5天前',
    icon: '💭',
    importance: 'noise',
    importanceScore: 18,
    fadeLevel: 4,
    forgettingProgress: 90,
    daysUntilForgotten: 0,
    isCollapsed: true
  },
  {
    id: 6,
    title: 'TypeScript 高级特性',
    content: 'TypeScript 提供了许多高级特性，如泛型、装饰器、类型守卫等，这些特性可以帮助我们写出更安全的代码...',
    date: '2天前',
    lastAccessed: '1天前',
    icon: '🔷',
    importance: 'high',
    importanceScore: 88,
    fadeLevel: 0,
    forgettingProgress: 0,
    isCollapsed: false
  }
])

export const useNotesDashboard = (options: NoteDashboardOptions = {}) => {
  type ImportanceFilter = 'all' | ImportanceLevel

  const notes = ref<NoteRecord[]>(options.initialNotes ? [...options.initialNotes] : createDefaultNotes())
  const viewMode = ref<'card' | 'list'>('card')
  const importanceFilter = ref<ImportanceFilter>('all')
  const searchQuery = ref('')
  const selectedNotes = ref<number[]>([])
  const isEditorOpen = ref(false)
  const editorMode = ref<'create' | 'edit'>('create')
  const editingNote = ref<NoteRecord | null>(null)

  const filteredNotes = computed(() => {
    let data = [...notes.value]

    if (importanceFilter.value !== 'all') {
      data = data.filter(note => note.importance === importanceFilter.value)
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase()
      data = data.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      )
    }

    return data
  })

  const noteStats = computed(() => ({
    total: notes.value.length,
    core: notes.value.filter(note => note.importance === 'high').length,
    forgotten: notes.value.filter(note => note.fadeLevel >= 3).length,
    thisMonth: Math.max(0, Math.floor(notes.value.length * 0.7))
  }))

  const selectedCount = computed(() => selectedNotes.value.length)

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
    isEditorOpen.value = true
  }

  const openEditorForNote = (note: NoteRecord) => {
    editorMode.value = 'edit'
    editingNote.value = { ...note }
    isEditorOpen.value = true
  }

  const closeEditor = () => {
    isEditorOpen.value = false
    editingNote.value = null
  }

  const restoreNote = (note: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === note.id)
    if (index !== -1) {
      notes.value[index].fadeLevel = 0
      notes.value[index].forgettingProgress = 0
      notes.value[index].isCollapsed = false
    }
  }

  const accelerateForgetting = (note: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === note.id)
    if (index !== -1) {
      const current = notes.value[index]
      const nextFade = Math.min(4, (current.fadeLevel + 1) as FadeLevel)
      current.fadeLevel = nextFade
      current.forgettingProgress = Math.min(100, current.forgettingProgress + 30)
      current.daysUntilForgotten = Math.max(0, (current.daysUntilForgotten ?? 0) - 1)
    }
  }

  const toggleCollapse = (note: NoteRecord) => {
    const index = notes.value.findIndex(item => item.id === note.id)
    if (index !== -1) {
      notes.value[index].isCollapsed = !notes.value[index].isCollapsed
    }
  }

  const saveNote = (payload: NoteSavePayload) => {
    if (!payload.title || !payload.content) {
      return
    }

    if (editorMode.value === 'edit' && editingNote.value) {
      const index = notes.value.findIndex(note => note.id === editingNote.value!.id)
      if (index !== -1) {
        notes.value[index] = {
          ...notes.value[index],
          title: payload.title,
          content: payload.content,
          importance: payload.importance,
          importanceScore: Math.max(notes.value[index].importanceScore, 60),
          date: '刚刚',
          lastAccessed: '刚刚'
        }
      }
    } else {
      const id = Date.now()
      notes.value = [
        {
          id,
          title: payload.title,
          content: payload.content,
          date: '刚刚',
          lastAccessed: '刚刚',
          icon: '📝',
          importance: payload.importance,
          importanceScore: Math.floor(Math.random() * 20) + 70,
          fadeLevel: 0,
          forgettingProgress: 0,
          isCollapsed: false
        },
        ...notes.value
      ]
    }

    closeEditor()
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
    isEditorOpen,
    editorMode,
    editingNote,

    // actions
    setViewMode,
    setImportanceFilter,
    updateSearchQuery,
    toggleSelection,
    openEditorForNew,
    openEditorForNote,
    closeEditor,
    restoreNote,
    accelerateForgetting,
    toggleCollapse,
    saveNote
  }
}
