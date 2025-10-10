<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { ImportanceLevel } from '~/composables/note'
import { useNotesStore } from '~~/stores/notes'

// 使用 app 布局

definePageMeta({
  layout: 'app'
})

// SEO 设置
useHead({ 
  title: '主页'
})

// 获取页面配置
const { data: homeConfig } = await useAsyncData('home', () => queryCollection('home').first())

// 路由导航
const router = useRouter()

// 全局笔记数据
const notesStore = useNotesStore()
notesStore.ensureInitialized()

const { notes, noteStats, importanceCounts } = storeToRefs(notesStore)

const { resolveImportanceBadge } = useImportanceBadges()

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)

const RECENT_LIMIT = 6

const createSnippet = (content: string) => {
  const normalized = (content ?? '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return '暂无内容'
  }
  return normalized.length > 90 ? `${normalized.slice(0, 90)}…` : normalized
}

const derivedStats = computed(() => {
  const stats = noteStats.value ?? { total: 0, core: 0, fading: 0, forgotten: 0 }
  const today = formatDateLabel(new Date())
  const newNotes = notes.value.filter(note => note.date === today).length
  const processing = stats.fading ?? 0
  const forgotten = stats.forgotten ?? 0
  const retained = Math.max((stats.total ?? 0) - processing - forgotten, 0)

  return {
    newNotes,
    processing,
    retained,
    forgotten
  }
})

const statItems = computed(() => {
  const items = homeConfig.value?.stats?.items ?? []
  const stats = derivedStats.value

  return items.map(item => {
    const key = item.key as keyof typeof stats | undefined
    const fallback = Number.parseInt(item.value ?? '0', 10) || 0
    const value = key && stats[key] !== undefined ? stats[key] : fallback

    return {
      ...item,
      resolvedValue: value
    }
  })
})

const memoryCategoryItems = computed(() => {
  const categories = homeConfig.value?.memoryOverview?.categories ?? []

  return categories.map(category => {
    let count = category.count ?? 0
    const key = category.key ?? ''

    if (key.startsWith('importance.')) {
      const importance = key.split('.')[1] as ImportanceLevel | undefined
      if (importance && importanceCounts.value[importance] !== undefined) {
        count = importanceCounts.value[importance]
      }
    }

    return {
      ...category,
      count
    }
  })
})

const recentMemories = computed(() =>
  notesStore.getRecentNotes(RECENT_LIMIT).map(note => ({
    id: note.id,
    title: note.title,
    snippet: createSnippet(note.content),
    importance: note.importance,
    badge: resolveImportanceBadge(note.importance),
    lastAccessed: note.lastAccessed,
    date: note.date
  }))
)

