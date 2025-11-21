<template>
  <section
    class="rounded-2xl border border-slate-200/60 bg-slate-50/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40"
  >
    <div class="flex flex-col gap-6 lg:flex-row">
      <div
        class="flex flex-1 flex-col gap-4 rounded-xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900/70 dark:ring-slate-700/60"
      >
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col">
            <span
              class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >AI 价值评估</span
            >
            <span class="text-sm text-slate-500 dark:text-slate-300"
              >自动判断重要程度并给出处理建议</span
            >
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              v-if="evaluationStale"
              label="内容已更新"
              color="amber"
              variant="subtle"
              icon="i-lucide-alert-triangle"
            />
            <UBadge
              v-if="evaluationTimestamp"
              :label="evaluationTimestamp"
              color="neutral"
              variant="outline"
              icon="i-lucide-clock"
            />
          </div>
        </header>

        <UAlert v-if="evaluationError" color="rose" variant="soft" icon="i-lucide-triangle-alert">
          <template #description>
            {{ evaluationError }}
          </template>
        </UAlert>

        <div v-if="evaluation" class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              :label="importanceMeta?.label ?? '未识别'"
              :color="importanceMeta?.color ?? 'primary'"
              :variant="importanceMeta?.badgeVariant ?? 'soft'"
              :icon="importanceMeta?.icon"
            />
            <UBadge
              v-if="suggestionMeta"
              :label="suggestionMeta.label"
              :color="suggestionMeta.color"
              variant="soft"
            />
            <UBadge
              v-if="evaluationImportanceScore !== null"
              :label="`重要度 ${evaluationImportanceScore}%`"
              color="primary"
              variant="outline"
              icon="i-lucide-gauge"
            />
          </div>
          <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-200">
            {{ evaluation.rationale }}
          </p>
          <div class="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span v-if="evaluation.usage?.promptTokens"
              >Prompt：{{ evaluation.usage.promptTokens }}</span
            >
            <span v-if="evaluation.usage?.completionTokens"
              >Completion：{{ evaluation.usage.completionTokens }}</span
            >
            <span v-if="evaluation.usage?.totalTokens"
              >总计：{{ evaluation.usage.totalTokens }}</span
            >
          </div>
        </div>
        <div v-else class="text-sm leading-relaxed text-slate-500 dark:text-slate-300">
          <p>输入完成后即可让 AI 评估笔记价值并获得建议的重要度等级。</p>
        </div>

        <footer class="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <UButton
            size="sm"
            color="primary"
            :loading="evaluating"
            :disabled="!contentReady"
            @click="handleEvaluate"
          >
            {{ evaluation ? '重新评估' : '进行价值评估' }}
          </UButton>
          <UButton
            v-if="evaluation"
            size="sm"
            variant="ghost"
            color="neutral"
            @click="handleClearEvaluation"
          >
            清除结果
          </UButton>
          <span v-if="!contentReady" class="text-xs text-slate-500 dark:text-slate-400"
            >需要更多正文内容后才能调用评估。</span
          >
        </footer>
      </div>

      <div class="hidden lg:block h-auto w-px rounded-full bg-slate-200/70 dark:bg-slate-700/50" />

      <div
        class="flex flex-1 flex-col gap-4 rounded-xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900/70 dark:ring-slate-700/60"
      >
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col">
            <span
              class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >AI 摘要压缩</span
            >
            <span class="text-sm text-slate-500 dark:text-slate-300">生成精简摘要与关键要点</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              v-if="compressionStale"
              label="内容已更新"
              color="amber"
              variant="subtle"
              icon="i-lucide-alert-triangle"
            />
            <UBadge
              v-if="compressionTimestamp"
              :label="compressionTimestamp"
              color="neutral"
              variant="outline"
              icon="i-lucide-clock"
            />
          </div>
        </header>

        <UAlert v-if="compressionError" color="rose" variant="soft" icon="i-lucide-triangle-alert">
          <template #description>
            {{ compressionError }}
          </template>
        </UAlert>

        <NoteAISummaryBlock
          v-if="compression"
          :summary="compression.summary"
          :bullets="compression.bullets"
          :tokens-saved="compression.tokensSaved ?? null"
          :usage="compression.usage ?? null"
        />
        <div v-else class="text-sm leading-relaxed text-slate-500 dark:text-slate-300">
          <p>获取一段精炼摘要，方便在记忆列表中快速浏览与检索关键信息。</p>
        </div>

        <footer class="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <UButton
            size="sm"
            color="primary"
            :loading="compressing"
            :disabled="!contentReady"
            @click="handleCompress"
          >
            {{ compression ? '重新生成摘要' : '生成内容摘要' }}
          </UButton>
          <UButton
            v-if="compression"
            size="sm"
            variant="soft"
            color="primary"
            @click="handleUseSummary"
          >
            填充到描述
          </UButton>
          <UButton
            v-if="compression"
            size="sm"
            variant="ghost"
            color="neutral"
            @click="handleClearCompression"
          >
            清除结果
          </UButton>
          <span v-if="!contentReady" class="text-xs text-slate-500 dark:text-slate-400"
            >输入足够正文后即可生成摘要。</span
          >
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { IMPORTANCE_METADATA } from '~/composables/note-memory/importanceMetadata'
  import { useAIInsightsFeedback } from '~/composables/note/useAIInsightsFeedback'
  import type {
    ImportanceLevel,
    NoteAIEvaluation,
    NoteAICompression,
    NoteAISuggestedAction,
  } from '~/composables/note/types'

  const props = withDefaults(
    defineProps<{
      noteId?: string | number | null
      content?: string
      title?: string
      importance?: ImportanceLevel
      mode?: 'create' | 'edit'
      evaluation?: NoteAIEvaluation | null
      compression?: NoteAICompression | null
    }>(),
    {
      noteId: null,
      content: '',
      title: '',
      importance: 'medium',
      mode: 'create',
      evaluation: null,
      compression: null,
    }
  )

  const emit = defineEmits<{
    (e: 'evaluation-updated', value: NoteAIEvaluation | null): void
    (e: 'compression-updated', value: NoteAICompression | null): void
    (e: 'apply-importance', value: ImportanceLevel): void
    (e: 'apply-summary', value: string): void
  }>()

  const { evaluating, evaluationError, compressing, compressionError, evaluateNote, compressNote } =
    useNoteAIInsights()

  const { notifyCompressionSuccess } = useAIInsightsFeedback()

  const evaluation = ref<NoteAIEvaluation | null>(props.evaluation ?? null)
  const compression = ref<NoteAICompression | null>(props.compression ?? null)
  const evaluationStale = ref(false)
  const compressionStale = ref(false)

  const trimmedContent = computed(() => props.content?.trim() ?? '')
  const contentReady = computed(() => trimmedContent.value.length >= 40)

  const importanceMeta = computed(() =>
    evaluation.value ? IMPORTANCE_METADATA[evaluation.value.importance] : null
  )

  const suggestionMetaMap: Record<NoteAISuggestedAction, { label: string; color: string }> = {
    retain: { label: '建议保留', color: 'primary' },
    compress: { label: '建议压缩', color: 'amber' },
    discard: { label: '建议丢弃', color: 'rose' },
  }

  const suggestionMeta = computed(() =>
    evaluation.value ? suggestionMetaMap[evaluation.value.suggestedAction] : null
  )

  const evaluationImportanceScore = computed(() => {
    if (!evaluation.value) {
      return null
    }
    const metadata = IMPORTANCE_METADATA[evaluation.value.importance]
    if (!metadata) {
      return null
    }
    return Math.round(metadata.defaultScore)
  })

  const formatTimestamp = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }
    return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString()}`
  }

  const evaluationTimestamp = computed(() =>
    evaluation.value ? formatTimestamp(evaluation.value.generatedAt) : ''
  )

  const compressionTimestamp = computed(() =>
    compression.value ? formatTimestamp(compression.value.generatedAt) : ''
  )

  watch(
    () => props.evaluation,
    (value) => {
      evaluation.value = value ?? null
      evaluationStale.value = false
    }
  )

  watch(
    () => props.compression,
    (value) => {
      compression.value = value ?? null
      compressionStale.value = false
    }
  )

  watch(trimmedContent, (value, oldValue) => {
    if (value === oldValue) return
    if (evaluation.value) {
      evaluationStale.value = true
    }
    if (compression.value) {
      compressionStale.value = true
    }
  })

  const buildEvaluationMeta = () => ({
    noteId: props.noteId ?? undefined,
    source: props.mode === 'edit' ? 'manual' : 'ingestion',
    importanceHint: props.importance,
  })

  const buildCompressionMeta = () => ({
    noteId: props.noteId ?? undefined,
    title: props.title || undefined,
    importance: props.importance,
  })

  const handleEvaluate = async () => {
    if (!contentReady.value || evaluating.value) return
    try {
      const result = await evaluateNote({
        text: trimmedContent.value,
        meta: buildEvaluationMeta(),
      })
      if (result) {
        evaluation.value = result
        evaluationStale.value = false
        emit('evaluation-updated', result)
        emit('apply-importance', result.importance)
      }
    } catch {
      // 错误信息已经通过 evaluationError 暴露
    }
  }

  const handleCompress = async () => {
    if (!contentReady.value || compressing.value) return
    try {
      const result = await compressNote({
        text: trimmedContent.value,
        meta: buildCompressionMeta(),
      })
      if (result) {
        compression.value = result
        compressionStale.value = false
        emit('compression-updated', result)
        notifyCompressionSuccess(result)
      }
    } catch {
      // 错误信息已经通过 compressionError 暴露
    }
  }

  const handleUseSummary = () => {
    if (!compression.value) return
    emit('apply-summary', compression.value.summary)
  }

  const handleClearEvaluation = () => {
    evaluation.value = null
    evaluationStale.value = false
    emit('evaluation-updated', null)
  }

  const handleClearCompression = () => {
    compression.value = null
    compressionStale.value = false
    emit('compression-updated', null)
  }
</script>
