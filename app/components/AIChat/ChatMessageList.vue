<template>
  <div
    ref="listRef"
    class="relative flex-1 overflow-y-auto px-2 py-6"
  >
    <TransitionGroup name="chat-fade" tag="div" class="flex flex-col gap-6">
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
      >
        <template #actions>
          <ChatMessageActions :message="message" />
        </template>
      </ChatMessage>
    </TransitionGroup>
    <div
      v-if="!messages.length"
      class="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center text-white/60"
    >
      <div class="rounded-full bg-primary/20 p-3">
        <UIcon name="i-lucide-sparkles" class="h-6 w-6 text-primary-200" />
      </div>
      <p class="text-lg font-medium">准备好提问了吗？</p>
      <p class="text-sm text-white/40">
        尝试询问产品策略、生成创意，或是让 AI 快速整理一段内容。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatMessage from '~/components/AIChat/ChatMessage.vue'
import ChatMessageActions from '~/components/AIChat/ChatMessageActions.vue'
import type { AIChatMessage } from '~/composables/chat/types'

const props = defineProps<{ messages: AIChatMessage[] }>()

const listRef = ref<HTMLDivElement | null>(null)

watch(
  () => props.messages.length,
  () => {
    if (!listRef.value) return
    nextTick(() => {
      listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' })
    })
  }
)
</script>

<style scoped>
.chat-fade-enter-active,
.chat-fade-leave-active {
  transition: all 0.35s ease;
}

.chat-fade-enter-from,
.chat-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.chat-fade-move {
  transition: transform 0.25s ease;
}
</style>
