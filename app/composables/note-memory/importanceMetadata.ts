import type { NoteImportanceLevel } from './noteTypes'

export type ImportanceVariant = 'solid' | 'soft' | 'subtle' | 'outline'

export interface ImportanceMetadataEntry {
  label: string
  color: string
  icon: string
  badgeVariant: ImportanceVariant
  defaultScore: number
}

export const IMPORTANCE_METADATA: Record<NoteImportanceLevel, ImportanceMetadataEntry> = {
  high: {
    label: '核心记忆',
    color: 'primary',
    icon: 'i-lucide-flame',
    badgeVariant: 'solid',
    defaultScore: 85,
  },
  medium: {
    label: '重点追踪',
    color: 'amber',
    icon: 'i-lucide-target',
    badgeVariant: 'soft',
    defaultScore: 65,
  },
  low: {
    label: '随手记录',
    color: 'gray',
    icon: 'i-lucide-pen-line',
    badgeVariant: 'subtle',
    defaultScore: 35,
  },
  noise: {
    label: '噪声过滤',
    color: 'neutral',
    icon: 'i-lucide-waves',
    badgeVariant: 'outline',
    defaultScore: 15,
  },
}
