<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import type { NoteRecord } from '~/composables/note'
import { useNotesStore } from '~~/stores/notes'
import { useMemoryContent } from '~/composables/memory/useMemoryContent'
import MemoryDetailDialog from '~/components/Memory/MemoryDetailDialog.vue'
import CommonConfirmDialog from '~/components/Common/CommonConfirmDialog.vue'
import type { SearchSuggestion } from '~/components/Common/CommonSearchDialog.vue'

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

const selectedMemory = ref<NoteRecord | null>(null)
const isMemoryDetailOpen = ref(false)

const resolveMemoryBucket = (note: NoteRecord | null): 'fresh' | 'fading' | 'archived' | null => {
  if (!note) {
    return null
  }

  const fadeLevel = note.fadeLevel ?? 0

  if (fadeLevel >= 4 || note.isCollapsed) {
    return 'archived'
  }

  if (fadeLevel >= 1) {
    return 'fading'
  }

  if (note.importance !== 'high' && (note.forgettingProgress ?? 0) > 50) {
    return 'fading'
  }

  return 'fresh'
}

const detailStatus = computed(() => {
  const note = selectedMemory.value
  if (!note) {
    return null
  }

  if ((note.fadeLevel ?? 0) >= 4) {
    return {
      label: '已彻底遗忘',
      color: 'error'
    }
  }

  const bucket = resolveMemoryBucket(note)
  if (!bucket) {
    return null
  }

  const defaults = memoryDefaults.sections.find(item => item.key === bucket)
  const config = sectionSource.value.find(item => item.key === bucket)

  return {
    label: config?.title ?? defaults?.title ?? '',
    color: config?.accent ?? defaults?.accent ?? 'primary'
  }
})

const createDetailActions = (note: NoteRecord | null) => {
  if (!note) {
    return []
  }

  const actionsConfig = memoryDetail.value.actions
  const actions: Array<{
    key: string
    label: string
    icon?: string
    color?: string
    variant?: 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'
    tooltip?: string
  }> = []

  if ((note.fadeLevel ?? 0) > 0 || note.isCollapsed) {
    actions.push({
      key: 'restore',
      ...actionsConfig.restore
    })
  }

  if ((note.forgettingProgress ?? 0) < 100 && (note.fadeLevel ?? 0) < 4) {
    actions.push({
      key: 'accelerate',
      ...actionsConfig.accelerate
    })
  }

  if ((note.fadeLevel ?? 0) < 4) {
    actions.push({
      key: 'forget',
      ...actionsConfig.forget
    })
  }

  actions.push({
    key: 'open-note',
    label: '在笔记中编辑',
    icon: 'i-lucide-square-pen',
    color: 'primary',
    variant: 'solid'
  })

  return actions
}

const detailActions = computed(() => createDetailActions(selectedMemory.value))

const forgetConfirm = ref({
  open: false,
  note: null as NoteRecord | null,
  title: '',
  description: '',
  confirmLabel: '确认',
  confirmColor: 'error' as const,
  confirmVariant: 'solid' as const,
  icon: 'i-lucide-alert-triangle'
})

const resetForgetConfirm = () => {
  forgetConfirm.value = {
    open: false,
    note: null,
    title: '',
    description: '',
    confirmLabel: '确认',
    confirmColor: 'error',
    confirmVariant: 'solid',
    icon: 'i-lucide-alert-triangle'
  }
}

const requestForget = (note: NoteRecord) => {
  forgetConfirm.value = {
    open: true,
    note,
    title: note.importance === 'high' ? '确认折叠核心记忆？' : '确认遗忘这条记忆？',
    description: note.importance === 'high'
      ? `《${note.title || '未命名笔记'}》被标记为核心记忆，确认后将进入折叠区，可在遗忘日志中彻底清理。`
      : `遗忘后《${note.title || '未命名笔记'}》将立即归档并从活跃列表移除。`,
    confirmLabel: '确认遗忘',
    confirmColor: 'error',
    confirmVariant: 'solid',
    icon: note.importance === 'high' ? 'i-lucide-shield-alert' : 'i-lucide-alert-triangle'
  }
}

const handleMemoryDetailAction = (key: string) => {
  const note = selectedMemory.value
  if (!note) {
    return
  }

  switch (key) {
    case 'restore':
      notesStore.restoreNote(note)
      break
    case 'accelerate':
      notesStore.accelerateForgetting(note)
      break
    case 'forget':
      requestForget(note)
      break
    case 'open-note':
      router.push({ path: '/note', query: { noteId: String(note.id ?? '') } })
      isMemoryDetailOpen.value = false
      break
    default:
      break
  }
}

const confirmForget = () => {
  const note = forgetConfirm.value.note
  if (!note) {
    resetForgetConfirm()
    return
  }

  notesStore.directForget(note)
  resetForgetConfirm()
}

const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
  if (suggestion.type === 'memory' && suggestion.noteId !== undefined) {
    const target = notes.value.find(note => String(note.id) === String(suggestion.noteId))
    if (target) {
      selectedMemory.value = target
      isMemoryDetailOpen.value = true
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

watch(notes, newNotes => {
  if (selectedMemory.value) {
    const refreshed = newNotes.find(item => item.id === selectedMemory.value?.id)
    if (refreshed) {
      selectedMemory.value = refreshed
    }
  }
})

watch(() => forgetConfirm.value.open, value => {
  if (!value) {
    forgetConfirm.value.note = null
  }
})
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
    @action="handleMemoryDetailAction"
  />

  <CommonConfirmDialog
    v-model="forgetConfirm.open"
    :title="forgetConfirm.title"
    :description="forgetConfirm.description"
    :icon="forgetConfirm.icon"
    :confirm-label="forgetConfirm.confirmLabel"
    :confirm-color="forgetConfirm.confirmColor"
    :confirm-variant="forgetConfirm.confirmVariant"
    @confirm="confirmForget"
    @cancel="resetForgetConfirm"
  />
</template>