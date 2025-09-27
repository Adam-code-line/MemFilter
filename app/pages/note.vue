<script lang="ts" setup>
// 使用应用内布局
definePageMeta({
  layout: 'app'
})

// 设置页面标题
useHead({
  title: '笔记管理'
})
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- 页面头部 -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        📝 笔记管理
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        智能管理您的笔记，让重要信息自然浮现
      </p>
    </div>

    <!-- 快速操作栏 -->
    <div class="flex flex-wrap gap-4 mb-8">
      <UButton
        label="新建笔记"
        icon="i-lucide-plus"
        size="lg"
      />
      <UButton
        label="导入笔记"
        icon="i-lucide-upload"
        variant="outline"
        size="lg"
      />
      <UButton
        label="AI 整理"
        icon="i-lucide-brain"
        variant="outline"
        size="lg"
      />
    </div>

    <!-- 笔记统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <UCard>
        <template #header>
          <div class="flex items-center space-x-2">
            <span class="text-2xl">📚</span>
            <h3 class="font-semibold">总笔记数</h3>
          </div>
        </template>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">...</p>
        <p class="text-sm text-gray-500">本月新增...条</p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center space-x-2">
            <span class="text-2xl">⭐</span>
            <h3 class="font-semibold">核心笔记</h3>
          </div>
        </template>
        <p class="text-2xl font-bold text-green-600 dark:text-green-400">...</p>
        <p class="text-sm text-gray-500">AI 评级为重要</p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🗑️</span>
            <h3 class="font-semibold">已遗忘</h3>
          </div>
        </template>
        <p class="text-2xl font-bold text-gray-600 dark:text-gray-400">89</p>
        <p class="text-sm text-gray-500">自动清理无用信息</p>
      </UCard>
    </div>

    <!-- 笔记列表区域 -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">最近笔记</h2>
          <div class="flex space-x-2">
            <UInput
              placeholder="搜索笔记..."
              icon="i-lucide-search"
              class="w-64"
            />
            <USelectMenu
              :options="[
                { label: '全部', value: 'all' },
                { label: '核心', value: 'core' },
                { label: '次要', value: 'secondary' },
                { label: '噪声', value: 'noise' }
              ]"
              placeholder="筛选"
            />
          </div>
        </div>
      </template>
      
      <div class="space-y-4">
        <!-- 示例笔记项 -->
        <div v-for="i in 5" :key="i" class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">
              学习笔记 {{ i }}
            </h3>
            <div class="flex items-center space-x-2">
              <UBadge 
                :label="i % 3 === 0 ? '核心' : i % 2 === 0 ? '次要' : '一般'"
                :color="i % 3 === 0 ? 'success' : i % 2 === 0 ? 'info' : 'neutral'"
                size="xs"
              />
              <span class="text-xs text-gray-500">2小时前</span>
            </div>
          </div>
          <p class="text-gray-600 dark:text-gray-400 text-sm mb-3">
            这是一段示例笔记内容，展示了 AI 如何评估和管理信息的重要程度...
          </p>
          <div class="flex justify-between items-center">
            <div class="flex space-x-2">
              <UButton size="xs" variant="ghost" icon="i-lucide-edit" />
              <UButton size="xs" variant="ghost" icon="i-lucide-star" />
              <UButton size="xs" variant="ghost" icon="i-lucide-trash" />
            </div>
            <div class="text-xs text-gray-500">
              重要度: {{ Math.floor(Math.random() * 100) }}%
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>