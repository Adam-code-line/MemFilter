<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

// 应用内导航菜单
const items = computed<NavigationMenuItem[]>(() => [
  {
    label:'主页',
    to:'/home',
    icon:'i-lucide-home',
    active:route.path === '/home'
  },
  {
    label: '笔记',
    to: '/note',
    icon: 'i-lucide-sticky-note',
    active: route.path === '/note'
  },
  {
    label: '回忆',
    to: '/memory',
    icon: 'i-lucide-brain',
    active: route.path === '/memory'
  },
  {
    label: '设置',
    to: '/settings',
    icon: 'i-lucide-settings',
    active: route.path === '/settings'
  }
])

// 用户信息（模拟数据）
const user = ref({
  name: '用户',
  avatar: null
})
</script>

<template>
  <UHeader class="border-b border-gray-200 dark:border-gray-800">
    <template #title>
      <NuxtLink to="/home" class="flex items-center space-x-2">
        <AppLogo class="h-15 w-auto"  />
      </NuxtLink>
    </template>

    <!-- 主导航 -->
    <UNavigationMenu :items="items" class="hidden lg:flex" />

    <template #right>
      <!-- 搜索按钮 -->
      <UButton
        icon="i-lucide-search"
        color="neutral"
        variant="ghost"
        aria-label="搜索"
        class="hidden md:inline-flex"
      />
      
      <!-- 通知按钮 -->
      <UButton
        icon="i-lucide-bell"
        color="neutral"
        variant="ghost"
        aria-label="通知"
        class="hidden md:inline-flex"
      />
      
      <!-- 深色模式切换 -->
      <UColorModeButton />

      <!-- 用户菜单 -->
      <UDropdown>
        <template #trigger>
          <UButton
            :label="user.name"
            icon="i-lucide-user"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
          />
        </template>

        <template #content>
          <UNavigationMenu
            :items="[
              { label: '个人资料', icon: 'i-lucide-user', to: '/profile' },
              { label: '遗忘日志', icon: 'i-lucide-history', to: '/history' },
              { label: '设置', icon: 'i-lucide-settings', to: '/settings' },
              { label: '退出登录', icon: 'i-lucide-log-out', to: '/logout' }
            ]"
            orientation="vertical"
            class="p-1"
          />
        </template>
      </UDropdown>
    </template>

    <!-- 移动端菜单 -->
    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5 lg:hidden" />
      
      <USeparator class="my-4 lg:hidden" />
      
      <!-- 移动端快捷操作 -->
      <div class="space-y-2 lg:hidden">
        <UButton
          label="搜索"
          icon="i-lucide-search"
          variant="ghost"
          block
        />
        <UButton
          label="通知"
          icon="i-lucide-bell"
          variant="ghost"
          block
        />
      </div>
    </template>
  </UHeader>
</template>