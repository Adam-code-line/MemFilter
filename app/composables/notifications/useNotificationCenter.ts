import { useState, computed, watch } from '#imports'
import { nanoid } from 'nanoid'
import type { NoteRecord } from '../note/types'
import { useSettingsStore } from '../settings/useSettingsStore'

type NotificationType = 'collapse' | 'recovery'

export interface NotificationEntry {
  id: string
  type: NotificationType
  title: string
  description: string
  createdAt: number
  read: boolean
  noteId?: number | string
  fadeLevel?: number
  daysRemaining?: number | null
}

interface DeliveryState {
  collapse?: boolean
  recoveryStage?: number
}

interface DeliveryMap {
  [noteId: string]: DeliveryState
}

const DELIVERY_LIMIT = 30

export const useNotificationCenter = () => {
  const notificationsState = useState<NotificationEntry[]>('notification-center:entries', () => [])

  const deliveryState = useState<DeliveryMap>('notification-center:delivery', () => ({}))

  const modalOpenState = useState<boolean>('notification-center:modal-open', () => false)

  const settingsStore = useSettingsStore()
  const notificationPreferences = settingsStore.notifications

  const notifications = notificationsState
  const isModalOpen = modalOpenState

  const unreadCount = computed(() => notifications.value.filter((entry) => !entry.read).length)

  const ensureDeliveryState = (noteId: string): DeliveryState => {
    if (!deliveryState.value[noteId]) {
      deliveryState.value[noteId] = {}
    }
    return deliveryState.value[noteId]
  }

  const appendNotification = (entry: Omit<NotificationEntry, 'id' | 'createdAt' | 'read'>) => {
    const next: NotificationEntry = {
      id: nanoid(12),
      createdAt: Date.now(),
      read: false,
      ...entry,
    }

    notifications.value = [next, ...notifications.value].slice(0, DELIVERY_LIMIT)
  }

  const clearDeliveryState = (noteId: string, key: keyof DeliveryState) => {
    const target = deliveryState.value[noteId]
    if (!target) {
      return
    }
    delete target[key]
    if (!Object.keys(target).length) {
      delete deliveryState.value[noteId]
    }
  }

  const publishCollapseEvent = (note: NoteRecord) => {
    const prefs = notificationPreferences.value
    if (!prefs.alerts.collapseAlerts) {
      return
    }

    const noteId = String(note.id)
    const state = ensureDeliveryState(noteId)

    if (state.collapse) {
      return
    }

    state.collapse = true

    appendNotification({
      type: 'collapse',
      title: `笔记《${note.title || '未命名笔记'}》已折叠`,
      description: '该记忆已进入折叠状态，可在记忆库中恢复或彻底清理。',
      noteId,
      fadeLevel: note.fadeLevel,
      daysRemaining: note.daysUntilForgotten ?? null,
    })
  }

  const publishRecoveryReminder = (note: NoteRecord) => {
    const prefs = notificationPreferences.value
    if (!prefs.alerts.recoveryAlerts) {
      return
    }

    if (note.isCollapsed) {
      return
    }

    const noteId = String(note.id)
    const state = ensureDeliveryState(noteId)
    const currentStage = note.fadeLevel ?? 0

    if (state.recoveryStage && state.recoveryStage >= currentStage) {
      return
    }

    if (currentStage < 3) {
      clearDeliveryState(noteId, 'recoveryStage')
      return
    }

    state.recoveryStage = currentStage

    const remaining =
      typeof note.daysUntilForgotten === 'number' ? Math.max(note.daysUntilForgotten, 0) : null

    appendNotification({
      type: 'recovery',
      title: `笔记《${note.title || '未命名笔记'}》进入恢复窗口`,
      description:
        remaining === null
          ? '记忆即将折叠，如需保留请及时恢复或刷新内容。'
          : `记忆将在约 ${remaining} 天后折叠，如需保留请及时恢复或刷新内容。`,
      noteId,
      fadeLevel: note.fadeLevel,
      daysRemaining: remaining,
    })
  }

  const handleNoteTransition = (previous: NoteRecord | null | undefined, next: NoteRecord) => {
    if (!next) {
      return
    }

    const wasCollapsed = previous?.isCollapsed ?? false
    const isCollapsed = next.isCollapsed

    if (!wasCollapsed && isCollapsed) {
      publishCollapseEvent(next)
      return
    }

    const previousFadeLevel = previous?.fadeLevel ?? 0
    const nextFadeLevel = next.fadeLevel ?? 0

    if (nextFadeLevel >= 3 && (!previous || previousFadeLevel < 3)) {
      publishRecoveryReminder(next)
    }
  }

  const markAsRead = (id: string) => {
    notifications.value = notifications.value.map((entry) =>
      entry.id === id ? { ...entry, read: true } : entry
    )
  }

  const markAllAsRead = () => {
    notifications.value = notifications.value.map((entry) => ({ ...entry, read: true }))
  }

  const removeNotification = (id: string) => {
    notifications.value = notifications.value.filter((entry) => entry.id !== id)
  }

  const resetNoteDeliveryState = (noteId: string) => {
    delete deliveryState.value[noteId]
  }

  const openModal = () => {
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  watch(isModalOpen, (value) => {
    if (value) {
      markAllAsRead()
    }
  })

  return {
    notifications,
    unreadCount,
    isModalOpen,
    openModal,
    closeModal,
    markAsRead,
    markAllAsRead,
    removeNotification,
    resetNoteDeliveryState,
    handleNoteTransition,
    publishCollapseEvent,
    publishRecoveryReminder,
  }
}
