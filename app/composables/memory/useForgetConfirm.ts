export interface ForgetConfirmState {
  note: NoteRecord | null
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmColor: 'primary' | 'secondary' | 'neutral' | 'error' | 'warning' | 'success' | 'info'
  confirmVariant: 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'
  icon: string
}

interface UseForgetConfirmOptions {
  onExecuteForget?: (note: NoteRecord) => Promise<void> | void
}

const createBaseState = (): ForgetConfirmState => ({
  note: null,
  open: false,
  title: '',
  description: '',
  confirmLabel: '确认',
  confirmColor: 'error',
  confirmVariant: 'solid',
  icon: 'i-lucide-alert-triangle',
})

export const useForgetConfirm = (options: UseForgetConfirmOptions = {}) => {
  const state = ref<ForgetConfirmState>(createBaseState())

  const reset = () => {
    state.value = createBaseState()
  }

  const openForNote = (note: NoteRecord) => {
    state.value = {
      note,
      open: true,
      title: note.importance === 'high' ? '确认折叠核心记忆？' : '确认遗忘这条记忆？',
      description:
        note.importance === 'high'
          ? `《${note.title || '未命名笔记'}》被标记为核心记忆，确认后将进入折叠区，可在遗忘日志中彻底清理。`
          : `遗忘后《${note.title || '未命名笔记'}》将立即归档并从活跃列表移除。`,
      confirmLabel: '确认遗忘',
      confirmColor: 'error',
      confirmVariant: 'solid',
      icon: note.importance === 'high' ? 'i-lucide-shield-alert' : 'i-lucide-alert-triangle',
    }
  }

  const confirm = async () => {
    const note = state.value.note
    if (!note) {
      reset()
      return
    }

    try {
      await Promise.resolve(options.onExecuteForget?.(note))
    } finally {
      reset()
    }
  }

  watch(
    () => state.value.open,
    (value) => {
      if (!value) {
        state.value.note = null
        state.value.title = ''
        state.value.description = ''
        state.value.confirmLabel = '确认'
        state.value.confirmColor = 'error'
        state.value.confirmVariant = 'solid'
        state.value.icon = 'i-lucide-alert-triangle'
      }
    }
  )

  const dialogBindings = computed(() => ({
    title: state.value.title,
    description: state.value.description,
    confirmLabel: state.value.confirmLabel,
    confirmColor: state.value.confirmColor,
    confirmVariant: state.value.confirmVariant,
    icon: state.value.icon,
  }))

  return {
    state,
    dialogBindings,
    openForNote,
    reset,
    confirm,
  }
}
