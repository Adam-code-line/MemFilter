<template>
  <div 
    class="memory-card-wrapper" 
    :class="[
      `importance-${importance}`,
      `fade-level-${fadeLevel}`,
      { 'is-collapsed': isCollapsed, 'is-forgetting': isForgetting }
    ]"
    :style="cardStyle"
  >
    <UCard 
      class="memory-card transition-all duration-700 ease-out"
      :class="{
        'card-fading': fadeLevel > 0,
        'card-blurred': fadeLevel > 2,
        'card-collapsed': isCollapsed
      }"
    >
      <!-- 遗忘进度条 -->
      <div v-if="forgettingProgress > 0" class="forgetting-progress">
        <div 
          class="forgetting-bar" 
          :style="{ width: `${forgettingProgress}%` }"
        ></div>
      </div>

      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div 
              class="memory-icon transition-all duration-500"
              :class="{ 'icon-fading': fadeLevel > 1 }"
            >
              {{ displayIcon }}
            </div>
            <div class="memory-meta">
              <div 
                class="memory-title font-semibold transition-all duration-500"
                :class="{ 'text-fading': fadeLevel > 0 }"
              >
                {{ displayTitle }}
              </div>
              <div class="text-xs text-gray-500 flex items-center space-x-2">
                <span>{{ displayDate }}</span>
                <span v-if="lastAccessed" class="text-xs">最后访问: {{ lastAccessed }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <!-- 重要度标签 -->
            <UBadge 
              :label="importanceLabel" 
              :color="importanceColor" 
              :variant="fadeLevel > 1 ? 'soft' : 'solid'"
              class="transition-all duration-500"
            />
            
            <!-- 遗忘状态指示器 -->
            <div v-if="fadeLevel > 0" class="forgetting-indicator">
              <UTooltip :text="forgettingTooltip">
                <UIcon 
                  :name="forgettingIcon" 
                  class="text-amber-500 animate-pulse" 
                  size="sm"
                />
              </UTooltip>
            </div>
          </div>
        </div>
      </template>

      <!-- 笔记内容 -->
      <div 
        class="memory-content py-3 text-sm transition-all duration-700"
        :class="{
          'content-fading': fadeLevel > 0,
          'content-blurred': fadeLevel > 2,
          'content-hidden': isCollapsed
        }"
      >
        <div v-if="!isCollapsed">
          {{ displaySnippet }}
        </div>
        <div v-else class="collapsed-hint text-xs text-gray-400 italic">
          内容已折叠...
        </div>
        
        <!-- 遗忘提示 -->
        <div v-if="isForgetting && !isCollapsed" class="forgetting-hint mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300">
          此笔记正在遗忘中，{{ daysUntilForgotten }}天后将被淡化
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between items-center">
          <div class="flex space-x-2">
            <UButton 
              size="sm" 
              variant="ghost" 
              icon="i-lucide-eye"
              @click="handleOpen"
            >
              查看详情
            </UButton>
            
            <UButton 
              v-if="fadeLevel > 0" 
              size="sm" 
              variant="ghost" 
              icon="i-lucide-refresh-cw"
              color="success"
              @click="handleRestore"
            >
              恢复记忆
            </UButton>
            
            <UButton 
              v-if="!isForgetting" 
              size="sm" 
              variant="ghost" 
              icon="i-lucide-brain"
              color="warning"
              @click="handleAccelerate"
            >
              加速遗忘
            </UButton>

            <UButton
              v-if="fadeLevel < 4"
              size="sm"
              variant="ghost"
              icon="i-lucide-zap-off"
              color="error"
              @click="handleForget"
            >
              直接遗忘
            </UButton>
          </div>
          
          <!-- 重要度评分 -->
          <div class="importance-score text-xs text-gray-500">
            重要度: {{ importanceScore }}%
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import { toRefs } from 'vue'
import { useMemoryMeta } from '~/composables/memory/useMemoryMeta'
import { useMemoryCardVisuals } from '~/composables/memory/useMemoryVisuals'
import type { MemoryFadeLevel, MemoryImportance } from '~/composables/memory/types'

interface Props {
  title: string
  date: string
  snippet: string
  icon?: string
  importance?: MemoryImportance
  fadeLevel?: MemoryFadeLevel
  importanceScore?: number
  forgettingProgress?: number
  daysUntilForgotten?: number
  lastAccessed?: string
  isCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📝',
  importance: 'medium',
  fadeLevel: 0,
  importanceScore: 50,
  forgettingProgress: 0,
  daysUntilForgotten: 0,
  isCollapsed: false
})

const emit = defineEmits<{
  open: []
  restore: []
  'accelerate-forgetting': []
  forget: []
}>()

