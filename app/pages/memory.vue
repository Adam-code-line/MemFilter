<script setup lang="ts">
import { computed } from 'vue'
import { useNotesDashboard } from '~/composables/note'

definePageMeta({
  layout: 'app'
})

useHead({
  title: '记忆回溯'
})

const {
  notes,
  restoreNote,
  accelerateForgetting,
  toggleCollapse
} = useNotesDashboard()

const categorizedMemories = computed(() => {
  const fresh = []
  const fading = []
  const archived = []

  for (const note of notes.value) {
    if (note.fadeLevel <= 1) {
      fresh.push(note)
    } else if (note.fadeLevel <= 3) {
      fading.push(note)
    } else {
      archived.push(note)
    }
  }

  return {
    fresh,
    fading,
    archived
  }
})

const sectionDefinitions = [
  {
    key: 'fresh' as const,
    title: '活跃记忆',
    description: '近期创建且仍保持清晰的高价值信息。',
    accent: 'primary'
  },
  {
    key: 'fading' as const,
    title: '正在淡化',
    description: '处于艾宾浩斯遗忘曲线中的内容，可选择恢复或加速遗忘。',
    accent: 'warning'
  },
  {
    key: 'archived' as const,
    title: '归档记忆',
    description: '已经折叠的低价值或噪声片段，随时可以恢复。',
    accent: 'neutral'
  }
]

const sections = computed(() => sectionDefinitions.map(definition => {
  const items = categorizedMemories.value[definition.key]
  return {
    ...definition,
    items,
    count: items.length
  }
}))

const handleRestore = (note: any) => restoreNote(note)
const handleAccelerate = (note: any) => accelerateForgetting(note)
const handleToggleCollapse = (note: any) => toggleCollapse(note)
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-10">
    <section class="space-y-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <UBadge label="记忆回溯" color="primary" variant="soft" icon="i-lucide-history" />
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">遗忘日志与记忆轨迹</h1>
        </div>
        <p class="text-gray-600 dark:text-gray-400 max-w-3xl">
          跟随忆滤的遗忘引擎回顾记忆变化：查看活跃片段、正在淡化的内容以及已归档的噪声，掌控每一次恢复与遗忘决策。
        </p>
      </div>

      <UCard class="border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
        <div class="grid gap-6 sm:grid-cols-3">
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">活跃记忆</span>
            <span class="text-2xl font-semibold text-primary-500">{{ categorizedMemories.fresh.length }}</span>
            <p class="text-sm text-gray-500 dark:text-gray-400">保持清晰的重点内容，可随时继续编辑。</p>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">正在淡化</span>
            <span class="text-2xl font-semibold text-amber-500">{{ categorizedMemories.fading.length }}</span>
            <p class="text-sm text-gray-500 dark:text-gray-400">自动模糊的记忆，决定是挽救还是让其自然遗忘。</p>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">归档片段</span>
            <span class="text-2xl font-semibold text-slate-500">{{ categorizedMemories.archived.length }}</span>
            <p class="text-sm text-gray-500 dark:text-gray-400">噪声或陈旧内容处于折叠状态，随需恢复。</p>
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
                <UIcon :name="section.key === 'fresh' ? 'i-lucide-flame' : section.key === 'fading' ? 'i-lucide-timer' : 'i-lucide-archive'" class="text-lg text-primary" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ section.title }}</h2>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                {{ section.description }}
              </p>
            </div>
            <UBadge :label="`${section.count} 条`" :color="section.accent" variant="subtle" />
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
          :title="section.key === 'fresh' ? '最近记忆充沛' : section.key === 'fading' ? '暂时没有淡化内容' : '归档区空空如也'"
          :description="section.key === 'fresh' ? '保持记录习惯，重要记忆将继续清晰呈现。' : section.key === 'fading' ? '没有需要处理的淡化记忆，稍后再来看看。' : '暂无归档记忆，可以继续整理重要内容。'"
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