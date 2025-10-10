import type { ImportanceLevel, NoteRecord } from './types'

const badgeMap: Record<ImportanceLevel, { label: string; color: string; variant: 'solid' | 'soft' | 'subtle' | 'outline'; icon: string }> = {
  high: { label: '核心记忆', color: 'primary', variant: 'solid', icon: 'i-lucide-flame' },
  medium: { label: '重点追踪', color: 'amber', variant: 'soft', icon: 'i-lucide-target' },
  low: { label: '随手记录', color: 'gray', variant: 'subtle', icon: 'i-lucide-pen-line' },
  noise: { label: '噪声过滤', color: 'neutral', variant: 'outline', icon: 'i-lucide-waves' }
}

const fallbackBadge = { label: '未分类', color: 'neutral', variant: 'subtle' as const, icon: 'i-lucide-circle' }

export const useImportanceBadges = () => {
  const resolveImportanceBadge = (importance: ImportanceLevel) => badgeMap[importance] ?? fallbackBadge

  const resolveNoteItem = (note: NoteRecord) => {
    const badge = resolveImportanceBadge(note.importance)
    return {
      id: note.id,
      record: note,
      title: note.title || '未命名笔记',
      description: note.date ?? '',
      iconName: typeof note.icon === 'string' && note.icon.startsWith('i-') ? note.icon : undefined,
      iconFallback: typeof note.icon === 'string' && !note.icon.startsWith('i-') ? note.icon : '📝',
      badge,
      score: Math.round(note.importanceScore ?? 0)
    }
  }

  const useNoteItems = (notes: ComputedRef<NoteRecord[]>) => computed(() => notes.value.map(resolveNoteItem))

  return {
    importanceBadgeMap: badgeMap,
    resolveImportanceBadge,
    resolveNoteItem,
    useNoteItems
  }
}
