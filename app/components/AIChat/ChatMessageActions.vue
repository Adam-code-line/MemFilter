<template>
  <div class="flex items-center gap-2">
    <UTooltip text="复制内容">
      <UButton
        size="xs"
        variant="ghost"
        color="gray"
        icon="i-lucide-copy"
        :disabled="!hasContent"
        @click="handleCopy"
      />
    </UTooltip>
    <UTooltip text="保存为记忆" v-if="isAssistant">
      <UButton
        size="xs"
        variant="ghost"
        color="primary"
        icon="i-lucide-notebook-pen"
        :loading="isCreating"
        :disabled="!hasContent || isCreating"
        @click="handleCreateNote"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from '#imports'
import type { AIChatMessage } from '~/composables/chat/types'
import { useNotesStore } from '~~/stores/notes'
import { useNoteAIInsights } from '~/composables/note/useNoteAIInsights'
import type {
  ImportanceLevel,
  NoteAIEvaluation,
  NoteAICompression,
  NoteSavePayload
} from '~/composables/note/types'

const props = defineProps<{
  message: AIChatMessage
}>()

const toast = useToast()
const notesStore = useNotesStore()
const { evaluateNote, compressNote } = useNoteAIInsights()

const isCreating = ref(false)

const contentValue = computed(() => (props.message.content ?? '').trim())
const hasContent = computed(() => contentValue.value.length > 0)
const isAssistant = computed(() => props.message.role !== 'user')

const handleCopy = async () => {
  if (!hasContent.value) {
    toast.add({ title: '复制失败', description: '没有可复制的内容。', color: 'warning' })
    return
  }

  if (!import.meta.client || typeof navigator === 'undefined' || !navigator.clipboard) {
    toast.add({ title: '复制失败', description: '当前环境不支持剪贴板。', color: 'warning' })
    return
  }

  try {
    await navigator.clipboard.writeText(contentValue.value)
    toast.add({ title: '已复制', description: '内容已复制到剪贴板。', color: 'success' })
  } catch (error) {
    console.error('[ai-chat] copy failed', error)
    toast.add({ title: '复制失败', description: '尝试复制内容时出错。', color: 'error' })
  }
}

const deriveTitle = (summary: string | null, content: string) => {
  const summaryCandidate = summary?.replace(/\s+/g, ' ').trim()
  if (summaryCandidate && summaryCandidate.length) {
    return summaryCandidate.length > 36 ? `${summaryCandidate.slice(0, 36)}…` : summaryCandidate
  }

  const candidate = content.split(/\r?\n/).find(line => line.trim().length) ?? content
  const trimmed = candidate.trim()
  if (!trimmed) {
    return '新建记忆'
  }
  return trimmed.length > 36 ? `${trimmed.slice(0, 36)}…` : trimmed
}

const handleCreateNote = async () => {
  if (isCreating.value || !hasContent.value) {
    return
  }

  isCreating.value = true

  try {
    const text = contentValue.value

    if (!notesStore.isHydrated.value) {
      await notesStore.ensureInitialized()
    }

    let evaluation: NoteAIEvaluation | null = null
    let compression: NoteAICompression | null = null
    try {
      evaluation = await evaluateNote({
        text,
        meta: { source: 'manual', importanceHint: 'medium' }
      })
    } catch (error) {
      console.warn('[ai-chat] evaluate note failed', error)
    }

    try {
      compression = await compressNote({
        text,
        meta: { title: props.message.name ?? undefined, importance: evaluation?.importance }
      })
    } catch (error) {
      console.warn('[ai-chat] compress note failed', error)
    }

    const importance: ImportanceLevel = evaluation?.importance ?? 'medium'
    const summary = compression?.summary ?? null

    const payload: NoteSavePayload = {
      title: deriveTitle(summary, text),
      content: text,
      description: '',
      importance,
      aiEvaluation: evaluation ?? null,
      aiCompression: compression ?? null
    }

    const created = await notesStore.upsertNote(payload, null)
    if (!created) {
      throw new Error('upsert note failed')
    }

    toast.add({ title: '记忆已创建', description: 'AI 内容已保存到记忆列表。', color: 'success' })
  } catch (error) {
    console.error('[ai-chat] create note failed', error)
    toast.add({ title: '创建失败', description: '保存记忆时出现问题，请稍后重试。', color: 'error' })
  } finally {
    isCreating.value = false
  }
}
</script>
