<script setup lang="ts">
import { toRefs } from '#imports'

const props = defineProps<{
  searchQuery: string
  stats: {
    total: number
    today: number
    thisWeek: number
  }
  lastSyncSummary: string | null
  isSyncing: boolean
}>()

const { stats, searchQuery } = toRefs(props)

const emit = defineEmits<{
  (event: 'update:searchQuery', value: string): void
  (event: 'fetch-latest'): void
  (event: 'open-history'): void
}>()

const handleSubmit = () => {
  emit('fetch-latest')
}
</script>

<template>
  <section class="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-white/90 to-white/95 p-6 shadow-lg dark:from-slate-800/60 dark:via-slate-900/75 dark:to-slate-900/60">
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -right-20 top-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div class="absolute -bottom-6 left-12 h-44 w-44 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
    </div>
    <div class="relative flex flex-col gap-6">
      <header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <UBadge color="primary" variant="soft" label="发现" />
            <p class="text-sm text-gray-500 dark:text-gray-400">探索原始资讯，挑选值得保留的记忆。</p>
          </div>
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
            灵感探索中心
          </h2>
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <UIcon name="i-lucide-clock-3" class="text-primary" />
          <span v-if="lastSyncSummary">{{ lastSyncSummary }}</span>
          <span v-else>尚未同步资讯</span>
        </div>
      </header>

      <UFormField
        label="搜索资讯或话题"
        class="space-y-3"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <UInput
            :model-value="searchQuery"
            placeholder="输入关键词，例如 “AI 知识管理”"
            size="lg"
            icon="i-lucide-search"
            class="flex-1"
            @update:model-value="value => emit('update:searchQuery', value)"
            @keyup.enter="handleSubmit"
          />
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              color="primary"
              size="lg"
              :loading="isSyncing"
              icon="i-lucide-radar"
              @click="handleSubmit"
            >
              获取最新资讯
            </UButton>
            <UButton
              variant="soft"
              size="lg"
              icon="i-lucide-inbox"
              @click="emit('open-history')"
            >
              查看已生成记忆
            </UButton>
          </div>
        </div>
      </UFormField>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="stat-card">
          <span class="stat-label">待筛选资讯</span>
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-hint">同步后自动更新</span>
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
  </section>
</template>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background-color: rgba(255, 255, 255, 0.7);
  padding: 1rem;
  color: #334155;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

:global(.dark) .stat-card {
  border-color: rgba(51, 65, 85, 0.5);
  background-color: rgba(15, 23, 42, 0.7);
  color: #cbd5f5;
}

.stat-label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

:global(.dark) .stat-label {
  color: #94a3b8;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #0f172a;
}

:global(.dark) .stat-value {
  color: #f8fafc;
}

.stat-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

:global(.dark) .stat-hint {
  color: #64748b;
}
</style>
