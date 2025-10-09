<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { useNotesStore } from '~~/stores/notes'
import { useMemoryContent } from '~/composables/memory/useMemoryContent'
import { useMemoryDetailController } from '~/composables/memory/useMemoryDetailController'
import { useForgetConfirm } from '~/composables/memory/useForgetConfirm'

const route = useRoute()
const router = useRouter()

const notesStore = useNotesStore()
notesStore.ensureInitialized()
const { notes } = storeToRefs(notesStore)

const {
  detail: memoryDetail,
  sectionSource,
  defaults: memoryDefaults
} = await useMemoryContent()

// 应用内导航菜单
const items = computed<NavigationMenuItem[]>(() => [
  {
    label: '主页',
    to: '/home',
    icon: 'i-lucide-home',
    active: route.path === '/home'
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

const navigationSuggestions = computed<SearchSuggestion[]>(() =>
  items.value.map(item => ({
    label: item.label,
    description: typeof item.to === 'string' ? `前往 ${item.label}` : undefined,
    icon: item.icon,
    to: typeof item.to === 'string' ? item.to : undefined,
    type: 'navigation'
  }))
)

const normalizedQuery = computed(() => globalSearchQuery.value.trim().toLowerCase())

const memorySuggestions = computed<SearchSuggestion[]>(() => {
  const query = normalizedQuery.value
  if (!query) {
    return []
  }

  return notes.value
    .filter(note => {
      const title = note.title?.toLowerCase() ?? ''
      const description = note.description?.toLowerCase() ?? ''
      const content = note.content?.toLowerCase() ?? ''
      return (
        title.includes(query) ||
        description.includes(query) ||
        content.includes(query)
      )
    })
    .slice(0, 6)
    .map(note => ({
      label: note.title || '未命名记忆',
      description: note.lastAccessed ? `最后访问 ${note.lastAccessed}` : note.date ? `创建于 ${note.date}` : '查看记忆详情',
      icon: 'i-lucide-brain',
      type: 'memory',
      noteId: note.id
    }))
})

const searchSuggestions = computed<SearchSuggestion[]>(() => {
  const query = normalizedQuery.value
  if (!query) {
    return navigationSuggestions.value
  }

  const navMatches = navigationSuggestions.value.filter(entry => entry.label.toLowerCase().includes(query))
  const fallbackNav = navMatches.length ? navMatches : navigationSuggestions.value.slice(0, 3)

  return [
    ...memorySuggestions.value,
    ...fallbackNav
  ]
})

const { state: forgetConfirm, dialogBindings: forgetDialogBindings, openForNote: openForgetDialog, confirm: confirmForget, reset: resetForgetConfirm } = useForgetConfirm({
  onExecuteForget: (note) => {
    notesStore.directForget(note)
  }
})

const {
  selectedNote: selectedMemory,
  detailDialogOpen: isMemoryDetailOpen,
  detailStatus,
  detailActions,
  openDetail,
  closeDetail,
  handleDetailAction
} = useMemoryDetailController({
  notes,
  sectionSource,
  sectionDefaults: memoryDefaults.sections,
  detailPanel: memoryDetail,
  onRestore: note => notesStore.restoreNote(note),
  onAccelerate: note => notesStore.accelerateForgetting(note),
  onForget: note => openForgetDialog(note),
  onOpenNote: note => {
    router.push({ path: '/note', query: { noteId: String(note.id ?? '') } })
    closeDetail()
  }
})

const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
  if (suggestion.type === 'memory' && suggestion.noteId !== undefined) {
    const target = notes.value.find(note => String(note.id) === String(suggestion.noteId))
    if (target) {
      openDetail(target)
    }
    globalSearchQuery.value = ''
    isSearchDialogOpen.value = false
    return
  }

  if (suggestion.to) {
    navigateTo(suggestion.to)
  }

  globalSearchQuery.value = ''
  isSearchDialogOpen.value = false
}

const openSearchDialog = () => {
  globalSearchQuery.value = ''
  isSearchDialogOpen.value = true
}

const handleGlobalSearch = (value: string) => {
  const query = value.trim()
  if (!query) {
    isSearchDialogOpen.value = false
    return
  }

  if (memorySuggestions.value.length) {
    handleSuggestionSelect(memorySuggestions.value[0])
    return
  }

  const match = navigationSuggestions.value.find(entry => entry.label.includes(query))

  if (match?.to) {
    navigateTo(match.to)
  } else {
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
    @select="handleSuggestionSelect"
  />

  <MemoryDetailDialog
    v-model="isMemoryDetailOpen"
    :title="memoryDetail.title"
    :eyebrow="memoryDetail.eyebrow"
    :clear-label="memoryDetail.clearLabel"
    :note="selectedMemory"
    :actions="detailActions"
    :status-label="detailStatus?.label"
    :status-color="detailStatus?.color"
    width="sm:max-w-4xl"
    @action="handleDetailAction"
    @close="closeDetail"
  />

  <CommonConfirmDialog
    v-model="forgetConfirm.open"
    v-bind="forgetDialogBindings"
    @confirm="confirmForget"
    @cancel="resetForgetConfirm"
  />
</template>