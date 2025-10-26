<script setup lang="ts">
import { computed } from 'vue'
import type { ChatSessionSummary } from '~/composables/chat/useAIChatSessions'
import { useChatSessionMenu } from '~/composables/chat/useChatSessionMenu'

const props = defineProps<{
  sessions: ChatSessionSummary[]
  activeId: string | null
  pending?: boolean
  mode?: 'desktop' | 'mobile'
}>()

const emit = defineEmits<{
  (event: 'select', id: string): void
  (event: 'create'): void
  (event: 'delete', id: string): void
  (event: 'rename', payload: { id: string; title: string }): void
}>()

const formatTimestamp = (value: string) => {
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) {
    return '刚刚'
  }

  const diff = Date.now() - target.getTime()

  if (diff < 60_000) {
    return '刚刚'
  }

  if (diff < 3_600_000) {
    const minutes = Math.round(diff / 60_000)
    return `${minutes} 分钟前`
  }

  if (diff < 86_400_000) {
    const hours = Math.round(diff / 3_600_000)
    return `${hours} 小时前`
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(target)
}

const handleRename = (session: ChatSessionSummary) => {
  const nextTitle = window.prompt('重命名对话', session.title)?.trim()
  if (!nextTitle || nextTitle === session.title) {
    return
  }
  emit('rename', { id: session.id, title: nextTitle })
}

const { buildMenuItems } = useChatSessionMenu({
  onRename: handleRename,
  onDelete: (id) => emit('delete', id)
})

const rootClasses = computed(() => {
  const base = 'chat-session-sidebar h-full w-full max-w-xs flex-col gap-3'
  if (props.mode === 'mobile') {
    return `${base} flex`
  }
  return `${base} hidden lg:flex`
})
</script>

<template>
  <aside :class="rootClasses">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          历史会话
        </p>
        <p class="mt-1 text-base font-medium text-slate-800 dark:text-slate-100">
          {{ pending ? '加载中...' : '我的对话' }}
        </p>
      </div>
      <UButton
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-lucide-plus"
        :disabled="pending"
        @click="emit('create')"
      >
        新建
      </UButton>
    </div>

    <div class="scrollbar-thin mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
      <UAlert
        v-if="!sessions.length && !pending"
        icon="i-lucide-sparkles"
        color="primary"
        variant="soft"
        title="暂无历史会话"
        description="创建一个新的对话以开始与 AI 协作。"
        class="text-xs"
      />

      <div
        v-for="session in sessions"
        :key="session.id"
        :class="[
          'group relative flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-left shadow-sm backdrop-blur transition dark:border-slate-700/60 dark:bg-slate-900/70',
          session.id === activeId ? 'ring-2 ring-primary/70' : 'hover:border-primary/40 hover:ring-1 hover:ring-primary/20'
        ]"
        @click="emit('select', session.id)"
      >
        <div class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" :class="session.id === activeId ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'" />
        <div class="flex-1 space-y-1">
          <p class="line-clamp-2 text-sm font-medium text-slate-900/90 dark:text-slate-100">
            {{ session.title }}
          </p>
          <div class="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-messages-square" class="h-3 w-3" />
              {{ session.messageCount }} 条记录
            </span>
            <span>{{ formatTimestamp(session.updatedAt) }}</span>
          </div>
        </div>
        <UDropdownMenu :items="buildMenuItems(session)" mode="hover" :popper="{ placement: 'left-start' }">
          <UButton
            variant="ghost"
            color="gray"
            size="xs"
            icon="i-lucide-more-vertical"
            class="opacity-0 transition group-hover:opacity-100"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.chat-session-sidebar {
  min-height: 28rem;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.4);
  border-radius: 999px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
</style>
