import { useToast } from '#imports'
import type { SettingsContent } from './useSettingsContent'
import {
  useSettingsStore,
  type SettingsNotifications,
  type SettingsPreferences,
  type SettingsProfile,
  type SettingsSecurity,
} from './useSettingsStore'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type SaveTarget = 'profile' | 'security' | 'preferences' | 'notifications'

export const useSettingsForm = (content: MaybeRefOrGetter<SettingsContent>) => {
  const settingsContent = computed(() => toValue(content))

  const store = useSettingsStore()
  const toast = useToast()

  const { profile, security, preferences, notifications } = store

  const saving = reactive<Record<SaveTarget, boolean>>({
    profile: false,
    security: false,
    preferences: false,
    notifications: false,
  })

  const sectionMap = computed(() => settingsContent.value.sections ?? [])

  const sections = computed(() =>
    sectionMap.value.map((section) => ({
      ...section,
      cards: section.cards.map((card) => ({
        ...card,
        fields: card.fields?.map((field) => ({
          ...field,
          value: resolveFieldValue(card.key, field.key),
        })),
        toggles: card.toggles?.map((toggle) => ({
          ...toggle,
          value: resolveToggleValue(card.key, toggle.key),
        })),
        options: card.options?.map((option) => ({
          ...option,
          selected: resolveOptionSelected(card.key, option.key),
        })),
      })),
    }))
  )

  function resolveFieldValue(cardKey: string, fieldKey: string) {
    if (cardKey === 'profile') {
      const key = fieldKey as keyof SettingsProfile
      return profile.value[key] ?? ''
    }
    return ''
  }

  function resolveToggleValue(cardKey: string, toggleKey: string) {
    if (cardKey === 'security') {
      const key = toggleKey as keyof SettingsSecurity
      return security.value[key] ?? false
    }

    if (cardKey === 'aiAssist') {
      const key = toggleKey as keyof SettingsPreferences['aiAssist']
      return preferences.value.aiAssist[key] ?? false
    }

    if (cardKey === 'alerts') {
      const key = toggleKey as keyof SettingsNotifications['alerts']
      return notifications.value.alerts[key] ?? false
    }

    return false
  }

  function resolveOptionSelected(cardKey: string, optionKey: string) {
    if (cardKey === 'memoryEngine') {
      return preferences.value.memoryEngine === optionKey
    }

    if (cardKey === 'digest') {
      return notifications.value.digestWindow === optionKey
    }

    return false
  }

  function updateField(cardKey: string, fieldKey: string, value: string) {
    if (cardKey === 'profile') {
      store.updateProfileField(fieldKey as keyof SettingsProfile, value)
    }
  }

  function updateToggle(cardKey: string, toggleKey: string, value: boolean) {
    if (cardKey === 'security') {
      store.toggleSecurity(toggleKey as keyof SettingsSecurity, value)
      return
    }

    if (cardKey === 'aiAssist') {
      store.toggleAiAssist(toggleKey as keyof SettingsPreferences['aiAssist'], value)
      return
    }

    if (cardKey === 'alerts') {
      store.toggleAlert(toggleKey as keyof SettingsNotifications['alerts'], value)
    }
  }

  function selectOption(cardKey: string, optionKey: string) {
    if (cardKey === 'memoryEngine') {
      store.setMemoryEngine(optionKey as SettingsPreferences['memoryEngine'])
      return
    }

    if (cardKey === 'digest') {
      store.setDigestWindow(optionKey as SettingsNotifications['digestWindow'])
    }
  }

  async function persist(target: SaveTarget) {
    if (saving[target]) {
      return
    }

    saving[target] = true
    await delay(480)
    toast.add({
      title: '设置已保存',
      description: resolveToastDescription(target),
      color: 'primary',
      icon: 'i-lucide-check-circle-2',
    })
    saving[target] = false
  }

  function resolveToastDescription(target: SaveTarget) {
    switch (target) {
      case 'profile':
        return '个人资料已更新'
      case 'security':
        return '安全策略已同步'
      case 'preferences':
        return '遗忘引擎偏好已保存'
      case 'notifications':
        return '提醒设置已更新'
    }
  }

  const isSavingProfile = computed(() => saving.profile)
  const isSavingSecurity = computed(() => saving.security)
  const isSavingPreferences = computed(() => saving.preferences)
  const isSavingNotifications = computed(() => saving.notifications)

  return {
    sections,
    profile,
    security,
    preferences,
    notifications,
    isSavingProfile,
    isSavingSecurity,
    isSavingPreferences,
    isSavingNotifications,
    updateField,
    updateToggle,
    selectOption,
    persist,
  }
}
