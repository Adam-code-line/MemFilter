import type { DropdownMenuItem } from '@nuxt/ui'
import type { ChatSessionSummary } from '~/composables/chat/useAIChatSessions'

export interface UseChatSessionMenuOptions {
  onRename: (session: ChatSessionSummary) => void
  onDelete: (id: string) => void
}

export const useChatSessionMenu = (options: UseChatSessionMenuOptions) => {
  const buildMenuItems = (session: ChatSessionSummary): DropdownMenuItem[][] => [
    [
      {
        label: '重命名',
        icon: 'i-lucide-edit-3',
        onSelect: () => options.onRename(session),
      },
    ],
    [
      {
        label: '删除会话',
        icon: 'i-lucide-trash-2',
        color: 'red',
        onSelect: () => options.onDelete(session.id),
      },
    ],
  ]

  return {
    buildMenuItems,
  }
}
