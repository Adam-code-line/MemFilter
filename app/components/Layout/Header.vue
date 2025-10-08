<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

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
    label: '历史',
    to: '/history',
    icon: 'i-lucide-history',
    active: route.path === '/history'
  }
])

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    { label: '个人资料', icon: 'i-lucide-user', to: '/profile' },
    { label: '遗忘日志', icon: 'i-lucide-history', to: '/history' },
    { label: '设置', icon: 'i-lucide-settings', to: '/settings' }
  ],
  [
    { label: '退出登录', icon: 'i-lucide-log-out', to: '/logout', color: 'red' }
  ]
])

// 用户信息（模拟数据）
const user = ref({
  name: '用户',
  avatar: null
})

const isSearchDialogOpen = ref(false)
const globalSearchQuery = ref('')

const searchSuggestions = computed(() =>
  items.value.map(item => ({
    label: item.label,
    description: typeof item.to === 'string' ? `前往 ${item.label}` : undefined,
    icon: item.icon,
    to: typeof item.to === 'string' ? item.to : undefined
  }))
)

const openSearchDialog = () => {
  globalSearchQuery.value = ''
  isSearchDialogOpen.value = true
}

const handleGlobalSearch = (value: string) => {
  const query = value.trim()
  const match = searchSuggestions.value.find(entry => entry.label.includes(query))

  if (match?.to) {
    navigateTo(match.to)
  } else if (query) {
    navigateTo({ path: '/note', query: { search: query } })
  }

  isSearchDialogOpen.value = false
}
</script>

<template>
  <UHeader
    class="border-b border-gray-200 dark:border-gray-800"
    to="/home"
    title="MemFilter"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <AppLogo class="h-15 w-auto" />
        <span class="sr-only">MemFilter</span>
      </div>
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
        @click="openSearchDialog"
      />
      
      <!-- 通知按钮 -->
      <UButton
        icon="i-lucide-bell"
        color="neutral"
        variant="ghost"
        aria-label="通知"
        class="hidden md:inline-flex"
      />

      <UButton
        to="/settings"
        icon="i-lucide-settings"
        color="neutral"
        variant="ghost"
        class="hidden md:inline-flex"
      />
      
      <!-- 深色模式切换 -->
      <UColorModeButton />

      <!-- 用户菜单 -->
      <UDropdownMenu :items="userMenuItems" :popper="{ placement: 'bottom-end' }">
        <UButton
          :label="user.name"
          icon="i-lucide-user"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-chevron-down"
        />
      </UDropdownMenu>
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
          @click="openSearchDialog"
        />
        <UButton
          label="通知"
          icon="i-lucide-bell"
          variant="ghost"
          block
        />
        <UButton
          label="设置"
          icon="i-lucide-settings"
          variant="ghost"
          block
          to="/settings"
        />
      </div>
    </template>
  </UHeader>

  <CommonSearchDialog
    v-model:open="isSearchDialogOpen"
    v-model:query="globalSearchQuery"
    :suggestions="searchSuggestions"
    placeholder="快速搜索页面或笔记..."
    @search="handleGlobalSearch"
  />
</template>