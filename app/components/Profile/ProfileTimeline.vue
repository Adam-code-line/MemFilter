<script setup lang="ts">
import type { ProfileContentTimelineItem } from '~/composables/profile/useProfileContent'

interface ProfileTimelineProps {
  title?: string
  description?: string
  items?: ProfileContentTimelineItem[] | null
  empty?: {
    title?: string
    description?: string
  } | null
}

const props = withDefaults(defineProps<ProfileTimelineProps>(), {
  title: '最近活动',
  description: '',
  items: () => [],
  empty: undefined
})

const toneClassMap: Record<string, { border: string; icon: string; dot: string }> = {
  primary: { border: 'border-primary-200 dark:border-primary-500/40', icon: 'text-primary-500', dot: 'bg-primary-500' },
  secondary: { border: 'border-secondary-200 dark:border-secondary-500/40', icon: 'text-secondary-500', dot: 'bg-secondary-500' },
  neutral: { border: 'border-gray-200 dark:border-gray-700', icon: 'text-gray-500', dot: 'bg-gray-500' },
  success: { border: 'border-success-200 dark:border-success-500/40', icon: 'text-success-500', dot: 'bg-success-500' },
  warning: { border: 'border-warning-200 dark:border-warning-500/40', icon: 'text-warning-500', dot: 'bg-warning-500' },
  error: { border: 'border-error-200 dark:border-error-500/40', icon: 'text-error-500', dot: 'bg-error-500' },
  info: { border: 'border-info-200 dark:border-info-500/40', icon: 'text-info-500', dot: 'bg-info-500' }
}

const resolveToneClasses = (tone?: string) => {
  if (!tone) {
    return toneClassMap.primary
  }

  return toneClassMap[tone] ?? toneClassMap.primary
}
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-2">
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
        {{ title }}
      </h3>
      <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
        {{ description }}
      </p>
    </div>

    <UCard :ui="{ body: { padding: 'p-6' } }" class="border border-gray-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/60">
      <div v-if="items?.length" class="relative">
        <div class="absolute left-[13px] top-0 bottom-0 w-px bg-gradient-to-b from-primary-200 via-gray-200 to-transparent dark:from-primary-500/40 dark:via-gray-700/60" />
        <ul class="space-y-6">
          <li
            v-for="item in items"
            :key="item.key"
            class="relative flex gap-4"
          >
            <div class="relative flex flex-col items-center">
              <span
                class="absolute -left-[19px] mt-1 h-2.5 w-2.5 rounded-full"
                :class="resolveToneClasses(item.color).dot"
              />
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl border bg-white shadow-sm dark:bg-slate-900"
                :class="resolveToneClasses(item.color).border"
              >
                <UIcon
                  :name="item.icon ?? 'i-lucide-sparkles'"
                  class="text-lg"
                  :class="resolveToneClasses(item.color).icon"
                />
              </div>
            </div>
            <div class="flex-1 space-y-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ item.title }}
                </h4>
                <span v-if="item.timestamp" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ item.timestamp }}
                </span>
              </div>
              <p v-if="item.description" class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {{ item.description }}
              </p>
            </div>
          </li>
        </ul>
      </div>

      <div v-else class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
        <UIcon name="i-lucide-moon-star" class="text-2xl text-primary-500" />
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {{ empty?.title ?? '暂时没有新的活动' }}
        </h4>
        <p v-if="empty?.description" class="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
          {{ empty.description }}
        </p>
      </div>
    </UCard>
  </section>
</template>
