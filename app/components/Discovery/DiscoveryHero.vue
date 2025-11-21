<script setup lang="ts">
  import { computed, toRefs } from '#imports'
  import type { DiscoveryFeedItem } from '~/composables/discovery/useDiscoveryFeed'

  const props = defineProps<{
    searchQuery: string
    stats: {
      total: number
      today: number
      thisWeek: number
    }
    lastSyncSummary: string | null
    isSyncing: boolean
    highlight: DiscoveryFeedItem | null
    fetchLimit: number | null
  }>()

  const { stats, searchQuery, highlight, fetchLimit } = toRefs(props)

  const emit = defineEmits<{
    (event: 'update:searchQuery', value: string): void
    (event: 'update:fetchLimit', value: number | null): void
    (event: 'fetch-latest'): void
  }>()

  const syncLabel = computed(() => props.lastSyncSummary ?? '尚未同步资讯')
  const highlightTitle = computed(() => highlight.value?.title ?? '探索值得记录的资讯')
  const highlightSummary = computed(
    () =>
      highlight.value?.summary ?? '同步资讯后，系统会推荐最值得关注的焦点话题，帮助你快速捕捉灵感。'
  )
  const highlightSource = computed(() => highlight.value?.source ?? 'MemFilter 推荐')

  const limitOptions = [
    { label: '自动·默认 20 条', value: null },
    { label: '10 条', value: 10 },
    { label: '20 条', value: 20 },
    { label: '30 条', value: 30 },
    { label: '40 条', value: 40 },
    { label: '50 条', value: 50 },
  ]

  const normalizeLimit = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null
    }

    return Math.floor(numeric)
  }

  const searchModel = computed({
    get: () => searchQuery.value,
    set: (value) => emit('update:searchQuery', value),
  })

  const limitModel = computed({
    get: () => fetchLimit.value ?? null,
    set: (value) => {
      if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
        emit('update:fetchLimit', normalizeLimit((value as Record<string, unknown>).value))
        return
      }

      emit('update:fetchLimit', normalizeLimit(value))
    },
  })

  const handleSubmit = () => {
    emit('fetch-latest')
  }
</script>

<template>
  <section
    class="relative overflow-hidden rounded-3xl border border-gray-200/20 bg-slate-900 text-white shadow-xl"
  >
    <div class="absolute inset-0 opacity-70">
      <div class="absolute -left-32 top-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
      <div class="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-sky-500/30 blur-3xl" />
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,254,0.35),_transparent_55%)]"
      />
    </div>

    <div class="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div class="flex flex-col gap-6">
        <div class="space-y-4">
          <div class="flex items-center gap-3 text-sm text-slate-200">
            <UBadge
              label="Discover"
              color="white"
              variant="outline"
              class="bg-white/10 text-white"
            />
            <span class="hidden sm:block text-slate-300">精选全球科技、效率工具与行业趋势资讯</span>
          </div>
          <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">探索中心</h1>
          <p class="max-w-xl text-sm text-slate-300">
            从海量资讯中筛选真正值得记录的内容。通过主题、时间和关键词筛选，及时将焦点资讯转化为你的结构化记忆。
          </p>

          <div class="flex flex-wrap items-center gap-3 text-xs text-slate-300/90">
            <UIcon name="i-lucide-clock-3" class="text-primary-light" />
            <span>{{ syncLabel }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <label class="text-xs font-medium uppercase tracking-widest text-slate-300/80"
            >搜索资讯或话题</label
          >
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <UInput
              v-model="searchModel"
              placeholder="输入关键词，例如 “AI 知识管理”"
              size="lg"
              icon="i-lucide-search"
              class="flex-1"
              color="white"
              @keyup.enter="handleSubmit"
            />
            <div class="flex items-stretch gap-2">
              <USelect
                v-model="limitModel"
                :items="limitOptions"
                option-attribute="label"
                value-attribute="value"
                placeholder="数量"
                size="lg"
              />
              <UButton
                color="primary"
                size="lg"
                :loading="isSyncing"
                icon="i-lucide-radar"
                class="whitespace-nowrap"
                @click="handleSubmit"
              >
                获取最新资讯
              </UButton>
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="stat-card">
            <span class="stat-label">待筛选资讯</span>
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-hint">同步后实时更新</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">今日新增</span>
            <span class="stat-value">{{ stats.today }}</span>
            <span class="stat-hint">基于发布时间统计</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">近 7 日热点</span>
            <span class="stat-value">{{ stats.thisWeek }}</span>
            <span class="stat-hint">帮助你快速了解趋势</span>
          </div>
        </div>
      </div>

      <div
        class="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl"
      >
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]"
        />
        <div class="relative flex flex-col gap-4">
          <div class="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-200/80">
            <UIcon name="i-lucide-star" class="text-primary-light" />
            <span>今日焦点</span>
          </div>
          <h3 class="text-xl font-semibold leading-snug text-white">
            {{ highlightTitle }}
          </h3>
          <p class="text-sm leading-relaxed text-slate-200/90">
            {{ highlightSummary }}
          </p>
        </div>
        <div class="relative flex items-center justify-between text-xs text-slate-200/70">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-compass" class="text-primary-light" />
            <span>{{ highlightSource }}</span>
          </div>
          <span class="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-widest"
            >自动推荐</span
          >
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    border-radius: 1rem;
    border: 1px solid rgba(148, 163, 254, 0.25);
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.65), rgba(30, 41, 59, 0.35));
    padding: 1rem 1.25rem;
    color: #e2e8f0;
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25);
    backdrop-filter: blur(18px);
  }

  .stat-label {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(226, 232, 240, 0.7);
  }

  .stat-value {
    font-size: 1.9rem;
    font-weight: 600;
    color: white;
  }

  .stat-hint {
    font-size: 0.75rem;
    color: rgba(226, 232, 240, 0.8);
  }

  .text-primary-light {
    color: #93c5fd;
  }
</style>
