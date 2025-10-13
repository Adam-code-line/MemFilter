<script setup lang="ts">
import type { MemoryRawItem } from '~/composables/services/useIngestionService'

const props = defineProps<{
  items: MemoryRawItem[]
  isLoading: boolean
  lastSyncSummary: string | null
  promotingId: number | null
  formatTimestamp: (value: string) => string
}>()

const emit = defineEmits<{
  (event: 'refresh'): void
  (event: 'promote', item: MemoryRawItem): void
  (event: 'close'): void
}>()

const handleRefresh = () => {
  emit('refresh')
}

const handlePromote = (item: MemoryRawItem) => {
  emit('promote', item)
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            待处理原始记忆
          </h2>
          <div class="flex items-center gap-2">
            <UButton
              variant="ghost"
              size="sm"
              icon="i-lucide-rotate-cw"
              :loading="isLoading"
              @click="handleRefresh"
            >
              刷新
            </UButton>
            <UButton
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              aria-label="关闭"
              @click="handleClose"
            />
          </div>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          将原始资讯快速筛选为正式记忆。
        </p>
        <UAlert
          v-if="lastSyncSummary"
          icon="i-lucide-info"
          color="primary"
          variant="soft"
          :title="lastSyncSummary"
        />
      </div>
    </template>

    <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      <div v-if="isLoading" class="space-y-3">
        <USkeleton v-for="n in 3" :key="n" class="h-20 rounded-xl" />
      </div>
      <div
        v-else-if="!items.length"
        class="flex flex-col items-center justify-center gap-3 py-12 text-center text-gray-500 dark:text-gray-400"
      >
        <UIcon name="i-lucide-calendar-check" class="h-12 w-12 text-primary" />
        <p class="text-lg font-medium">暂无待处理的资讯</p>
        <p class="text-sm">点击“获取新记忆”以从资讯源拉取最新内容。</p>
      </div>
      <ul v-else class="space-y-4">
        <li
          v-for="item in items"
          :key="item.id"
          class="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/70"
        >
          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ item.title || '未命名资讯' }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatTimestamp(item.ingestedAt) }}
                </p>
              </div>
              <UButton
                color="primary"
                size="sm"
                icon="i-lucide-arrow-right-circle"
                :loading="promotingId === item.id"
                @click="handlePromote(item)"
              >
                生成记忆
              </UButton>
            </div>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {{ item.content || '暂无摘要内容' }}
            </p>
          </div>
        </li>
      </ul>
    </div>
  </UCard>
</template>