// 快速导航
const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div v-if="homeConfig" class="max-w-7xl mx-auto space-y-8">
    <!-- 欢迎区域 -->
    <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8">
      <div class="text-center space-y-4">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ homeConfig.welcome?.title }}
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-300">
          {{ homeConfig.welcome?.subtitle }}
        </p>
      </div>
    </div>

    <!-- 快速操作 -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ homeConfig.quickActions?.title }}
        </h2>
      </template>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          v-for="action in homeConfig.quickActions?.items" 
          :key="action.label"
          class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          @click="navigateTo(action.to)"
        >
          <div class="flex items-start space-x-4">
            <UButton
              :icon="action.icon"
              :color="(action.color as any)"
              variant="soft"
              size="lg"
              square
            />
            <div class="flex-1 space-y-1">
              <h3 class="font-medium text-gray-900 dark:text-white">
                {{ action.label }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ action.description }}
              </p>
            </div>
            <UIcon name="i-lucide-arrow-right" class="text-gray-400" />
          </div>
        </div>
      </div>
    </UCard>

    <!-- 今日统计 -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ homeConfig.stats?.title }}
        </h2>
      </template>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div 
          v-for="stat in statItems" 
          :key="stat.label"
          class="text-center space-y-2"
        >
          <UIcon 
            v-if="stat.icon" 
            :name="stat.icon" 
            class="text-2xl text-blue-600 dark:text-blue-400 mx-auto" 
          />
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ stat.resolvedValue ?? stat.value }}
          </div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ stat.label }}
          </div>
        </div>
      </div>
    </UCard>

    <!-- 记忆概览和AI状态 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- 记忆概览 -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ homeConfig.memoryOverview?.title }}
            </h2>
            <UButton
              :label="homeConfig.memoryOverview?.viewDetails"
              variant="ghost"
              icon="i-lucide-arrow-right"
              trailing
              @click="navigateTo('/memory')"
            />
          </div>
        </template>
        
        <div class="space-y-4">
          <div 
            v-for="category in memoryCategoryItems" 
            :key="category.name"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <UIcon :name="category.icon" :class="`text-${category.color}-500`" />
              <span class="font-medium text-gray-900 dark:text-white">
                {{ category.name }}
              </span>
            </div>
            <UBadge 
              :label="category.count.toString()"
              :color="(category.color as any)"
              variant="soft"
            />
          </div>
        </div>
      </UCard>

      <!-- AI 引擎状态 -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ homeConfig.aiStatus?.title }}
          </h2>
        </template>
        
        <div class="space-y-4">
          <div class="flex items-center space-x-3">
            <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span class="font-medium text-green-600 dark:text-green-400">
              {{ homeConfig.aiStatus?.status }}
            </span>
          </div>
          
          <p class="text-gray-600 dark:text-gray-300">
            {{ homeConfig.aiStatus?.description }}
          </p>
          
          <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-500 dark:text-gray-400">
                最后更新:
              </span>
              <span class="text-gray-700 dark:text-gray-300">
                {{ homeConfig.aiStatus?.lastUpdate }}
              </span>
            </div>
          </div>
          
          <!-- AI 引擎操作 -->
          <div class="space-y-2">
            <UButton
              label="查看分析报告"
              icon="i-lucide-bar-chart"
              variant="outline"
              block
              @click="navigateTo('/analysis')"
            />
            <UButton
              label="调整遗忘策略"
              icon="i-lucide-settings"
              variant="ghost"
              block
              @click="navigateTo('/settings')"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- 最近活动 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ homeConfig.recentActivity?.title }}
          </h2>
          <UButton
            :label="homeConfig.recentActivity?.viewAll"
            variant="ghost"
            icon="i-lucide-arrow-right"
            trailing
            @click="navigateTo('/memory')"
          />
        </div>
      </template>
      
      <!-- 空状态 -->
      <div v-if="recentMemories.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-brain" class="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {{ homeConfig.recentActivity?.empty?.title }}
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6">
          {{ homeConfig.recentActivity?.empty?.subtitle }}
        </p>
        <UButton 
          :label="homeConfig.recentActivity?.empty?.action"
          icon="i-lucide-plus"
          @click="navigateTo('/note')"
        />
      </div>
      
      <!-- 记忆列表 -->
      <div v-else class="space-y-4">
        <div
          v-for="item in recentMemories"
          :key="item.id"
          class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/80"
        >
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-gray-900 dark:text-white">
                <UIcon name="i-lucide-sticky-note" class="text-gray-400" />
                <span class="font-medium">{{ item.title }}</span>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {{ item.snippet }}
              </p>
            </div>
            <div class="flex flex-col items-start md:items-end gap-2">
              <UBadge
                :label="item.badge.label"
                :color="(item.badge.color as any)"
                variant="soft"
              />
              <div class="text-xs text-gray-500 dark:text-gray-400">
                最近访问: {{ item.lastAccessed }} · 创建于 {{ item.date }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
/* 卡片悬停效果 */
.hover\:shadow-md:hover {
  transform: translateY(-1px);
  transition: all 0.3s ease;
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>