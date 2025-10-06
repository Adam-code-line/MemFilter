<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '~~/stores/notes'

definePageMeta({
  layout: 'app'
})

useHead({
  title: '记忆回溯'
})

const notesStore = useNotesStore()
notesStore.ensureInitialized()

const { notes } = storeToRefs(notesStore)

const importancePriority = {
  high: 0,
  medium: 1,
  low: 2,
  noise: 3
} as const

const sortByImportance = (collection: any[]) =>
  [...collection].sort((a, b) => {
    const importanceDelta = (importancePriority[a.importance as keyof typeof importancePriority] ?? 99) -
      (importancePriority[b.importance as keyof typeof importancePriority] ?? 99)
    if (importanceDelta !== 0) {
      return importanceDelta
    }
    const scoreDelta = (b.importanceScore ?? 0) - (a.importanceScore ?? 0)
    if (scoreDelta !== 0) {
      return scoreDelta
    }
    return (a.fadeLevel ?? 0) - (b.fadeLevel ?? 0)
  })

const { data: memoryCopy } = await useAsyncData('memory-config', () => queryCollection('memory').first())

const memoryConfig = computed(() => memoryCopy.value ?? null)

const defaultIntroDescription = '跟随忆滤的遗忘引擎回顾记忆变化：查看活跃片段、正在淡化的内容以及已归档的噪声，掌控每一次恢复与遗忘决策。'

const defaultStats = [
  {
    key: 'fresh' as const,
    label: '活跃记忆',
    description: '保持清晰的重点内容，可随时继续编辑。',
    icon: 'i-lucide-flame',
    color: 'primary' as const
  },
  {
    key: 'fading' as const,
    label: '正在淡化',
    description: '自动模糊的记忆，决定是挽救还是让其自然遗忘。',
    icon: 'i-lucide-timer',
    color: 'warning' as const
  },
  {
    key: 'archived' as const,
    label: '归档片段',
    description: '噪声或陈旧内容处于折叠状态，随需恢复。',
    icon: 'i-lucide-archive',
    color: 'neutral' as const
  }
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
      description: '保持记录习惯，重要记忆将继续清晰呈现。'
    }
  },
  {
    key: 'fading' as const,
    title: '正在淡化',
    description: '处于艾宾浩斯遗忘曲线中的内容，可选择恢复或加速遗忘。',
    icon: 'i-lucide-timer',
    accent: 'warning' as const,
    empty: {
      title: '暂时没有淡化内容',
      description: '没有需要处理的淡化记忆，稍后再来看看。'
    }
  },
  {
    key: 'archived' as const,
    title: '归档记忆',
    description: '已经折叠的低价值或噪声片段，随时可以恢复。',
    icon: 'i-lucide-archive',
    accent: 'neutral' as const,
    empty: {
      title: '归档区空空如也',
      description: '暂无归档记忆，可以继续整理重要内容。'
    }
  }
]

const categorizedMemories = computed(() => {
  const fresh: any[] = []
  const fading: any[] = []
  const archived: any[] = []

  for (const note of notes.value) {
    let bucket: 'fresh' | 'fading' | 'archived'

    if ((note.fadeLevel ?? 0) >= 4 || note.isCollapsed) {
      bucket = 'archived'
    } else if ((note.fadeLevel ?? 0) >= 2) {
      bucket = 'fading'
    } else {
      bucket = 'fresh'
    }

    if (bucket === 'fresh' && note.importance !== 'high' && (note.forgettingProgress ?? 0) > 50) {
      bucket = 'fading'
    }

    if (bucket === 'fresh') {
      fresh.push(note)
    } else if (bucket === 'fading') {
      fading.push(note)
    } else {
      archived.push(note)
    }
  }

  return {
    fresh: sortByImportance(fresh),
    fading: sortByImportance(fading),
    archived: sortByImportance(archived)
  }
})

const badge = computed(() => memoryConfig.value?.badge ?? null)
const pageTitle = computed(() => memoryConfig.value?.title ?? '记忆回溯')
const pageSubtitle = computed(() => memoryConfig.value?.subtitle ?? '遗忘日志与记忆轨迹')
const introDescription = computed(() => memoryConfig.value?.intro?.description ?? defaultIntroDescription)
const statsSource = computed(() => memoryConfig.value?.overview?.stats ?? defaultStats)
const sectionSource = computed(() => memoryConfig.value?.sections ?? defaultSections)

