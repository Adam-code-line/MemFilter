<script setup lang="ts">
import type { ProfileContentResourceLink } from '~/composables/profile/useProfileContent'

interface ProfileResourceListProps {
  title?: string
  description?: string
  links?: ProfileContentResourceLink[] | null
}

const props = withDefaults(defineProps<ProfileResourceListProps>(), {
  title: '协作与支持',
  description: '',
  links: () => []
})

const emit = defineEmits<{
  (event: 'open', payload: ProfileContentResourceLink): void
}>()

const colorClassMap: Record<string, string> = {
  primary: 'text-primary-500',
  secondary: 'text-secondary-500',
  neutral: 'text-neutral-500',
  error: 'text-error-500',
  warning: 'text-warning-500',
  success: 'text-success-500',
  info: 'text-info-500'
}

const resolveColorClass = (color?: ProfileContentResourceLink['color']) => {
  if (!color) {
    return colorClassMap.primary
  }

  return colorClassMap[color] ?? colorClassMap.primary
}

const handleAction = (link: ProfileContentResourceLink) => {
  emit('open', link)
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

    <div class="grid gap-4 md:grid-cols-2">
      <UCard
        v-for="link in links"
        :key="link.key"
        :ui="{ body: { padding: 'p-5' } }"
        class="border border-gray-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/60"
      >
        <div class="flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10">
              <UIcon
                :name="link.icon ?? 'i-lucide-link'"
                class="text-xl"
                :class="resolveColorClass(link.color)"
              />
            </div>
            <div class="space-y-1">
              <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ link.label }}
              </h4>
              <p v-if="link.description" class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {{ link.description }}
              </p>
              <p v-if="link.value" class="text-xs font-medium text-gray-500 dark:text-gray-400">
                {{ link.value }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <UButton
              color="primary"
              variant="ghost"
              trailing-icon="i-lucide-arrow-up-right"
              :to="link.to"
              @click="() => handleAction(link)"
            >
              访问
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>
