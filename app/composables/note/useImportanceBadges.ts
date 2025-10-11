import type { ImportanceLevel, NoteRecord } from './types'
import { IMPORTANCE_METADATA } from '../note-memory/importanceMetadata'

const fallbackBadge = { label: '未分类', color: 'neutral', variant: 'subtle' as const, icon: 'i-lucide-circle' }

const importanceBadgeMap = Object.fromEntries(
  Object.entries(IMPORTANCE_METADATA).map(([key, value]) => [
    key,
    {
      label: value.label,
      color: value.color,
      variant: value.badgeVariant,
      icon: value.icon
    }
  ])
) as Record<ImportanceLevel, { label: string; color: string; variant: 'solid' | 'soft' | 'subtle' | 'outline'; icon: string }>

export const useImportanceBadges = () => {
  const resolveImportanceBadge = (importance: ImportanceLevel) => importanceBadgeMap[importance] ?? fallbackBadge

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
  importanceBadgeMap,
    resolveImportanceBadge,
    resolveNoteItem,
    useNoteItems
  }
}
