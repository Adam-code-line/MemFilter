<script lang="ts" setup>
// 定义重要性级别类型
type ImportanceLevel = 'high' | 'medium' | 'low' | 'noise'

// 使用应用内布局
definePageMeta({
  layout: 'app'
})

// 设置页面标题
useHead({
  title: '笔记管理 - 忆滤'
})

// 模拟数据
const notes = ref([
  {
    id: 1,
    title: '深度学习原理笔记',
    content: '深度学习是机器学习的一个分支，通过构建具有多层次的人工神经网络来学习数据的高层次特征表示...',
    date: '2小时前',
    lastAccessed: '30分钟前',
    icon: '🧠',
    importance: 'high' as ImportanceLevel,
    importanceScore: 92,
    fadeLevel: 0,
    forgettingProgress: 0,
    isCollapsed: false
  },
  {
    id: 2,
    title: 'Vue 3 组合式API学习',
    content: 'Vue 3引入了组合式API，这是一套基于函数的API，可以更灵活地组织组件逻辑...',
    date: '5小时前',
    lastAccessed: '2小时前',
    icon: '⚡',
    importance: 'medium' as ImportanceLevel,
    importanceScore: 78,
    fadeLevel: 1,
    forgettingProgress: 25,
    daysUntilForgotten: 6,
    isCollapsed: false
  },
  {
    id: 3,
    title: '数据结构-树的遍历',
    content: '树的遍历是数据结构中的重要概念，包括前序遍历、中序遍历、后序遍历等...',
    date: '1天前',
    lastAccessed: '8小时前',
    icon: '🌳',
    importance: 'medium' as ImportanceLevel,
    importanceScore: 65,
    fadeLevel: 2,
    forgettingProgress: 45,
    daysUntilForgotten: 3,
    isCollapsed: false
  },
  {
    id: 4,
    title: '会议记录-产品需求讨论',
    content: '今天讨论了新功能的需求，包括用户界面设计、后端API设计等方面...',
    date: '3天前',
    lastAccessed: '2天前',
    icon: '📝',
    importance: 'low' as ImportanceLevel,
    importanceScore: 42,
    fadeLevel: 3,
    forgettingProgress: 70,
    daysUntilForgotten: 1,
    isCollapsed: false
  },
  {
    id: 5,
    title: '随手记录的想法',
    content: '今天路上想到的一些零散想法，可能没什么用处...',
    date: '1周前',
    lastAccessed: '5天前',
    icon: '💭',
    importance: 'noise' as ImportanceLevel,
    importanceScore: 18,
    fadeLevel: 4,
    forgettingProgress: 90,
    daysUntilForgotten: 0,
    isCollapsed: true
  },
  {
    id: 6,
    title: 'TypeScript 高级特性',
    content: 'TypeScript提供了许多高级特性，如泛型、装饰器、类型守卫等，这些特性可以帮助我们写出更安全的代码...',
    date: '2天前',
    lastAccessed: '1天前',
    icon: '🔷',
    importance: 'high' as ImportanceLevel,
    importanceScore: 88,
    fadeLevel: 0,
    forgettingProgress: 0,
    isCollapsed: false
  }
])

// 状态管理
const viewMode = ref<'card' | 'list'>('card')
const filterImportance = ref('all')
const searchQuery = ref('')
const selectedNotes = ref<number[]>([])
const isEditorOpen = ref(false)
const currentEditNote = ref<any>(null)

// 筛选选项
const importanceOptions = [
  { label: '全部', value: 'all' },
  { label: '核心笔记', value: 'high' },
  { label: '重要笔记', value: 'medium' },
  { label: '次要笔记', value: 'low' },
  { label: '噪声信息', value: 'noise' }
]

