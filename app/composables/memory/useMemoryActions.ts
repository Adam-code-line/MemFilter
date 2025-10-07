import { computed, type Ref } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { MemoryActionFactory, MemoryFadeLevel } from './types'

interface MemoryActionHandlers {
  onEdit: () => void
  onRestore: () => void
  onAccelerate: () => void
  onForget: () => void
  onDelete: () => void
}

export const useMemoryActions = (
  fadeLevel: Ref<MemoryFadeLevel>,
  handlers: MemoryActionHandlers
): MemoryActionFactory => {
  const contextMenuItems = computed<DropdownMenuItem[][]>(() => [
    [
      {
        label: '编辑',
        icon: 'i-lucide-edit',
        click: handlers.onEdit
      }
    ],
    [
      {
        label: fadeLevel.value > 0 ? '恢复记忆' : '加速遗忘',
        icon: fadeLevel.value > 0 ? 'i-lucide-refresh-cw' : 'i-lucide-brain',
        click: fadeLevel.value > 0 ? handlers.onRestore : handlers.onAccelerate
      },
      {
        label: '直接遗忘',
        icon: 'i-lucide-zap-off',
        color: 'red',
        disabled: fadeLevel.value >= 4,
        click: handlers.onForget
      }
    ],
    [
      {
        label: '删除',
        icon: 'i-lucide-trash',
        color: 'red',
        click: handlers.onDelete
      }
    ]
  ])

  return {
    contextMenuItems
  }
}