const note = toRefs(props)

const {
  importanceLabel,
  importanceColor,
  isForgetting,
  forgettingTooltip,
  forgettingIcon,
  displayTitle,
  displaySnippet,
  displayIcon,
  displayDate
} = useMemoryMeta({
  title: note.title,
  snippet: note.snippet,
  date: note.date,
  icon: note.icon,
  importance: note.importance,
  fadeLevel: note.fadeLevel,
  forgettingProgress: note.forgettingProgress
}, {
  blurredDateMessage: '时间模糊...'
})

const { cardStyle } = useMemoryCardVisuals(note.fadeLevel, note.forgettingProgress)

const handleOpen = () => emit('open')
const handleRestore = () => emit('restore')
const handleAccelerate = () => emit('accelerate-forgetting')
const handleForget = () => emit('forget')
</script>

<style scoped>
.memory-card-wrapper {
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  position: relative;
}

/* 重要度样式 */
.importance-high {
  --glow-color: rgb(239, 68, 68);
}

.importance-medium {
  --glow-color: rgb(59, 130, 246);
}

.importance-low {
  --glow-color: rgb(156, 163, 175);
}

.importance-noise {
  --glow-color: rgb(107, 114, 128);
  opacity: 0.7;
}

/* 遗忘渐变效果 */
.fade-level-0 {
  opacity: 1;
  filter: blur(0px);
  transform: scale(1);
}

.fade-level-1 {
  opacity: var(--fade-opacity, 0.85);
  filter: blur(0.5px);
  transform: scale(var(--scale-amount, 0.98));
}

.fade-level-2 {
  opacity: var(--fade-opacity, 0.7);
  filter: blur(var(--blur-amount, 1px));
  transform: scale(var(--scale-amount, 0.96));
}

.fade-level-3 {
  opacity: var(--fade-opacity, 0.5);
  filter: blur(var(--blur-amount, 2px));
  transform: scale(var(--scale-amount, 0.94));
}

.fade-level-4 {
  opacity: var(--fade-opacity, 0.3);
  filter: blur(var(--blur-amount, 3px));
  transform: scale(var(--scale-amount, 0.92));
}

/* 折叠状态 */
.is-collapsed .memory-card {
  max-height: 120px;
  overflow: hidden;
}

/* 遗忘进度条 */
.forgetting-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px 4px 0 0;
  overflow: hidden;
  z-index: 10;
}

.forgetting-bar {
  height: 100%;
  background: linear-gradient(90deg, 
    rgb(34, 197, 94) 0%,
    rgb(251, 191, 36) 50%,
    rgb(239, 68, 68) 100%
  );
  transition: width 0.5s ease;
  border-radius: inherit;
}

/* 图标效果 */
.memory-icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-fading {
  filter: grayscale(50%) brightness(0.8);
}

/* 文字渐变效果 */
.text-fading {
  color: rgba(156, 163, 175, 0.8);
}

/* 内容区域效果 */
.memory-content {
  position: relative;
}

.content-fading {
  color: rgba(156, 163, 175, 0.9);
}

.content-blurred {
  filter: blur(1px);
  color: rgba(156, 163, 175, 0.7);
}

.content-hidden {
  max-height: 0;
  padding: 0;
  overflow: hidden;
}

/* 遗忘指示器 */
.forgetting-indicator {
  animation: pulse 2s infinite;
}

/* 重要度评分 */
.importance-score {
  font-family: 'Monaco', 'Consolas', monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

/* 遗忘提示 */
.forgetting-hint {
  border-left: 3px solid rgb(251, 191, 36);
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px rgba(251, 191, 36, 0.2); }
  50% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.4); }
}

/* 折叠提示 */
.collapsed-hint {
  text-align: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

/* 悬停效果 */
.memory-card-wrapper:hover {
  transform: translateY(-4px) scale(1.02);
  z-index: 10;
}

.memory-card-wrapper:hover .memory-card {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .memory-card-wrapper {
    margin-bottom: 1rem;
  }
  
  .memory-meta {
    min-width: 0;
    flex: 1;
  }
  
  .memory-title {
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 暗色主题优化 */
@media (prefers-color-scheme: dark) {
  .forgetting-hint {
    background: rgba(251, 191, 36, 0.1);
    color: rgb(252, 211, 77);
  }
  
  .collapsed-hint {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

/* 减少动画（用户偏好） */
@media (prefers-reduced-motion: reduce) {
  .memory-card-wrapper,
  .forgetting-bar,
  .memory-content {
    transition: none;
  }
  
  .forgetting-indicator {
    animation: none;
  }
}
</style>