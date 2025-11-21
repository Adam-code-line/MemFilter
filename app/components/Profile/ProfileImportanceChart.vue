<script setup lang="ts">
  interface ProfileImportanceChartProps {
    title?: string
    distribution: {
      high: number
      medium: number
      low: number
      noise: number
    }
  }

  const props = withDefaults(defineProps<ProfileImportanceChartProps>(), {
    title: '重要度分布',
    distribution: () => ({
      high: 0,
      medium: 0,
      low: 0,
      noise: 0,
    }),
  })

  const segments = computed(() => {
    const entries = [
      {
        key: 'high',
        label: '核心记忆',
        color: 'bg-error-500',
        badge: '高',
        value: props.distribution.high,
      },
      {
        key: 'medium',
        label: '重要记忆',
        color: 'bg-primary-500',
        badge: '中',
        value: props.distribution.medium,
      },
      {
        key: 'low',
        label: '次要记忆',
        color: 'bg-secondary-500',
        badge: '低',
        value: props.distribution.low,
      },
      {
        key: 'noise',
        label: '噪声内容',
        color: 'bg-neutral-400',
        badge: '噪',
        value: props.distribution.noise,
      },
    ]

    const total = entries.reduce((sum, item) => sum + (item.value ?? 0), 0)

    return entries.map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
      total,
    }))
  })
</script>

<template>
  <UCard
    :ui="{ body: { padding: 'p-5' } }"
    class="border border-gray-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/60"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ title }}
        </h3>
        <UBadge variant="soft" color="primary" :label="segments[0]?.total ?? 0" />
      </div>

      <div class="flex h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          v-for="segment in segments"
          :key="segment.key"
          :style="{ width: `${segment.percent}%` }"
          :class="[segment.color, 'transition-all duration-500']"
        />
      </div>

      <div class="space-y-3">
        <div
          v-for="segment in segments"
          :key="segment.key"
          class="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400"
        >
          <div class="flex items-center gap-3">
            <span :class="['inline-flex h-2 w-2 rounded-full', segment.color]" />
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ segment.label }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="tabular-nums text-sm text-gray-800 dark:text-gray-200">{{
              segment.value
            }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ segment.percent }}%</span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
