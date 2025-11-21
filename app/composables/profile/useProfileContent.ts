export type ProfileContentAction = {
  key?: string
  label: string
  icon?: string
  to?: string
  action?: string
  variant?: 'solid' | 'outline' | 'subtle' | 'soft' | 'ghost' | 'link'
  color?: 'primary' | 'secondary' | 'neutral' | 'error' | 'warning' | 'success' | 'info'
}

export type ProfileContentTag = {
  key?: string
  label: string
  icon?: string
  color?: 'primary' | 'secondary' | 'neutral' | 'error' | 'warning' | 'success' | 'info'
}

export type ProfileContentStat = {
  key: string
  label: string
  value: string
  icon?: string
  color?: 'primary' | 'secondary' | 'neutral' | 'error' | 'warning' | 'success' | 'info'
  unit?: string
  trend?: {
    direction?: 'up' | 'down' | 'steady'
    value?: string
    label?: string
  }
}

export type ProfileContentSummary = {
  name?: string
  role?: string
  bio?: string
  location?: string
  avatar?: {
    src?: string
    alt?: string
  }
  status?: {
    label: string
    icon?: string
    color?: ProfileContentStat['color']
    variant?: ProfileContentAction['variant']
  }
  tags?: ProfileContentTag[]
  actions?: ProfileContentAction[]
  stats?: ProfileContentStat[]
}

export type ProfileContentInsight = {
  key: string
  title: string
  description?: string
  icon?: string
  color?: ProfileContentStat['color']
  metric?: string
  badge?: {
    label: string
    color?: ProfileContentStat['color']
    variant?: ProfileContentAction['variant']
    icon?: string
  }
}

export type ProfileContentTimelineItem = {
  key: string
  title: string
  description?: string
  timestamp?: string
  icon?: string
  color?: ProfileContentStat['color']
}

export type ProfileContentResourceLink = {
  key: string
  label: string
  value?: string
  description?: string
  icon?: string
  to?: string
  action?: string
  color?: ProfileContentStat['color']
}

export type ProfileContent = {
  title: string
  subtitle?: string
  badge?: {
    label: string
    color?: ProfileContentStat['color']
    icon?: string
  }
  summary?: ProfileContentSummary
  insights?: {
    title?: string
    subtitle?: string
    items?: ProfileContentInsight[]
  }
  timeline?: {
    title?: string
    description?: string
    empty?: {
      title?: string
      description?: string
    }
    items?: ProfileContentTimelineItem[]
  }
  resources?: {
    title?: string
    description?: string
    links?: ProfileContentResourceLink[]
  }
}

const createEmptyProfileContent = (): ProfileContent => ({
  title: '个人档案',
  subtitle: '完善你的记忆档案，帮助 AI 更懂你。',
  badge: {
    label: '个人资料',
    color: 'primary',
    icon: 'i-lucide-user-round',
  },
  summary: {
    name: '未命名用户',
    role: '角色信息待完善',
    bio: '添加一段简介，让团队了解你关注的记忆类型与整理偏好。',
    location: '位置待完善',
    avatar: undefined,
    status: undefined,
    tags: [],
    actions: [],
    stats: [],
  },
  insights: {
    title: '记忆画像亮点',
    subtitle: '即将展示你的 AI 分析洞察。',
    items: [],
  },
  timeline: {
    title: '最近活动',
    description: 'AI 记录的关键操作会展示在这里。',
    empty: {
      title: '暂无活动记录',
      description: '完成一次遗忘操作或恢复笔记即可看到时间线。',
    },
    items: [],
  },
  resources: {
    title: '协作与支持',
    description: '接入后端后将在这里呈现常用入口。',
    links: [],
  },
})

const mergeProfileContent = (
  patch?: Partial<ProfileContent>,
  base: ProfileContent = createEmptyProfileContent()
): ProfileContent => {
  if (!patch) {
    return { ...base }
  }

  const result: ProfileContent = {
    ...base,
    ...patch,
    summary: patch.summary
      ? {
          ...base.summary,
          ...patch.summary,
          avatar: patch.summary.avatar ?? base.summary?.avatar,
          status: patch.summary.status ?? base.summary?.status,
          tags: patch.summary.tags ?? base.summary?.tags ?? [],
          actions: patch.summary.actions ?? base.summary?.actions ?? [],
          stats: patch.summary.stats ?? base.summary?.stats ?? [],
        }
      : base.summary,
    insights: patch.insights
      ? {
          ...base.insights,
          ...patch.insights,
          items: patch.insights.items ?? base.insights?.items ?? [],
        }
      : base.insights,
    timeline: patch.timeline
      ? {
          ...base.timeline,
          ...patch.timeline,
          empty: patch.timeline.empty ?? base.timeline?.empty,
          items: patch.timeline.items ?? base.timeline?.items ?? [],
        }
      : base.timeline,
    resources: patch.resources
      ? {
          ...base.resources,
          ...patch.resources,
          links: patch.resources.links ?? base.resources?.links ?? [],
        }
      : base.resources,
  }

  return result
}

export const useProfileContent = () => {
  const state = useState<ProfileContent>('profile-content', createEmptyProfileContent)

  const content = computed(() => state.value)

  const setProfileContent = (payload?: Partial<ProfileContent>) => {
    state.value = mergeProfileContent(payload, state.value)
  }

  const resetProfileContent = () => {
    state.value = createEmptyProfileContent()
  }

  return {
    content,
    setProfileContent,
    resetProfileContent,
  }
}
