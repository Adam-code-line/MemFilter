<script setup lang="ts">
  interface ProfileInsightGridProps {
    title?: string
    subtitle?: string
    items?: ProfileContentInsight[] | null
  }

  const props = withDefaults(defineProps<ProfileInsightGridProps>(), {
    title: '记忆画像亮点',
    subtitle: '',
    items: () => [],
  })

  const colorClassMap: Record<string, string> = {
    primary: 'text-primary-500',
    secondary: 'text-secondary-500',
    neutral: 'text-neutral-500',
    error: 'text-error-500',
    warning: 'text-warning-500',
    success: 'text-success-500',
    info: 'text-info-500',
  }

  const badgeVariantMap: Record<string, ProfileContentAction['variant']> = {
    solid: 'solid',
    outline: 'outline',
    soft: 'soft',
    subtle: 'subtle',
    ghost: 'ghost',
    link: 'link',
  }

  const resolveColorClass = (color?: ProfileContentInsight['color']) => {
    if (!color) {
      return colorClassMap.primary
    }

    return colorClassMap[color] ?? colorClassMap.primary
  }

  const resolveBadgeVariant = (variant?: ProfileContentAction['variant']) => {
    if (!variant) {
      return 'soft'
    }

    return badgeVariantMap[variant as string] ?? 'soft'
  }
</script>

<template>
  <section v-if="items?.length" class="space-y-4">
    <div class="space-y-2">
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
        {{ title }}
      </h3>
      <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
        {{ subtitle }}
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard
        v-for="insight in items"
        :key="insight.key"
        :ui="{ body: { padding: 'p-5' } }"
        class="border border-gray-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/60"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10"
          >
            <UIcon
              v-if="insight.icon"
              :name="insight.icon"
              class="text-xl"
              :class="resolveColorClass(insight.color)"
            />
            <UIcon v-else name="i-lucide-compass" class="text-xl text-primary-500" />
          </div>
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ insight.title }}
              </h4>
              <UBadge
                v-if="insight.badge"
                :label="insight.badge.label"
                :icon="insight.badge.icon"
                :color="insight.badge.color ?? 'primary'"
                :variant="resolveBadgeVariant(insight.badge.variant)"
              />
            </div>
            <p
              v-if="insight.description"
              class="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
            >
              {{ insight.description }}
            </p>
            <div
              v-if="insight.metric"
              class="inline-flex items-center gap-2 rounded-lg bg-primary-50/80 px-3 py-1 text-sm font-medium text-primary-600 dark:bg-primary-500/10 dark:text-primary-200"
            >
              <UIcon name="i-lucide-activity" class="text-base" />
              <span>{{ insight.metric }}</span>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>
