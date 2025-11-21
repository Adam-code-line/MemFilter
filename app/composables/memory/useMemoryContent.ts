const defaultIntroDescription =
  '跟随忆滤的遗忘引擎回顾记忆变化：查看活跃片段、正在淡化的内容以及已归档的噪声，掌控每一次恢复与遗忘决策。'

const defaultStats = [
  {
    key: 'fresh' as const,
    label: '活跃记忆',
    description: '保持清晰的重点内容，可随时继续编辑。',
    icon: 'i-lucide-flame',
    color: 'primary' as const,
  },
  {
    key: 'fading' as const,
    label: '正在淡化',
    description: '自动模糊的记忆，决定是挽救还是让其自然遗忘。',
    icon: 'i-lucide-timer',
    color: 'warning' as const,
  },
  {
    key: 'archived' as const,
    label: '归档片段',
    description: '噪声或陈旧内容处于折叠状态，随需恢复。',
    icon: 'i-lucide-archive',
    color: 'neutral' as const,
  },
]

const defaultSections = [
  {
    key: 'fresh' as const,
    title: '活跃记忆',
    description: '近期创建且仍保持清晰的高价值信息。',
    icon: 'i-lucide-flame',
    accent: 'primary' as const,
    empty: {
      title: '最近记忆充沛',
      description: '保持记录习惯，重要记忆将继续清晰呈现。',
    },
  },
  {
    key: 'fading' as const,
    title: '正在淡化',
    description: '处于艾宾浩斯遗忘曲线中的内容，可选择恢复或加速遗忘。',
    icon: 'i-lucide-timer',
    accent: 'warning' as const,
    empty: {
      title: '暂时没有淡化内容',
      description: '没有需要处理的淡化记忆，稍后再来看看。',
    },
  },
  {
    key: 'archived' as const,
    title: '归档记忆',
    description: '已经折叠的低价值或噪声片段，随时可以恢复。',
    icon: 'i-lucide-archive',
    accent: 'neutral' as const,
    empty: {
      title: '归档区空空如也',
      description: '暂无归档记忆，可以继续整理重要内容。',
    },
  },
]

const defaultDetailPanel = {
  eyebrow: 'Memory Focus',
  title: '记忆详情',
  clearLabel: '清除选择',
  emptyFallback: {
    title: '暂无内容',
    description: '稍后再来看看。',
  },
  actions: {
    restore: {
      label: '恢复记忆',
      icon: 'i-lucide-rotate-ccw',
      color: 'primary' as const,
      variant: 'soft' as const,
    },
    accelerate: {
      label: '加速遗忘',
      icon: 'i-lucide-brain',
      color: 'warning' as const,
      variant: 'soft' as const,
    },
    forget: {
      label: '直接遗忘',
      icon: 'i-lucide-zap-off',
      color: 'error' as const,
      variant: 'ghost' as const,
      tooltip: '立即将记忆标记为完全淡化并归档。',
    },
  },
}

export const useMemoryContent = async () => {
  const { data } = await useAsyncData('memory-config', () => queryCollection('memory').first())

  const memoryConfig = computed(() => data.value ?? null)

  const badge = computed(() => memoryConfig.value?.badge ?? null)
  const pageTitle = computed(() => memoryConfig.value?.title ?? '记忆回溯')
  const pageSubtitle = computed(() => memoryConfig.value?.subtitle ?? '遗忘日志与记忆轨迹')
  const introDescription = computed(
    () => memoryConfig.value?.intro?.description ?? defaultIntroDescription
  )
  const statsSource = computed(() => memoryConfig.value?.overview?.stats ?? defaultStats)
  const sectionSource = computed(() => memoryConfig.value?.sections ?? defaultSections)
  const detail = computed(() => {
    const config = memoryConfig.value?.detail
    const mergedActions = Object.entries(defaultDetailPanel.actions).reduce(
      (acc, [key, value]) => {
        const actionKey = key as keyof typeof defaultDetailPanel.actions
        return {
          ...acc,
          [actionKey]: {
            ...value,
            ...(config?.actions?.[actionKey] ?? {}),
          },
        }
      },
      {} as typeof defaultDetailPanel.actions
    )

    return {
      ...defaultDetailPanel,
      ...(config ?? {}),
      emptyFallback: {
        ...defaultDetailPanel.emptyFallback,
        ...(config?.emptyFallback ?? {}),
      },
      actions: mergedActions,
    }
  })

  return {
    badge,
    pageTitle,
    pageSubtitle,
    introDescription,
    statsSource,
    sectionSource,
    detail,
    defaults: {
      intro: defaultIntroDescription,
      stats: defaultStats,
      sections: defaultSections,
      detail: defaultDetailPanel,
    },
  }
}

export type MemoryStatsSource = typeof defaultStats
export type MemorySectionsSource = typeof defaultSections
export type MemoryDetailPanel = typeof defaultDetailPanel
