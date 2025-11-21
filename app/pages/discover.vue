<script setup lang="ts">
  import { computed, onMounted, ref, useHead, useRouter } from '#imports'
  import type { MemoryRawItem } from '~/composables/services/useIngestionService'
  import { useIngestionManager } from '~/composables/ingestion/useIngestionManager'
  import DiscoveryWorkspace from '~/components/Discovery/DiscoveryWorkspace.vue'
  import { useNotesStore } from '~~/stores/notes'

  definePageMeta({
    layout: 'app',
  })

  const router = useRouter()
  const ingestion = useIngestionManager()
  const promotingId = ref<number | null>(null)
  const notesStore = useNotesStore()

  const items = computed(() => ingestion.pendingItems.value)
  const isLoading = computed(() => ingestion.isLoadingItems.value)
  const isSyncing = computed(() => ingestion.isSyncing.value)
  const lastSyncSummary = computed(() => {
    const result = ingestion.lastSyncResult.value
    if (!result) {
      return null
    }
    return `本次同步新增 ${result.inserted} 条 / 共 ${result.total} 条`
  })

  const handleFetch = async (options?: { keywords?: string[] | null; limit?: number | null }) => {
    try {
      await ingestion.syncAndFetch({
        keywords: options?.keywords ?? undefined,
        limit: options?.limit ?? undefined,
      })
    } catch {
      // toast handled in manager
    }
  }

  const handleRefresh = async () => {
    try {
      await ingestion.refreshPendingItems()
    } catch {
      // toast handled in manager
    }
  }

  const handlePromote = async (item: MemoryRawItem) => {
    promotingId.value = item.id
    try {
      await ingestion.promoteRawItem(item, { title: item.title ?? undefined })
      try {
        await notesStore.refreshFromServer()
      } catch {
        // ignore refresh errors, toast handled elsewhere
      }
    } catch {
      // toast handled in manager
    } finally {
      promotingId.value = null
    }
  }

  const handleOpenNotes = () => {
    router.push('/note')
  }

  const config = useRuntimeConfig()
  const POLL_INTERVAL = (config.public.ingestion?.pollInterval as number) || 60 * 1000
  let pollTimer: NodeJS.Timeout | null = null

  onMounted(async () => {
    if (!items.value.length) {
      try {
        await ingestion.refreshPendingItems()
      } catch {
        // toast handled in manager
      }
    }

    // Start polling for updates
    pollTimer = setInterval(() => {
      if (!isSyncing.value && !isLoading.value) {
        handleRefresh()
      }
    }, POLL_INTERVAL)
  })

  onBeforeUnmount(() => {
    if (pollTimer) {
      clearInterval(pollTimer)
    }
  })

  useHead(() => ({
    title: '探索中心',
  }))
</script>

<template>
  <div class="mx-auto max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
    <DiscoveryWorkspace
      :items="items"
      :is-loading="isLoading"
      :is-syncing="isSyncing"
      :last-sync-summary="lastSyncSummary"
      :promoting-id="promotingId"
      @fetch="handleFetch"
      @refresh="handleRefresh"
      @promote="handlePromote"
      @open-notes="handleOpenNotes"
    />
  </div>
</template>
