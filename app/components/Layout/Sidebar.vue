<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

// 主要功能导航
const mainItems = computed<NavigationMenuItem[]>(() => [
  {
    label: '笔记管理',
    to: '/note',
    icon: 'i-lucide-sticky-note',
    active: route.path === '/note'
  },
  {
    label: '记忆回溯',
    to: '/memory',
    icon: 'i-lucide-brain',
    active: route.path === '/memory'
  },
  {
    label: '遗忘日志',
    to: '/history',
    icon: 'i-lucide-history',
    active: route.path === '/history'
  }
])

// 智能功能
const aiItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'AI 分析',
    to: '/analysis',
    icon: 'i-lucide-brain-circuit',
    active: route.path === '/analysis'
  },
  {
    label: '重要度评估',
    to: '/importance',
    icon: 'i-lucide-star',
    active: route.path === '/importance'
  },
  {
    label: '遗忘策略',
    to: '/strategy',
    icon: 'i-lucide-settings-2',
    active: route.path === '/strategy'
  }
])

// 设置和帮助
const settingsItems = computed<NavigationMenuItem[]>(() => [
  {
    label: '个人设置',
    to: '/settings',
    icon: 'i-lucide-settings',
    active: route.path === '/settings'
  },
  {
    label: '帮助中心',
    to: '/help',
    icon: 'i-lucide-help-circle',
    active: route.path === '/help'
  }
])

// 侧边栏收起状态
const isCollapsed = ref(false)

// 响应式侧边栏
const isMobile = ref(false)

onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 1024
    if (isMobile.value) {
      isCollapsed.value = true
    }
  }
  
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
  })
})
</script>

<template>
  <aside 
    :class="[
      'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 relative',
      isCollapsed ? 'w-16' : 'w-64',
      'hidden lg:block'
    ]"
  >
    <!-- 侧边栏头部 -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between">
        <div v-if="!isCollapsed" class="flex items-center space-x-2">
          <span class="text-xl">🧠</span>
          <span class="font-semibold text-gray-900 dark:text-white">智能导航</span>
        </div>
        <UButton
          :icon="isCollapsed ? 'i-lucide-menu' : 'i-lucide-x'"
          variant="ghost"
          size="sm"
          @click="isCollapsed = !isCollapsed"
        />
      </div>
    </div>

    <!-- 侧边栏内容 -->
    <div class="py-4">
      <!-- 主要功能 -->
      <div class="mb-6">
        <div v-if="!isCollapsed" class="px-4 mb-2">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            主要功能
          </p>
        </div>
        <UNavigationMenu 
          :items="mainItems" 
          orientation="vertical" 
          :class="isCollapsed ? 'px-2' : 'px-3'"
        />
      </div>

      <!-- AI 智能功能 -->
      <div class="mb-6">
        <div v-if="!isCollapsed" class="px-4 mb-2">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            AI 功能
          </p>
        </div>
        <UNavigationMenu 
          :items="aiItems" 
          orientation="vertical" 
          :class="isCollapsed ? 'px-2' : 'px-3'"
        />
      </div>

      <!-- 设置和帮助 -->
      <div>
        <div v-if="!isCollapsed" class="px-4 mb-2">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            设置
          </p>
        </div>
        <UNavigationMenu 
          :items="settingsItems" 
          orientation="vertical" 
          :class="isCollapsed ? 'px-2' : 'px-3'"
        />
      </div>
    </div>

    <!-- 底部状态 -->
    <div class="absolute bottom-4 left-0 right-0 px-4">
      <div v-if="!isCollapsed" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <div class="flex items-center space-x-2 mb-2">
          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
          <span class="text-sm font-medium text-gray-900 dark:text-white">AI 引擎运行中</span>
        </div>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          今日已处理 42 条笔记
        </p>
      </div>
      <div v-else class="flex justify-center">
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
      </div>
    </div>
  </aside>
</template>