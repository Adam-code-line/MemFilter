export type SettingsContentToggle = {
  key: string
  label: string
  description?: string
  icon?: string
  default?: boolean
}

export type SettingsContentOption = {
  key: string
  label: string
  description?: string
}

export type SettingsContentField = {
  key: string
  label: string
  placeholder?: string
  helper?: string
  type?: 'text' | 'email' | 'password' | 'textarea'
}

export type SettingsContentCard = {
  key: string
  title: string
  description?: string
  icon?: string
  type: 'profile' | 'security' | 'select-group' | 'toggle-group'
  fields?: SettingsContentField[]
  toggles?: SettingsContentToggle[]
  options?: SettingsContentOption[]
}

export type SettingsContentSection = {
  key: string
  title: string
  description?: string
  icon?: string
  cards: SettingsContentCard[]
}

export type SettingsContent = {
  title: string
  subtitle?: string
  badge?: {
    label: string
    color?: string
    icon?: string
  }
  sections: SettingsContentSection[]
}

const fallbackContent: SettingsContent = {
  title: '设置中心',
  subtitle: '管理你的账户、安全策略与遗忘引擎偏好。',
  badge: {
    label: '设置中心',
    color: 'primary',
    icon: 'i-lucide-settings',
  },
  sections: [],
}

export const useSettingsContent = async () => {
  const { data } = await useAsyncData('settings-config', () => queryCollection('settings').first())

  const content = computed<SettingsContent>(() => {
    const raw = data.value
    if (!raw) {
      return fallbackContent
    }

    return {
      title: raw.title ?? fallbackContent.title,
      subtitle: raw.subtitle ?? fallbackContent.subtitle,
      badge: raw.badge ?? fallbackContent.badge,
      sections: Array.isArray(raw.sections) ? raw.sections : [],
    }
  })

  return {
    content,
  }
}
