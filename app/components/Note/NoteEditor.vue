<template>
  <div class="note-editor-container">
    <UCard class="note-editor-card">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex-1 mr-4">
            <UInput 
              v-model="noteTitle"
              placeholder="笔记标题..."
              variant="none"
              class="text-lg font-semibold w-full h-12"
              :class="{ 'title-fading': fadeLevel > 0 }"
            />
          </div>
          
          <div class="flex items-center space-x-2 flex-shrink-0">
            <!-- AI 重要度评估 -->
            <UBadge 
              :label="`AI 评分: ${aiScore}%`"
              :color="getScoreColor(aiScore)"
              variant="soft"
            />
            
            <!-- 保存状态 -->
            <UBadge 
              :label="saveStatus"
              :color="saveStatus === '已保存' ? 'success' : 'warning'"
              variant="outline"
            />
          </div>
        </div>
      </template>

      <!-- 编辑器工具栏 -->
      <div class="editor-toolbar mb-4 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <UFieldGroup>
            <UButton icon="i-lucide-bold" variant="ghost" size="sm" />
            <UButton icon="i-lucide-italic" variant="ghost" size="sm" />
            <UButton icon="i-lucide-underline" variant="ghost" size="sm" />
            <UButton icon="i-lucide-strikethrough" variant="ghost" size="sm" />
          </UFieldGroup>
          
          <UFieldGroup>
            <UButton icon="i-lucide-list" variant="ghost" size="sm" />
            <UButton icon="i-lucide-list-ordered" variant="ghost" size="sm" />
            <UButton icon="i-lucide-quote" variant="ghost" size="sm" />
          </UFieldGroup>
          
          <UButton icon="i-lucide-image" variant="ghost" size="sm" />
          <UButton icon="i-lucide-link" variant="ghost" size="sm" />
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- 遗忘控制 -->
          <USelectMenu
            v-model="forgettingMode"
            :options="forgettingOptions"
            placeholder="遗忘模式"
            size="sm"
          />
          
          <UButton 
            icon="i-lucide-brain"
            variant="ghost"
            size="sm"
            @click="analyzeImportance"
          >
            AI 分析
          </UButton>
        </div>
      </div>

      <!-- 主编辑区域 -->
      <div class="editor-content">
        <UTextarea 
          v-model="noteContent"
          :placeholder="contentPlaceholder"
          :rows="12"
          resize
          class="note-textarea w-full"
          :class="{ 'content-fading': fadeLevel > 0 }"
          @input="handleContentChange"
        />
      </div>

      <!-- 底部信息栏 -->
      <template #footer>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4 text-sm text-gray-500">
            <span>字数: {{ contentLength }}</span>
            <span>预计阅读: {{ estimatedReadTime }}分钟</span>
            <span v-if="lastModified">修改: {{ lastModified }}</span>
          </div>
          
          <div class="flex items-center space-x-2">
            <UButton 
              variant="ghost" 
              size="sm"
              @click="$emit('cancel')"
            >
              取消
            </UButton>
            
            <UButton 
              color="primary"
              size="sm"
              :loading="isSaving"
              @click="saveNote"
            >
              保存笔记
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
interface Props {
  initialTitle?: string
  initialContent?: string
  fadeLevel?: number
  mode?: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  initialTitle: '',
  initialContent: '',
  fadeLevel: 0,
  mode: 'create'
})

const emit = defineEmits<{
  save: [{ title: string; content: string; importance: string }]
  cancel: []
  'content-change': [string]
}>()

// 响应式数据
const noteTitle = ref(props.initialTitle)
const noteContent = ref(props.initialContent)
const aiScore = ref(65)
const isSaving = ref(false)
const saveStatus = ref('未保存')
const lastModified = ref('')
const forgettingMode = ref('normal')

// 遗忘模式选项
const forgettingOptions = [
  { label: '正常遗忘', value: 'normal' },
  { label: '慢速遗忘', value: 'slow' },
  { label: '加速遗忘', value: 'fast' },
  { label: '永不遗忘', value: 'never' }
]

// 计算属性
const contentLength = computed(() => noteContent.value.length)
const estimatedReadTime = computed(() => Math.ceil(contentLength.value / 200))

const contentPlaceholder = computed(() => {
  if (props.fadeLevel > 2) return '内容正在淡化...'
  if (props.fadeLevel > 0) return '输入笔记内容，此笔记可能会被遗忘...'
  return '在这里记录您的想法和灵感...'
})

// 获取评分颜色
const getScoreColor = (score: number) => {
  if (score >= 80) return 'success'
  if (score >= 60) return 'primary'
  if (score >= 40) return 'warning'
  return 'error'
}

// 处理内容变化
const handleContentChange = () => {
  saveStatus.value = '未保存'
  emit('content-change', noteContent.value)
  
  // 模拟AI实时分析
  if (noteContent.value.length > 50) {
    analyzeImportance()
  }
}

// AI重要度分析
const analyzeImportance = async () => {
  // 模拟AI分析逻辑
  const keywordScore = (noteContent.value.match(/[重要|关键|核心|主要]/g) || []).length * 10
  const lengthScore = Math.min(noteContent.value.length / 10, 30)
  const titleScore = noteTitle.value.length > 0 ? 20 : 0
  
  aiScore.value = Math.min(100, Math.max(10, keywordScore + lengthScore + titleScore))
}

// 保存笔记
const saveNote = async () => {
  if (!noteTitle.value.trim() || !noteContent.value.trim()) {
    return
  }
  
  isSaving.value = true
  
  try {
    // 模拟保存延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    emit('save', {
      title: noteTitle.value,
      content: noteContent.value,
      importance: getImportanceLevel(aiScore.value)
    })
    
    saveStatus.value = '已保存'
    lastModified.value = new Date().toLocaleTimeString()
    
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    isSaving.value = false
  }
}

// 获取重要度级别
const getImportanceLevel = (score: number) => {
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  if (score >= 40) return 'low'
  return 'noise'
}

// 组件初始化
onMounted(() => {
  if (props.mode === 'edit') {
    lastModified.value = new Date().toLocaleTimeString()
    saveStatus.value = '已保存'
  }
  
  if (noteContent.value) {
    analyzeImportance()
  }
})
</script>

<style scoped>
.note-editor-container {
  max-width: 4xl;
  margin: 0 auto;
}

.note-editor-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.editor-toolbar {
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.editor-content {
  position: relative;
  margin: 1rem 0;
}

.note-textarea {
  width: 100%;
  min-height: 300px;
  resize: vertical;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.9);
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

.note-textarea:focus {
  outline: none;
  border-color: rgb(59, 130, 246);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: none;
}

/* 淡化效果 */
.title-fading {
  opacity: 0.7;
  filter: blur(0.5px);
}

.content-fading {
  opacity: 0.8;
  filter: blur(0.5px);
  color: rgba(0, 0, 0, 0.6);
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .note-editor-card {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .note-textarea {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .note-textarea:focus {
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .content-fading {
    color: rgba(255, 255, 255, 0.6);
  }
  
  .editor-toolbar {
    border-color: rgba(255, 255, 255, 0.05);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-toolbar {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .note-textarea {
    font-size: 0.9rem;
    min-height: 250px;
  }
}

/* 动画效果 */
.note-editor-card {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 焦点效果 - 已移除，避免冲突 */

/* 滑动条样式 */
.note-textarea::-webkit-scrollbar {
  width: 6px;
}

.note-textarea::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.note-textarea::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.note-textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>