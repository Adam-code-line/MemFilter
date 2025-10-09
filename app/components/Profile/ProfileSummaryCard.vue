<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileContentAction, ProfileContentStat, ProfileContentSummary } from '~/composables/profile/useProfileContent'

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

const hasSummaryContent = computed(() => {
  const summary = props.summary
  if (!summary) {
    return false
  }

  return Boolean(
    summary.name?.trim() ||
    summary.role?.trim() ||
    summary.bio?.trim() ||
    summary.location?.trim() ||
    summary.tags?.length
  )
})

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
        <div v-if="hasSummaryContent" class="flex items-start gap-4">
          <UAvatar
            v-if="summary?.avatar?.src"
            size="lg"
            :src="summary.avatar.src"
            :alt="summary.avatar.alt ?? summary?.name ?? '用户头像'"
            class="ring-4 ring-primary-500/15"
          />
          <div class="flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ summary?.name || '—' }}
              </h2>
              <UBadge
                v-if="summary?.status"
                :label="summary.status.label"
                :icon="summary.status.icon"
                :color="summary.status.color ?? 'primary'"
                :variant="summary.status.variant ?? 'soft'"
              />
            </div>
            <p v-if="summary?.role" class="text-sm text-primary-500 dark:text-primary-300">
              {{ summary.role }}
            </p>
            <p v-if="summary?.bio" class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {{ summary.bio }}
            </p>
            <div v-if="summary?.location" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <UIcon name="i-lucide-map-pin" class="text-base" />
              <span>{{ summary.location }}</span>
            </div>
            <div v-if="summary?.tags?.length" class="flex flex-wrap gap-2 pt-1">
              <UBadge
                v-for="tag in summary.tags"
                :key="tag.key ?? tag.label"
                :label="tag.label"
                :icon="tag.icon"
                :color="tag.color ?? 'neutral'"
                variant="soft"
                class="rounded-full"
              />
            </div>
          </div>
        </div>
        <div v-else class="flex items-center justify-center rounded-lg border border-dashed border-gray-200 px-6 py-12 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          个人资料内容即将接入
        </div>

        <div v-if="summary?.actions?.length" class="flex flex-wrap gap-3">
          <UButton
            v-for="action in summary.actions"
            :key="action.key ?? action.label"
            :label="action.label"
            :icon="action.icon"
            :to="action.to"
            :variant="action.variant ?? 'solid'"
            :color="action.color ?? 'primary'"
            @click="() => handleAction(action)"
          />
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
