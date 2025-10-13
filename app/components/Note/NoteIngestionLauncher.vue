<script setup lang="ts">
import { computed, ref } from '#imports'
import NoteIngestionDialog from '~/components/Note/NoteIngestionDialog.vue'
import type { MemoryRawItem } from '~/composables/services/useIngestionService'

const props = withDefaults(defineProps<{ buttonSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }>(), {
  buttonSize: 'lg'
})

const emit = defineEmits<{
  (event: 'promoted', item: MemoryRawItem): void
}>()

const ingestion = useIngestionManager()
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

const isDialogOpen = ref(false)

const formatIngestionTimestamp = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

async function openIngestionDialog () {
  if (!ingestionPendingItems.value.length && !ingestionIsLoading.value) {
    try {
      await ingestion.refreshPendingItems()
    } catch {
      // toast 已处理错误
    }
  }

  isDialogOpen.value = true
}

async function handleFetchNewMemories () {
  try {
    await ingestion.syncAndFetch()
    await openIngestionDialog()
  } catch {
    if (ingestionPendingItems.value.length) {
      await openIngestionDialog()
    }
  }
}

async function handleRefreshPendingItems () {
  try {
    await ingestion.refreshPendingItems()
  } catch {
    // toast 已处理错误
  }
}

async function handlePromoteRawItem (item: MemoryRawItem) {
  promotingRawItemId.value = item.id
  try {
    await ingestion.promoteRawItem(item, { title: item.title ?? undefined })
    emit('promoted', item)
  } catch {
    // toast 已处理错误
  } finally {
    promotingRawItemId.value = null
  }
}

const handleDialogClose = () => {
  isDialogOpen.value = false
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
      @click="openIngestionDialog"
    >
      待处理原始记忆
      <UBadge
        class="ml-2"
        :label="ingestionPendingCount"
        color="primary"
        variant="solid"
      />
    </UButton>
    <NoteIngestionDialog
      v-model="isDialogOpen"
      :items="ingestionPendingItems"
      :is-loading="ingestionIsLoading"
      :last-sync-summary="ingestionLastSyncSummary"
      :promoting-id="promotingRawItemId"
      :format-timestamp="formatIngestionTimestamp"
      @refresh="handleRefreshPendingItems"
      @promote="handlePromoteRawItem"
      @close="handleDialogClose"
    />
  </div>
</template>