// 计算属性
const filteredNotes = computed(() => {
  let filtered = notes.value
  
  // 重要性筛选
  if (filterImportance.value !== 'all') {
    filtered = filtered.filter(note => note.importance === filterImportance.value)
  }
  
  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

const noteStats = computed(() => ({
  total: notes.value.length,
  core: notes.value.filter(n => n.importance === 'high').length,
  forgotten: notes.value.filter(n => n.fadeLevel >= 3).length,
  thisMonth: Math.floor(notes.value.length * 0.7) // 模拟本月新增
}))

// 方法
const handleNoteOpen = (note: any) => {
  currentEditNote.value = { ...note }
  isEditorOpen.value = true
}

const handleNoteRestore = (note: any) => {
  const index = notes.value.findIndex(n => n.id === note.id)
  if (index !== -1 && notes.value[index]) {
    notes.value[index].fadeLevel = 0
    notes.value[index].forgettingProgress = 0
  }
}

const handleAccelerateForget = (note: any) => {
  const index = notes.value.findIndex(n => n.id === note.id)
  if (index !== -1 && notes.value[index]) {
    notes.value[index].fadeLevel = Math.min(4, notes.value[index].fadeLevel + 1)
    notes.value[index].forgettingProgress = Math.min(100, notes.value[index].forgettingProgress + 30)
  }
}

const handleToggleCollapse = (note: any) => {
  const index = notes.value.findIndex(n => n.id === note.id)
  if (index !== -1 && notes.value[index]) {
    notes.value[index].isCollapsed = !notes.value[index].isCollapsed
  }
}

const handleCreateNote = () => {
  currentEditNote.value = null
  isEditorOpen.value = true
}

const handleSaveNote = (noteData: any) => {
  if (currentEditNote.value) {
    // 编辑现有笔记
    const index = notes.value.findIndex(n => n.id === currentEditNote.value.id)
    if (index !== -1) {
      notes.value[index] = {
        ...notes.value[index],
        ...noteData,
        date: '刚刚'
      }
    }
  } else {
    // 创建新笔记
    const newNote = {
      id: Date.now(),
      title: noteData.title,
      content: noteData.content,
      date: '刚刚',
      lastAccessed: '刚刚',
      icon: '📝',
      importance: noteData.importance as ImportanceLevel,
      importanceScore: Math.floor(Math.random() * 50) + 50,
      fadeLevel: 0,
      forgettingProgress: 0,
      daysUntilForgotten: 0,
      isCollapsed: false
    }
    notes.value.unshift(newNote)
  }
  
  isEditorOpen.value = false
  currentEditNote.value = null
}

const handleCancelEdit = () => {
  isEditorOpen.value = false
  currentEditNote.value = null
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- 笔记编辑器模态框 -->
    <UModal v-model="isEditorOpen" class="max-w-4xl">
      <NoteEditor
        :initial-title="currentEditNote?.title"
        :initial-content="currentEditNote?.content"
        :mode="currentEditNote ? 'edit' : 'create'"
        @save="handleSaveNote"
        @cancel="handleCancelEdit"
      />
    </UModal>

    <!-- 页面头部 -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
             忆滤笔记管理
            <UBadge label="AI 遗忘引擎" variant="soft" color="primary" />
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            智能管理您的笔记，让重要信息自然浮现，无用信息逐渐淡化
          </p>
        </div>
        
        <!-- 视图切换 -->
        <div class="flex items-center space-x-2">
          <UButtonGroup>
            <UButton 
              :variant="viewMode === 'card' ? 'solid' : 'ghost'"
              icon="i-lucide-grid-3x3"
              @click="viewMode = 'card'"
            >
              卡片视图
            </UButton>
            <UButton 
              :variant="viewMode === 'list' ? 'solid' : 'ghost'"
              icon="i-lucide-list"
              @click="viewMode = 'list'"
            >
              列表视图
            </UButton>
          </UButtonGroup>
        </div>
      </div>
    </div>

    <!-- 快速操作栏 -->
    <div class="flex flex-wrap gap-4 mb-8">
      <UButton
        label="新建笔记"
        icon="i-lucide-plus"
        size="lg"
        @click="handleCreateNote"
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
        color="primary"
      />
      <UButton
        label="遗忘日志"
        icon="i-lucide-history"
        variant="outline"
        size="lg"
        color="warning"
      />
    </div>

    <!-- 笔记统计仪表板 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <CommonFloatingCard
        title="总笔记数"
        :description="`本月新增 ${noteStats.thisMonth} 条`"
        icon="📚"
        size="sm"
        variant="gradient"
        animation-type="float"
        :animation-delay="0"
        class="stats-card"
      >
        <template #default>
          <div class="text-3xl font-bold text-blue-600 dark:text-blue-400 text-center">
            {{ noteStats.total }}
          </div>
        </template>
      </CommonFloatingCard>

      <CommonFloatingCard
        title="核心笔记"
        description="AI 评级为重要"
        icon="⭐"
        size="sm"
        variant="glass"
        animation-type="pulse"
        :animation-delay="0.2"
        class="stats-card"
      >
        <template #default>
          <div class="text-3xl font-bold text-green-600 dark:text-green-400 text-center">
            {{ noteStats.core }}
          </div>
        </template>
      </CommonFloatingCard>

      <CommonFloatingCard
        title="已遗忘"
        description="自动清理无用信息"
        icon="🌫️"
        size="sm"
        variant="minimal"
        animation-type="swing"
        :animation-delay="0.4"
        class="stats-card"
      >
        <template #default>
          <div class="text-3xl font-bold text-gray-600 dark:text-gray-400 text-center">
            {{ noteStats.forgotten }}
          </div>
        </template>
      </CommonFloatingCard>

      <CommonFloatingCard
        title="AI 状态"
        description="智能分析运行中"
        icon="🤖"
        size="sm"
        variant="elevated"
        animation-type="rotate"
        :animation-delay="0.6"
        class="stats-card"
      >
        <template #default>
          <div class="text-lg font-bold text-purple-600 dark:text-purple-400 text-center">
            活跃中
          </div>
        </template>
      </CommonFloatingCard>
    </div>

    <!-- 筛选和搜索栏 -->
    <UCard class="mb-6">
      <div class="flex flex-wrap gap-4 items-center justify-between">
        <div class="flex items-center space-x-4">
          <UInput
            v-model="searchQuery"
            placeholder="搜索笔记内容..."
            icon="i-lucide-search"
            class="w-64"
          />
          
          <USelectMenu
            v-model="filterImportance"
            :options="importanceOptions"
            placeholder="筛选重要性"
          />
        </div>
        
        <div class="flex items-center space-x-2 text-sm text-gray-500">
          <span>找到 {{ filteredNotes.length }} 条笔记</span>
          <UBadge 
            v-if="searchQuery || filterImportance !== 'all'"
            label="已筛选"
            color="primary"
            variant="soft"
          />
        </div>
      </div>
    </UCard>

    <!-- 笔记列表区域 -->
    <div v-if="filteredNotes.length > 0">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MemoryCard
          v-for="note in filteredNotes"
          :key="note.id"
          :title="note.title"
          :date="note.date"
          :snippet="note.content"
          :icon="note.icon"
          :importance="note.importance"
          :importance-score="note.importanceScore"
          :fade-level="note.fadeLevel as 0 | 1 | 2 | 3 | 4"
          :forgetting-progress="note.forgettingProgress"
          :days-until-forgotten="note.daysUntilForgotten"
          :last-accessed="note.lastAccessed"
          :is-collapsed="note.isCollapsed"
          class="memory-card-item"
          @open="handleNoteOpen(note)"
          @restore="handleNoteRestore(note)"
          @accelerate-forgetting="handleAccelerateForget(note)"
          @toggle-collapse="handleToggleCollapse(note)"
        />
      </div>
      
      <!-- 列表视图 -->
      <UCard v-else>
        <template #header>
          <h2 class="text-xl font-semibold flex items-center gap-2">
            📋 笔记列表
            <UBadge :label="`${filteredNotes.length} 条`" variant="soft" />
          </h2>
        </template>
        
        <div class="space-y-2">
          <MemoryItem
            v-for="note in filteredNotes"
            :key="note.id"
            :title="note.title"
            :date="note.date"
            :snippet="note.content"
            :icon="note.icon"
            :importance="note.importance"
            :importance-score="note.importanceScore"
            :fade-level="note.fadeLevel as 0 | 1 | 2 | 3 | 4"
            :forgetting-progress="note.forgettingProgress"
            :days-until-forgotten="note.daysUntilForgotten"
            :is-collapsed="note.isCollapsed"
            :is-selected="selectedNotes.includes(note.id)"
            @view="handleNoteOpen(note)"
            @edit="handleNoteOpen(note)"
            @restore="handleNoteRestore(note)"
            @accelerate-forgetting="handleAccelerateForget(note)"
            @expand="handleToggleCollapse(note)"
            @select="selectedNotes.includes(note.id) ? selectedNotes.splice(selectedNotes.indexOf(note.id), 1) : selectedNotes.push(note.id)"
          />
        </div>
      </UCard>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="text-center py-20">
      <div class="text-6xl mb-4">🌫️</div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        没有找到匹配的笔记
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {{ searchQuery ? '尝试调整搜索关键词' : '开始创建您的第一条笔记' }}
      </p>
      <UButton
        label="新建笔记"
        icon="i-lucide-plus"
        @click="handleCreateNote"
      />
    </div>
  </div>
</template>

<style scoped>
/* 统计卡片动画 */
.stats-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stats-card:hover {
  transform: translateY(-4px) scale(1.02);
}

/* 记忆卡片列表布局 */
.memory-card-item {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.memory-card-item:hover {
  transform: translateY(-8px);
  z-index: 10;
}

/* 页面进入动画 */
.page-enter-active {
  animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式优化 */
@media (max-width: 768px) {
  .memory-card-item {
    margin-bottom: 1rem;
  }
  
  .stats-card {
    min-width: auto;
  }
}

/* 滚动条样式 */
:deep(.overflow-y-auto)::-webkit-scrollbar {
  width: 6px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 暗色主题优化 */
@media (prefers-color-scheme: dark) {
  :deep(.overflow-y-auto)::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  
  :deep(.overflow-y-auto)::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }
  
  :deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

/* 加载状态 */
.loading-shimmer {
  background: linear-gradient(90deg, 
    rgba(255, 255, 255, 0) 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* 搜索高亮 */
.search-highlight {
  background: rgba(59, 130, 246, 0.2);
  border-radius: 2px;
  padding: 1px 2px;
}
</style>
