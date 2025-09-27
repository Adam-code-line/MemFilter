<script setup lang="ts">
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

// 模拟数据（实际项目中应该从 API 获取）
const recentMemories = ref([])
const todayStats = ref({
  newNotes: 3,
  processing: 1,
  retained: 15,
  forgotten: 2
})

// 记忆分类统计
const memoryCategories = ref([
  { name: '重要记忆', count: 8, color: 'red', icon: 'i-lucide-star' },
  { name: '工作笔记', count: 12, color: 'blue', icon: 'i-lucide-briefcase' },
  { name: '学习内容', count: 5, color: 'green', icon: 'i-lucide-graduation-cap' },
  { name: '生活记录', count: 3, color: 'purple', icon: 'i-lucide-heart' }
])

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
          v-for="(stat, index) in homeConfig.stats?.items" 
          :key="stat.label"
          class="text-center space-y-2"
        >
          <UIcon 
            v-if="stat.icon" 
            :name="stat.icon" 
            class="text-2xl text-blue-600 dark:text-blue-400 mx-auto" 
          />
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ Object.values(todayStats)[index] || stat.value }}
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
            v-for="category in memoryCategories" 
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
        <!-- 暂时没有数据，显示空状态 -->
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          暂无最近活动
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