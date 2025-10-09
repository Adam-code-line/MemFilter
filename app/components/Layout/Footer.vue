<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// 底部导航链接
const footerLinks: NavigationMenuItem[] = [
  {
    label: '关于忆滤',
    to: '/about'
  },
  {
    label: '隐私政策',
    to: '/'
  },
  {
    label: '使用条款',
    to: '/'
  },
  {
    label: '联系我们',
    to: '/'
  }
]

// 获取当前年份
const currentYear = new Date().getFullYear()
</script>

<template>
  <UFooter class="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
    <template #left>
      <div class="flex items-center space-x-2">
        <div>
          <p class="font-semibold text-gray-900 dark:text-white">忆滤 MemFilter</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">AI 遗忘引擎，智能信息管理</p>
        </div>
      </div>
    </template>

    <!-- 底部导航 -->
    <UNavigationMenu :items="footerLinks" variant="link" />

    <template #right>
      <div class="flex items-center space-x-4">
        <!-- 社交媒体链接 -->
        <UButton
          icon="i-simple-icons-github"
          color="neutral"
          variant="ghost"
          to="https://github.com/yourusername/memfilter"
          target="_blank"
          aria-label="GitHub"
        />
        
        <!-- 版权信息 -->
        <p class="text-sm text-gray-600 dark:text-gray-400">
          © {{ currentYear }} 忆滤. 保留所有权利.
        </p>
      </div>
    </template>
  </UFooter>
</template>