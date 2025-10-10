<script setup lang="ts">

interface ProfileSummaryCardProps {
  summary?: ProfileContentSummary | null
  stats?: ProfileContentStat[] | null
  metrics?: Record<string, number | string | undefined>
}

const props = withDefaults(defineProps<ProfileSummaryCardProps>(), {
  summary: undefined,
  stats: undefined,
  metrics: () => ({})
})

const emit = defineEmits<{
  (event: 'action', payload: ProfileContentAction): void
}>()

const resolvedStats = computed(() => {
  if (!props.stats?.length) {
    return []
  }

  return props.stats.map(stat => {
    const override = props.metrics?.[stat.key]
    const normalizedOverride = override !== undefined && override !== null && String(override).trim() !== ''
      ? String(override)
      : undefined
    const fallbackValue = typeof stat.value === 'string' && stat.value.trim().length > 0
      ? stat.value
      : '--'
    const normalizedValue = normalizedOverride ?? fallbackValue

    return {
      ...stat,
      value: normalizedValue
    }
  })
})

const safeSummary = computed<ProfileContentSummary>(() => ({
  name: props.summary?.name,
  role: props.summary?.role,
  bio: props.summary?.bio,
  location: props.summary?.location,
  avatar: props.summary?.avatar,
  status: props.summary?.status,
  tags: props.summary?.tags ?? [],
  actions: props.summary?.actions ?? [],
  stats: props.summary?.stats ?? []
}))

const displayName = computed(() => safeSummary.value.name?.trim() || '未命名用户')
const displayRole = computed(() => safeSummary.value.role?.trim() || '角色信息待完善')
const displayBio = computed(() => safeSummary.value.bio?.trim() || '添加一段简介，让团队更了解你的记忆偏好。')
const displayLocation = computed(() => safeSummary.value.location?.trim() || '')
const hasTags = computed(() => Boolean(safeSummary.value.tags.length))

const colorClassMap: Record<string, string> = {
  primary: 'text-primary-500',
  secondary: 'text-secondary-500',
  neutral: 'text-neutral-500',
  error: 'text-error-500',
  warning: 'text-warning-500',
  success: 'text-success-500',
  info: 'text-info-500'
}

const resolveColorClass = (color?: ProfileContentStat['color']) => {
  if (!color) {
    return colorClassMap.primary
  }

  return colorClassMap[color] ?? colorClassMap.primary
}

const resolveTrendPillClass = (direction?: 'up' | 'down' | 'steady') => {
  if (direction === 'up') {
    return 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-300'
  }

  if (direction === 'down') {
    return 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-300'
  }

  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
}

const resolveTrendIcon = (direction?: 'up' | 'down' | 'steady') => {
  if (direction === 'up') {
    return 'i-lucide-trending-up'
  }

  if (direction === 'down') {
    return 'i-lucide-trending-down'
  }

  return 'i-lucide-activity'
}

const handleAction = (action: ProfileContentAction) => {
  emit('action', action)
}
</script>

<template>
  <UCard
    class="border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/70 backdrop-blur"
    :ui="{ body: { padding: 'p-6' } }"
  >
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div class="flex flex-col gap-4 lg:w-2/3">
        <div class="flex items-start gap-4">
          <div class="relative">
            <UAvatar
              v-if="safeSummary?.avatar?.src"
              size="lg"
              :src="safeSummary.avatar.src"
              :alt="safeSummary.avatar.alt ?? displayName"
              class="ring-4 ring-primary-500/15"
            />
            <div
              v-else
              class="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 text-gray-400 shadow-sm dark:border-gray-600 dark:bg-slate-900/70 dark:text-gray-500"
            >
              <UIcon name="i-lucide-user-round" class="text-2xl" />
            </div>
          </div>
          <div class="flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ displayName }}
              </h2>
              <UBadge
                v-if="safeSummary?.status"
                :label="safeSummary.status.label"
                :icon="safeSummary.status.icon"
                :color="safeSummary.status.color ?? 'primary'"
                :variant="safeSummary.status.variant ?? 'soft'"
              />
              <UBadge
                v-else
                label="状态待设置"
                color="neutral"
                variant="soft"
              />
            </div>
            <p class="text-sm text-primary-500 dark:text-primary-300">
              {{ displayRole }}
            </p>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {{ displayBio }}
            </p>
            <div class="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <template v-if="displayLocation">
                <UIcon name="i-lucide-map-pin" class="text-base" />
                <span>{{ displayLocation }}</span>
              </template>
              <template v-else>
                <UIcon name="i-lucide-map-pin" class="text-base" />
                <span>位置待完善</span>
              </template>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <template v-if="hasTags">
                <UBadge
                  v-for="tag in safeSummary?.tags"
                  :key="tag.key ?? tag.label"
                  :label="tag.label"
                  :icon="tag.icon"
                  :color="tag.color ?? 'neutral'"
                  variant="soft"
                  class="rounded-full"
                />
              </template>
              <template v-else>
                <UBadge label="暂无标签" color="neutral" variant="soft" class="rounded-full" />
              </template>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton
            v-for="action in safeSummary.actions"
            :key="action.key ?? action.label"
            :label="action.label"
            :icon="action.icon"
            :to="action.to"
            :variant="action.variant ?? 'solid'"
            :color="action.color ?? 'primary'"
            @click="() => handleAction(action)"
          />
          <UButton
            v-if="!safeSummary.actions.length"
            color="neutral"
            variant="outline"
            icon="i-lucide-pencil"
            disabled
          >
            配置操作按钮
          </UButton>
        </div>
      </div>

      <div v-if="resolvedStats.length" class="grid flex-1 gap-3 sm:grid-cols-2">
        <UCard
          v-for="stat in resolvedStats"
          :key="stat.key"
          :ui="{ body: { padding: 'p-4' } }"
          class="border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                {{ stat.label }}
              </p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ stat.value }}<span v-if="stat.unit" class="ml-1 text-base text-gray-500">{{ stat.unit }}</span>
              </p>
              <p v-if="stat.trend?.label" class="text-xs text-gray-500 dark:text-gray-400">
                {{ stat.trend.label }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <UIcon
                v-if="stat.icon"
                :name="stat.icon"
                class="text-2xl"
                :class="resolveColorClass(stat.color)"
              />
              <span
                v-if="stat.trend?.value"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                :class="resolveTrendPillClass(stat.trend?.direction)"
              >
                <UIcon
                  :name="resolveTrendIcon(stat.trend?.direction)"
                  class="text-sm"
                />
                {{ stat.trend.value }}
              </span>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </UCard>
</template>
