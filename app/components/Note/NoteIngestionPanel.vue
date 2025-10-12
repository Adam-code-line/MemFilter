<script setup lang="ts">
import type { MemoryRawItem } from '~/composables/services/useIngestionService'

const props = withDefaults(defineProps<{ buttonSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }>(), {
  buttonSize: 'lg'
})

const emit = defineEmits<{
  (event: 'promoted', item: MemoryRawItem): void
}>()

const ingestion = useIngestionManager()
const ingestionModalOpen = ref(false)
const promotingRawItemId = ref<number | null>(null)

const ingestionPendingItems = computed(() => ingestion.pendingItems.value)
const ingestionIsSyncing = computed(() => ingestion.isSyncing.value)
const ingestionIsLoading = computed(() => ingestion.isLoadingItems.value)
const ingestionIsInitializing = computed(() => ingestion.isInitializing.value)
const ingestionLastSync = computed(() => ingestion.lastSyncResult.value)
const ingestionPendingCount = computed(() => ingestionPendingItems.value.length)
const ingestionHasPending = computed(() => ingestionPendingCount.value > 0)
const ingestionLastSyncSummary = computed(() => {
  const result = ingestionLastSync.value
  if (!result) {
    return null
  }
  return `本次同步新增 ${result.inserted} 条 / 共 ${result.total} 条`
})

const formatIngestionTimestamp = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

const openIngestionModal = async () => {
  ingestionModalOpen.value = true
  if (!ingestionPendingItems.value.length) {
    try {
      await ingestion.refreshPendingItems()
    } catch {
      // toast 已处理错误
    }
  }
}

const handleFetchNewMemories = async () => {
  try {
    await ingestion.syncAndFetch()
    ingestionModalOpen.value = true
  } catch {
    if (ingestionPendingItems.value.length) {
      ingestionModalOpen.value = true
    }
  }
}

const handleRefreshPendingItems = async () => {
  try {
    await ingestion.refreshPendingItems()
  } catch {
    // toast 已处理错误
  }
}

const handlePromoteRawItem = async (item: MemoryRawItem) => {
  promotingRawItemId.value = item.id
  try {
    await ingestion.promoteRawItem(item, { title: item.title ?? undefined })
    emit('promoted', item)
    if (!ingestionPendingItems.value.length) {
      ingestionModalOpen.value = false
    }
  } catch {
    // toast 已处理错误
  } finally {
    promotingRawItemId.value = null
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <UButton
      :size="buttonSize"
      variant="soft"
      color="primary"
      icon="i-lucide-sparkles"
      :loading="ingestionIsSyncing || ingestionIsInitializing"
      :disabled="ingestionIsSyncing"
      @click="handleFetchNewMemories"
    >
      获取新记忆
    </UButton>
    <UButton
      v-if="ingestionHasPending"
      :size="buttonSize"
      variant="outline"
      color="neutral"
      icon="i-lucide-inbox"
      @click="openIngestionModal"
    >
      待处理原始记忆
      <UBadge
        class="ml-2"
        :label="ingestionPendingCount"
        color="primary"
        variant="solid"
      />
    </UButton>

    <UModal v-model="ingestionModalOpen" :ui="{ width: 'sm:max-w-3xl' }">
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
                  :loading="ingestionIsLoading"
                  @click="handleRefreshPendingItems"
                >
                  刷新
                </UButton>
                <UButton
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-x"
                  aria-label="关闭"
                  @click="ingestionModalOpen = false"
                />
              </div>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              将原始资讯快速筛选为正式记忆。
            </p>
            <UAlert
              v-if="ingestionLastSyncSummary"
              icon="i-lucide-info"
              color="primary"
              variant="soft"
              :title="ingestionLastSyncSummary"
            />
          </div>
        </template>

        <div class="space-y-6">
          <div v-if="ingestionIsLoading" class="space-y-3">
            <USkeleton v-for="n in 3" :key="n" class="h-20 rounded-xl" />
          </div>
          <div
            v-else-if="!ingestionPendingCount"
            class="flex flex-col items-center justify-center gap-3 py-12 text-center text-gray-500 dark:text-gray-400"
          >
            <UIcon name="i-lucide-calendar-check" class="h-12 w-12 text-primary" />
            <p class="text-lg font-medium">暂无待处理的资讯</p>
            <p class="text-sm">点击“获取新记忆”以从资讯源拉取最新内容。</p>
          </div>
          <ul v-else class="space-y-4">
            <li
              v-for="item in ingestionPendingItems"
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
                      {{ formatIngestionTimestamp(item.ingestedAt) }}
                    </p>
                  </div>
                  <UButton
                    color="primary"
                    size="sm"
                    icon="i-lucide-arrow-right-circle"
                    :loading="promotingRawItemId === item.id"
                    @click="handlePromoteRawItem(item)"
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
    </UModal>
  </div>
</template>