const statColorMap: Record<string, string> = {
  primary: 'text-primary-500',
  warning: 'text-amber-500',
  neutral: 'text-slate-500',
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  secondary: 'text-slate-500'
}

const stats = computed(() =>
  statsSource.value.map(stat => {
    const key = stat.key as keyof typeof categorizedMemories.value
    const value = categorizedMemories.value[key]?.length ?? 0
    return {
      ...stat,
      value,
      colorClass: stat.color ? statColorMap[stat.color] ?? 'text-primary-500' : 'text-primary-500'
    }
  })
)

const sections = computed(() =>
  sectionSource.value.map(section => {
    const defaults = defaultSections.find(item => item.key === section.key)
    const items = categorizedMemories.value[section.key] ?? []
    const emptyDefaults = defaults?.empty ?? {}
    return {
      ...defaults,
      ...section,
      items,
      count: items.length,
      accent: section.accent ?? defaults?.accent ?? 'neutral',
      empty: {
        title: section.empty?.title ?? emptyDefaults.title ?? '',
        description: section.empty?.description ?? emptyDefaults.description ?? ''
      }
    }
  })
)

const handleRestore = (note: any) => notesStore.restoreNote(note)
const handleAccelerate = (note: any) => notesStore.accelerateForgetting(note)
const handleToggleCollapse = (note: any) => notesStore.toggleCollapse(note)
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-10">
    <section class="space-y-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <UBadge
            v-if="badge"
            :label="badge.label"
            :color="badge.color ?? 'primary'"
            variant="soft"
            :icon="badge.icon"
          />
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
        </div>
        <p v-if="pageSubtitle" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
          {{ pageSubtitle }}
        </p>
        <p v-if="introDescription" class="text-gray-600 dark:text-gray-400 max-w-3xl">
          {{ introDescription }}
        </p>
      </div>

      <UCard class="border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
        <div class="grid gap-6 sm:grid-cols-3">
          <div
            v-for="stat in stats"
            :key="stat.key"
            class="flex flex-col gap-2"
          >
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <UIcon v-if="stat.icon" :name="stat.icon" class="text-base text-primary" />
              <span>{{ stat.label }}</span>
            </div>
            <span :class="['text-2xl font-semibold', stat.colorClass]">{{ stat.value }}</span>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ stat.description }}</p>
          </div>
        </div>
      </UCard>
    </section>

    <section v-for="section in sections" :key="section.key" class="space-y-4">
      <UCard class="border border-gray-200/70 dark:border-white/10">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <UIcon v-if="section.icon" :name="section.icon" class="text-lg text-primary" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ section.title }}</h2>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                {{ section.description }}
              </p>
            </div>
            <UBadge :label="`${section.count} 条`" :color="section.accent ?? 'neutral'" variant="subtle" />
          </div>
        </template>

        <div v-if="section.items.length" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <MemoryCard
            v-for="note in section.items"
            :key="note.id"
            :title="note.title"
            :date="note.date"
            :snippet="note.content"
            :icon="note.icon"
            :importance="note.importance"
            :importance-score="note.importanceScore"
            :fade-level="note.fadeLevel"
            :forgetting-progress="note.forgettingProgress"
            :days-until-forgotten="note.daysUntilForgotten"
            :last-accessed="note.lastAccessed"
            :is-collapsed="note.isCollapsed"
            class="memory-card-item"
            @restore="handleRestore(note)"
            @accelerate-forgetting="handleAccelerate(note)"
            @toggle-collapse="handleToggleCollapse(note)"
          />
        </div>

        <UAlert
          v-else
          icon="i-lucide-check-circle-2"
          :title="section.empty.title || '暂无内容'"
          :description="section.empty.description || '稍后再来看看。'"
          color="neutral"
          variant="soft"
          class="border border-dashed border-gray-300/60 dark:border-white/20"
        />
      </UCard>
    </section>
  </div>
</template>

<style scoped>
.memory-card-item {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.memory-card-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
}
</style>