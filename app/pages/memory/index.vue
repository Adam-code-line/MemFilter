<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '~~/stores/notes'
  import { getAIImportanceScore } from '~/composables/note/useAIImportanceScore'
  import type { NoteRecord } from '~~/composables/note/types'

  definePageMeta({
    layout: 'app',
  })

  const notesStore = useNotesStore()
  await notesStore.ensureInitialized()

  const router = useRouter()

  const { notes } = storeToRefs(notesStore)

  const isClientReady = ref(false)

  if (import.meta.client) {
    onMounted(() => {
      isClientReady.value = true
    })
  }

  const importancePriority = {
    high: 0,
    medium: 1,
    low: 2,
    noise: 3,
  } as const

  const sortByImportance = (collection: NoteRecord[]) =>
    [...collection].sort((a, b) => {
      const importanceDelta =
        (importancePriority[a.importance as keyof typeof importancePriority] ?? 99) -
        (importancePriority[b.importance as keyof typeof importancePriority] ?? 99)
      if (importanceDelta !== 0) {
        return importanceDelta
      }
      const scoreDelta = (getAIImportanceScore(b) ?? -1) - (getAIImportanceScore(a) ?? -1)
      if (scoreDelta !== 0) {
        return scoreDelta
      }
      return (a.fadeLevel ?? 0) - (b.fadeLevel ?? 0)
    })

  const resolveMemoryBucket = (note: NoteRecord): 'fresh' | 'fading' | 'archived' => {
    const fadeLevel = note.fadeLevel ?? 0

    if (fadeLevel >= 4 || note.isCollapsed) {
      return 'archived'
    }

    if (fadeLevel >= 1) {
      return 'fading'
    }

    if (note.importance !== 'high' && (note.forgettingProgress ?? 0) > 50) {
      return 'fading'
    }

    return 'fresh'
  }

  const categorizedMemories = computed(() => {
    const fresh: NoteRecord[] = []
    const fading: NoteRecord[] = []
    const archived: NoteRecord[] = []

    for (const note of notes.value) {
      const bucket = resolveMemoryBucket(note)

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
      archived: sortByImportance(archived),
    }
  })

  const {
    badge,
    pageTitle,
    pageSubtitle,
    introDescription,
    statsSource,
    sectionSource,
    detail,
    defaults: memoryDefaults,
  } = await useMemoryContent()

  const { headerTitle, headerSubtitle, headerBadge } = usePageMeta(
    {
      title: pageTitle,
      subtitle: pageSubtitle,
      badge,
    },
    {
      title: '记忆回溯',
      subtitle: '遗忘日志与记忆轨迹',
      badge: null,
    }
  )

  useHead(() => ({
    title: headerTitle.value,
  }))

  const {
    state: forgetConfirm,
    dialogBindings: forgetDialogBindings,
    openForNote: openForgetDialog,
    confirm: confirmForget,
  } = useForgetConfirm({
    onExecuteForget: async (note) => {
      try {
        await notesStore.directForget(note)
      } catch (error) {
        console.error('[memory] 直接遗忘失败', error)
      }
    },
  })

  const statColorMap: Record<string, string> = {
    primary: 'text-primary-500',
    warning: 'text-amber-500',
    neutral: 'text-slate-500',
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    secondary: 'text-slate-500',
  }

  const stats = computed(() =>
    statsSource.value.map((stat) => {
      const defaults = memoryDefaults.stats.find((item) => item.key === stat.key)
      const key = stat.key as keyof typeof categorizedMemories.value
      const value = categorizedMemories.value[key]?.length ?? 0
      return {
        ...(defaults ?? {}),
        ...stat,
        value,
        colorClass: stat.color
          ? (statColorMap[stat.color] ?? 'text-primary-500')
          : 'text-primary-500',
      }
    })
  )

  const sections = computed(() =>
    sectionSource.value.map((section) => {
      const defaults = memoryDefaults.sections.find((item) => item.key === section.key)
      const items = categorizedMemories.value[section.key] ?? []
      const emptyDefaults = defaults?.empty ?? {}
      return {
        ...(defaults ?? {}),
        ...section,
        items,
        count: items.length,
        accent: section.accent ?? defaults?.accent ?? 'neutral',
        empty: {
          title:
            section.empty?.title ?? emptyDefaults.title ?? detail.value.emptyFallback.title ?? '',
          description:
            section.empty?.description ??
            emptyDefaults.description ??
            detail.value.emptyFallback.description ??
            '',
        },
      }
    })
  )

  const handleRestore = async (note: NoteRecord) => {
    try {
      await notesStore.restoreNote(note)
    } catch (error) {
      console.error('[memory] 恢复记忆失败', error)
    }
  }

  const handleAccelerate = async (note: NoteRecord) => {
    try {
      await notesStore.accelerateForgetting(note)
    } catch (error) {
      console.error('[memory] 加速遗忘失败', error)
    }
  }
  const requestForget = (note: NoteRecord) => {
    openForgetDialog(note)
  }

  const openDetailPage = (note: NoteRecord) => {
    router.push({ path: `/memory/${note.id}` })
  }
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-10">
    <section class="space-y-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <UBadge
            v-if="headerBadge"
            :label="headerBadge.label"
            :color="headerBadge.color ?? 'primary'"
            variant="soft"
            :icon="headerBadge.icon"
          />
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ headerTitle }}
          </h1>
        </div>
        <p v-if="headerSubtitle" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
          {{ headerSubtitle }}
        </p>
        <p v-if="introDescription" class="text-gray-600 dark:text-gray-400 max-w-3xl">
          {{ introDescription }}
        </p>
      </div>

      <UCard
        class="border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur"
      >
        <div v-if="isClientReady" class="grid gap-6 sm:grid-cols-3">
          <div v-for="stat in stats" :key="stat.key" class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <UIcon v-if="stat.icon" :name="stat.icon" class="text-base text-primary" />
              <span>{{ stat.label }}</span>
            </div>
            <span :class="['text-2xl font-semibold', stat.colorClass]">{{ stat.value }}</span>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ stat.description }}
            </p>
          </div>
        </div>
        <div v-else class="grid gap-6 sm:grid-cols-3">
          <div v-for="n in 3" :key="`stat-skeleton-${n}`" class="flex flex-col gap-2">
            <USkeleton class="h-4 w-24 rounded-full" />
            <USkeleton class="h-8 w-14 rounded-lg" />
            <USkeleton class="h-4 w-32 rounded-full" />
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
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ section.title }}
                </h2>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                {{ section.description }}
              </p>
            </div>
            <UBadge
              :label="isClientReady ? `${section.count} 条` : '加载中'"
              :color="section.accent ?? 'neutral'"
              variant="subtle"
            />
          </div>
        </template>

        <div v-if="isClientReady">
          <div
            v-if="section.items.length"
            class="memory-grid grid gap-6 md:grid-cols-2 xl:grid-cols-3"
          >
            <MemoryCard
              v-for="note in section.items"
              :key="note.id"
              :title="note.title"
              :date="note.date"
              :description="note.description || ''"
              :icon="note.icon"
              :importance="note.importance"
              :importance-score="getAIImportanceScore(note)"
              :fade-level="note.fadeLevel"
              :forgetting-progress="note.forgettingProgress"
              :days-until-forgotten="note.daysUntilForgotten"
              :last-accessed="note.lastAccessed"
              :is-collapsed="note.isCollapsed"
              class="memory-card-item"
              @open="openDetailPage(note)"
              @restore="handleRestore(note)"
              @accelerate-forgetting="handleAccelerate(note)"
              @forget="requestForget(note)"
            />
          </div>

          <UAlert
            v-else
            icon="i-lucide-check-circle-2"
            :title="section.empty.title || detail.emptyFallback.title || '暂无内容'"
            :description="
              section.empty.description || detail.emptyFallback.description || '稍后再来看看。'
            "
            color="neutral"
            variant="soft"
            class="border border-dashed border-gray-300/60 dark:border-white/20"
          />
        </div>
        <div v-else class="memory-grid grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <USkeleton
            v-for="n in 3"
            :key="`section-skeleton-${section.key}-${n}`"
            class="h-48 rounded-2xl"
          />
        </div>
      </UCard>
    </section>
    <CommonConfirmDialog
      v-model="forgetConfirm.open"
      v-bind="forgetDialogBindings"
      @confirm="confirmForget"
      @cancel="forgetConfirm.open = false"
    />
  </div>
</template>

<style scoped>
  .memory-card-item {
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;
  }

  .memory-card-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
  }

  .memory-grid {
    grid-auto-rows: 1fr;
  }
</style>
