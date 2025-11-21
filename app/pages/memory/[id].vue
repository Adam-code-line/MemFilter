<template>
  <div class="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-0">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-2">
        <UBreadcrumb :items="breadcrumbs" />
        <div class="flex items-center gap-3">
          <UBadge
            v-if="detailStatus"
            :label="detailStatus.label"
            :color="detailStatus.color"
            variant="soft"
          />
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ currentNote?.title || '记忆详情' }}
          </h1>
        </div>
        <p
          v-if="currentNote?.description"
          class="text-sm text-gray-600 dark:text-gray-400 max-w-3xl"
        >
          {{ currentNote.description }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" @click="navigateBack">
          返回记忆概览
        </UButton>
        <UButton
          icon="i-lucide-square-pen"
          color="primary"
          variant="solid"
          @click="handleAction('open-note')"
        >
          在笔记中编辑
        </UButton>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <UCard
        class="border border-gray-200/70 dark:border-white/10 bg-white/85 dark:bg-slate-900/70 backdrop-blur"
      >
        <MemoryDetailPanel
          :note="currentNote"
          :actions="detailActions"
          :status-label="detailStatus?.label"
          :status-color="detailStatus?.color"
          @action="handleAction"
        />
      </UCard>

      <MemoryDetailInsights :note="currentNote" :status="detailStatus" />
    </div>

    <CommonConfirmDialog
      v-model="forgetConfirm.open"
      v-bind="forgetDialogBindings"
      @confirm="handleForgetConfirm"
      @cancel="forgetConfirm.open = false"
    />
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '~~/stores/notes'

  definePageMeta({
    layout: 'app',
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const notesStore = useNotesStore()
  await notesStore.ensureInitialized()

  const { notes } = storeToRefs(notesStore)

  const { sectionSource, detail, defaults: memoryDefaults } = await useMemoryContent()

  const noteId = computed(() => String(route.params.id ?? ''))
  const currentNote = computed(
    () => notes.value.find((note) => String(note.id) === noteId.value) ?? null
  )

  if (!currentNote.value) {
    throw createError({ statusCode: 404, statusMessage: '未找到对应的记忆条目' })
  }

  const {
    state: forgetConfirm,
    dialogBindings: forgetDialogBindings,
    openForNote: requestForget,
    confirm: confirmForget,
  } = useForgetConfirm({
    onExecuteForget: async (note) => {
      await notesStore.directForget(note)
      toast.add({ title: '已清理记忆', description: '记忆已移动至归档区。', color: 'neutral' })
      await router.replace({ path: '/memory' })
    },
  })

  const { detailStatus, detailActions, handleAction } = useMemoryDetailPage(currentNote, {
    sectionSource,
    sectionDefaults: memoryDefaults.sections,
    detailPanel: detail,
    onRestore: async (note) => {
      await notesStore.restoreNote(note)
      toast.add({ title: '记忆已恢复', description: '该记忆重新回到活跃列表。', color: 'success' })
    },
    onAccelerate: async (note) => {
      await notesStore.accelerateForgetting(note)
      toast.add({ title: '已加速遗忘', description: '遗忘进程已更新。', color: 'warning' })
    },
    onForgetRequest: (note) => requestForget(note),
    onOpenNote: (note) => {
      router.push({ path: '/note', query: { noteId: String(note.id ?? '') } })
    },
    includeOpenNoteAction: false,
  })

  const handleForgetConfirm = async () => {
    await confirmForget()
  }

  const breadcrumbs = computed(() => [
    { label: '记忆概览', to: '/memory' },
    { label: currentNote.value?.title ?? '记忆详情' },
  ])

  const navigateBack = () => {
    router.push('/memory')
  }

  useHead(() => ({
    title: currentNote.value ? `${currentNote.value.title} · 记忆详情` : '记忆详情',
  }))

  watch(currentNote, (value) => {
    if (!value) {
      navigateBack()
    }
  })
</script>
