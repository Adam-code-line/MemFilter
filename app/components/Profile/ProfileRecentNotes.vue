<script setup lang="ts">
  interface ProfileRecentNotesProps {
    title?: string
    emptyLabel?: string
    notes?: NoteRecord[] | null
  }

  const props = withDefaults(defineProps<ProfileRecentNotesProps>(), {
    title: '最近访问的记忆',
    emptyLabel: '暂无最近访问记录',
    notes: () => [],
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
        <UButton
          v-if="notes?.length"
          variant="ghost"
          size="xs"
          color="neutral"
          to="/note"
          trailing-icon="i-lucide-arrow-up-right"
        >
          前往笔记
        </UButton>
      </div>

      <div v-if="notes?.length" class="space-y-3">
        <UCard
          v-for="note in notes"
          :key="note.id"
          :ui="{ body: { padding: 'p-4' } }"
          class="border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/70"
        >
          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ note.title || '未命名笔记' }}
              </h4>
              <UBadge
                :label="
                  note.importance === 'high'
                    ? '核心'
                    : note.importance === 'medium'
                      ? '重点'
                      : note.importance === 'low'
                        ? '轻度'
                        : '噪声'
                "
                :color="
                  note.importance === 'high'
                    ? 'error'
                    : note.importance === 'medium'
                      ? 'primary'
                      : note.importance === 'low'
                        ? 'secondary'
                        : 'neutral'
                "
                variant="soft"
                size="xs"
              />
            </div>
            <p
              v-if="note.description"
              class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
            >
              {{ note.description }}
            </p>
            <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span v-if="note.lastAccessed">最近访问：{{ note.lastAccessed }}</span>
              <span>淡化进度：{{ note.forgettingProgress ?? 0 }}%</span>
            </div>
          </div>
        </UCard>
      </div>

      <div
        v-else
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
      >
        <UIcon name="i-lucide-notebook" class="text-xl text-primary-500" />
        <span>{{ emptyLabel }}</span>
      </div>
    </div>
  </UCard>
</template>
