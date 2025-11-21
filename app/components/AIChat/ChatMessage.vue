<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="flex w-full flex-col gap-3" :class="isAssistant ? 'items-start' : 'items-end'">
    <div class="flex items-start gap-3" :class="isAssistant ? '' : 'flex-row-reverse'">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 shadow-md"
        :class="
          isAssistant
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : 'bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-900'
        "
      >
        <AppLogo v-if="isAssistant" variant="icon" class="h-6 w-auto" />
        <UIcon v-else name="i-lucide-user" class="h-5 w-5" />
      </div>
      <UCard :class="cardClasses" :ui="cardUi">
        <template #header>
          <div
            class="flex items-center justify-between text-xs uppercase tracking-wide text-white/70"
          >
            <span>{{ isAssistant ? 'MemFilter AI' : 'You' }}</span>
            <UBadge
              v-if="message.status === 'streaming'"
              size="xs"
              color="primary"
              variant="soft"
              class="uppercase"
              label="Streaming"
            />
            <UBadge
              v-else-if="message.status === 'error'"
              size="xs"
              color="red"
              variant="soft"
              class="uppercase"
              label="Error"
            />
          </div>
        </template>
        <div class="text-sm leading-relaxed">
          <div
            v-if="isStreaming && streamingText.length"
            class="whitespace-pre-wrap wrap-break-word text-white/90"
          >
            {{ streamingText }}
          </div>
          <div
            v-else-if="hasFinalContent"
            class="prose prose-invert max-w-none wrap-break-word"
            v-html="renderedMarkdown"
          />
          <p v-else class="italic text-white/40">正在思考中...</p>
        </div>
        <template #footer>
          <div
            class="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/40"
          >
            <span>{{ formattedTimestamp }}</span>
            <slot name="actions" />
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { AIChatMessage } from '~/composables/chat/types'
  import { useMarkdownRenderer } from '~/composables/chat/useMarkdownRenderer'

  const props = defineProps<{
    message: AIChatMessage
  }>()

  const isAssistant = computed(() => props.message.role !== 'user')

  const cardClasses = computed(() =>
    isAssistant.value
      ? 'bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-slate-900/65 border border-white/10 backdrop-blur'
      : 'bg-gradient-to-br from-emerald-500/90 to-emerald-500/80 text-slate-900'
  )

  const cardUi = {
    base: 'w-full max-w-2xl',
    header: 'pb-1',
    body: 'text-sm space-y-3',
    footer: 'pt-2',
    ring: 'ring-0',
  }

  const streamingText = computed(() => props.message.streamingContent ?? '')
  const finalContent = computed(() => props.message.content ?? '')
  const isStreaming = computed(
    () => props.message.status === 'streaming' && streamingText.value.length > 0
  )

  const hasFinalContent = computed(() => !isStreaming.value && finalContent.value.trim().length > 0)

  const { renderMarkdown } = useMarkdownRenderer()
  const renderedMarkdown = computed(() =>
    hasFinalContent.value ? renderMarkdown(finalContent.value) : ''
  )

  const formattedTimestamp = computed(() => {
    const date = new Date(props.message.createdAt)
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  })
</script>

<style scoped>
  :deep(.prose pre) {
    background: rgba(15, 23, 42, 0.65);
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    border: 1px solid rgba(148, 163, 184, 0.25);
  }

  :deep(.prose code) {
    font-family:
      'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
    font-size: 0.85rem;
  }

  :deep(.prose h1),
  :deep(.prose h2),
  :deep(.prose h3),
  :deep(.prose h4) {
    font-weight: 600;
    color: #f8fafc;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  :deep(.prose h1) {
    font-size: 1.5rem;
  }

  :deep(.prose h2) {
    font-size: 1.25rem;
  }

  :deep(.prose h3) {
    font-size: 1.1rem;
  }

  :deep(.prose p),
  :deep(.prose li) {
    font-size: 0.95rem;
    color: rgba(248, 250, 252, 0.9);
  }

  :deep(.prose ul) {
    list-style: disc;
    padding-left: 1.25rem;
  }

  :deep(.prose ol) {
    list-style: decimal;
    padding-left: 1.25rem;
  }

  :deep(.prose a) {
    color: rgb(56 189 248);
    text-decoration: underline;
  }
</style>
