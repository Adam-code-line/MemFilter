
export type HistoryContentStatKey = 'recoverable' | 'archived' | 'purged' | 'restored'
export type HistorySectionKey = 'recoverable' | 'archived' | 'purged'

export interface HistoryContentStat {
  key: HistoryContentStatKey
  label: string
  description?: string
  icon?: string
  color?: string
}

export interface HistoryContentSection {
  key: HistorySectionKey
  title: string
  description?: string
  icon?: string
  accent?: string
  empty?: {
    title?: string
    description?: string
  }
}

export interface HistoryContent {
  title?: string
  subtitle?: string
  badge?: {
    label?: string
    color?: string
    icon?: string
  }
  hero?: {
    description?: string
    helper?: string
    action?: {
      label?: string
      icon?: string
      to?: string
      variant?: string
      color?: string
    }
  }
  overview?: {
    title?: string
    description?: string
    stats?: HistoryContentStat[]
  }
  timeline?: {
    title?: string
    description?: string
    empty?: {
      title?: string
      description?: string
    }
  }
  sections?: HistoryContentSection[]
  restoreLog?: {
    title?: string
    description?: string
    empty?: {
      title?: string
      description?: string
    }
  }
}

const fallbackContent: HistoryContent = {
  title: '遗忘历史',
  subtitle: '查看淡化的记忆并选择恢复。',
  badge: {
    label: '遗忘档案',
    color: 'neutral',
    icon: 'i-lucide-archive-restore'
  },
  sections: []
}

export const useHistoryContent = async () => {
  const { data } = await useAsyncData('history-config', () => queryCollection('history').first())

  const content = computed<HistoryContent>(() => {
    const raw = data.value
    if (!raw) {
      return fallbackContent
    }

    return {
      title: raw.title ?? fallbackContent.title,
      subtitle: raw.subtitle ?? fallbackContent.subtitle,
      badge: raw.badge ?? fallbackContent.badge,
      hero: raw.hero,
      overview: raw.overview,
      timeline: raw.timeline,
      sections: raw.sections ?? [],
      restoreLog: raw.restoreLog
    }
  })

  return {
    content
  }
}
