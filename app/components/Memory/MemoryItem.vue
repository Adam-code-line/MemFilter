<template>
  <div 
    class="memory-item" 
    :class="[
      `importance-${importance}`,
      `fade-level-${fadeLevel}`,
      { 
        'is-collapsed': isCollapsed,
        'is-forgetting': isForgetting,
        'is-selected': isSelected
      }
    ]"
    :style="itemStyle"
    @click="$emit('select')"
  >
    <!-- 遗忘进度条 -->
    <div v-if="forgettingProgress > 0" class="forgetting-progress-thin">
      <div 
        class="forgetting-bar-thin" 
        :style="{ width: `${forgettingProgress}%` }"
      ></div>
    </div>

    <div class="memory-item-content">
      <!-- 左侧图标区域 -->
      <div class="memory-icon-container">
        <div 
          class="memory-icon-small"
          :class="{ 'icon-fading': fadeLevel > 1 }"
        >
          {{ displayIcon }}
        </div>
        
        <!-- 重要度指示器 -->
        <div class="importance-indicator" :class="`indicator-${importance}`"></div>
      </div>

      <!-- 中间内容区域 -->
      <div class="memory-main-content">
        <div class="memory-header">
          <h4 
            class="memory-title-small"
            :class="{ 'text-fading': fadeLevel > 0 }"
          >
            {{ displayTitle }}
          </h4>
          
          <div class="memory-meta-info">
            <span class="memory-date">{{ displayDate }}</span>
            <UBadge 
              :label="importanceLabel" 
              :color="importanceColor" 
              size="xs"
              :variant="fadeLevel > 1 ? 'soft' : 'solid'"
            />
          </div>
        </div>
        
        <p 
          v-if="!isCollapsed"
          class="memory-snippet-small"
          :class="{
            'content-fading': fadeLevel > 0,
            'content-blurred': fadeLevel > 2
          }"
        >
          {{ displaySnippet }}
        </p>
        
        <div v-else class="collapsed-hint-small">
          内容已折叠...
        </div>
      </div>

      <!-- 右侧操作区域 -->
      <div class="memory-actions-small">
        <!-- 遗忘状态指示 -->
        <div v-if="fadeLevel > 0" class="forgetting-status">
          <UIcon 
            :name="forgettingIcon" 
            class="status-icon" 
            size="sm"
          />
          <span class="status-text">{{ forgettingStatus }}</span>
        </div>
        
        <!-- 重要度评分 -->
        <div class="importance-score-small">
          {{ importanceScore }}%
        </div>
        
        <!-- 快速操作按钮 -->
        <div class="quick-actions">
          <UButton 
            v-if="fadeLevel > 0"
            icon="i-lucide-refresh-cw"
            variant="ghost"
            size="xs"
            @click.stop="handleRestore"
          />
          
          <UButton 
            icon="i-lucide-eye"
            variant="ghost"
            size="xs"
            @click.stop="handleView"
          />
          
          <UDropdownMenu :items="contextMenuItems">
            <UButton 
              icon="i-lucide-more-horizontal"
              variant="ghost"
              size="xs"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { toRefs } from 'vue'
import { useMemoryMeta } from '~/composables/memory/useMemoryMeta'
import { useMemoryItemVisuals } from '~/composables/memory/useMemoryVisuals'
import { useMemoryActions } from '~/composables/memory/useMemoryActions'
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
  isCollapsed?: boolean
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📝',
  importance: 'medium',
  fadeLevel: 0,
  importanceScore: 50,
  forgettingProgress: 0,
  isCollapsed: false,
  isSelected: false
})

const emit = defineEmits<{
  select: []
  view: []
  edit: []
  delete: []
  restore: []
  'accelerate-forgetting': []
  forget: []
}>()

const note = toRefs(props)

const {
  importanceLabel,
  importanceColor,
  isForgetting,
  forgettingIcon,
  forgettingStatus,
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
  snippetLimit: 100,
  blurredDateMessage: '模糊...'
})

const { itemStyle } = useMemoryItemVisuals(note.fadeLevel, note.forgettingProgress)

const { contextMenuItems } = useMemoryActions(note.fadeLevel, {
  onEdit: () => emit('edit'),
  onRestore: () => emit('restore'),
  onAccelerate: () => emit('accelerate-forgetting'),
  onForget: () => emit('forget'),
  onDelete: () => emit('delete')
})

