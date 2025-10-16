<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ wrapper: 'items-start sm:items-start', container: 'sm:max-w-2xl', base: 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-primary/10' }"
    @close="closeModal"
  >
    <template #content>
      <UCard class="border-none bg-transparent shadow-none">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                通知中心
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                查看遗忘引擎的折叠提醒与恢复窗口提示。
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="关闭通知中心"
              @click="closeModal"
            />
          </div>
        </template>

        <div class="max-h-[26rem] space-y-4 overflow-y-auto pr-3">
          <div v-if="!notifications.length" class="flex flex-col items-center justify-center gap-3 py-12 text-center text-gray-500 dark:text-gray-400">
            <UIcon name="i-lucide-bell-ring" class="h-12 w-12 text-primary" />
            <p class="text-sm">暂无新的通知</p>
            <p class="text-xs">当记忆折叠或进入恢复窗口时会在这里出现提醒。</p>
          </div>

          <ul v-else class="space-y-3">
            <li
              v-for="entry in notifications"
              :key="entry.id"
              class="group rounded-2xl border border-gray-200/60 bg-white/90 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-lg dark:border-slate-700/40 dark:bg-slate-900/70"
            >
              <div class="flex flex-col gap-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UIcon :name="entry.type === 'collapse' ? 'i-lucide-archive' : 'i-lucide-rotate-ccw'" class="text-lg" />
                    </div>
                    <div class="space-y-1">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ entry.title }}
                      </p>
                      <p class="text-xs leading-5 text-gray-500 dark:text-gray-400">
                        {{ entry.description }}
                      </p>
                    </div>
                  </div>
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    {{ formatTimestamp(entry.createdAt) }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span v-if="entry.fadeLevel !== undefined">
                    当前淡化等级：{{ entry.fadeLevel }}级
                  </span>
                  <span v-if="entry.daysRemaining !== null && entry.daysRemaining !== undefined">
                    预计剩余：约 {{ entry.daysRemaining }} 天
                  </span>
                </div>

                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <span v-if="entry.type === 'collapse'" class="text-xs text-amber-500 dark:text-amber-300">
                      折叠提醒
                    </span>
                    <span v-else class="text-xs text-sky-500 dark:text-sky-300">
                      恢复窗口提醒
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UButton
                      v-if="entry.noteId"
                      size="xs"
                      color="primary"
                      icon="i-lucide-external-link"
                      variant="soft"
                      @click="handleNavigate(entry)"
                    >
                      查看笔记
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-check"
                      @click="markAsRead(entry.id)"
                    >
                      标记已读
                    </UButton>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from '#imports'
import { useNotificationCenter } from '~/composables/notifications/useNotificationCenter'

const router = useRouter()
const {
  notifications,
  isModalOpen,
  closeModal,
  markAsRead,
  openModal
} = useNotificationCenter()

const isOpen = computed({
  get: () => isModalOpen.value,
  set: value => {
    if (value) {
      openModal()
    } else {
      closeModal()
    }
  }
})

const formatTimestamp = (timestamp: number) => {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

const handleNavigate = (entry: { noteId?: number | string; id: string }) => {
  if (!entry.noteId) {
    return
  }
  markAsRead(entry.id)
  closeModal()
  router.push({
    path: '/memory/' + entry.noteId,
    query: { noteId: String(entry.noteId) }
  })
}
</script>