const handleRestore = () => emit('restore')
const handleView = () => emit('view')
</script>

<style scoped>
.memory-item {
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.memory-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.is-selected {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgb(59, 130, 246);
}

/* 遗忘进度条 */
.forgetting-progress-thin {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}

.forgetting-bar-thin {
  height: 100%;
  background: linear-gradient(90deg, 
    rgb(34, 197, 94) 0%,
    rgb(251, 191, 36) 50%,
    rgb(239, 68, 68) 100%
  );
  transition: width 0.5s ease;
}

/* 内容布局 */
.memory-item-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
}

/* 图标区域 */
.memory-icon-container {
  position: relative;
  flex-shrink: 0;
}

.memory-icon-small {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  transition: all 0.3s ease;
}

.icon-fading {
  filter: grayscale(50%) brightness(0.8);
}

/* 重要度指示器 */
.importance-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid white;
}

.indicator-high {
  background: rgb(239, 68, 68);
}

.indicator-medium {
  background: rgb(59, 130, 246);
}

.indicator-low {
  background: rgb(156, 163, 175);
}

.indicator-noise {
  background: rgb(107, 114, 128);
  opacity: 0.6;
}

/* 主内容区域 */
.memory-main-content {
  flex: 1;
  min-width: 0;
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.25rem;
  gap: 0.5rem;
}

.memory-title-small {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin: 0;
  line-height: 1.3;
  transition: all 0.3s ease;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memory-meta-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.memory-date {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.memory-snippet-small {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 折叠提示 */
.collapsed-hint-small {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
  font-style: italic;
}

/* 右侧操作区域 */
.memory-actions-small {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}

.forgetting-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: rgb(251, 191, 36);
}

.status-icon {
  animation: pulse 2s infinite;
}

.status-text {
  font-weight: 500;
}

.importance-score-small {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.5);
  font-family: 'Monaco', 'Consolas', monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 3px;
}

.quick-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.memory-item:hover .quick-actions {
  opacity: 1;
}

/* 遗忘效果 */
.fade-level-1 {
  opacity: var(--fade-opacity, 0.88);
}

.fade-level-2 {
  opacity: var(--fade-opacity, 0.76);
  filter: blur(var(--blur-amount, 0.8px));
}

.fade-level-3 {
  opacity: var(--fade-opacity, 0.64);
  filter: blur(var(--blur-amount, 1.6px));
}

.fade-level-4 {
  opacity: var(--fade-opacity, 0.52); 
  filter: blur(var(--blur-amount, 2.4px));
}

.text-fading {
  color: rgba(0, 0, 0, 0.6);
}

.content-fading {
  color: rgba(0, 0, 0, 0.5);
}

.content-blurred {
  filter: blur(1px);
  color: rgba(0, 0, 0, 0.4);
}

/* 重要度样式 */
.importance-high {
  border-left: 3px solid rgb(239, 68, 68);
}

.importance-medium {
  border-left: 3px solid rgb(59, 130, 246);
}

.importance-low {
  border-left: 3px solid rgb(156, 163, 175);
}

.importance-noise {
  border-left: 3px solid rgb(107, 114, 128);
  opacity: 0.8;
}

/* 暗色主题 */
@media (prefers-color-scheme: dark) {
  .memory-item {
    background: rgba(0, 0, 0, 0.6);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .memory-item:hover {
    background: rgba(0, 0, 0, 0.8);
  }
  
  .memory-title-small {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .memory-snippet-small {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .memory-date {
    color: rgba(255, 255, 255, 0.5);
  }
  
  .text-fading {
    color: rgba(255, 255, 255, 0.6);
  }
  
  .content-fading {
    color: rgba(255, 255, 255, 0.5);
  }
  
  .collapsed-hint-small {
    color: rgba(255, 255, 255, 0.4);
  }
  
  .importance-score-small {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .memory-item {
    padding: 0.5rem;
  }
  
  .memory-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .memory-meta-info {
    width: 100%;
    justify-content: space-between;
  }
  
  .memory-actions-small {
    flex-direction: row;
    align-items: center;
  }
  
  .quick-actions {
    opacity: 1;
  }
}
</style>