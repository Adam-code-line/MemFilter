<script setup lang="ts">
import ChatHeader from '~/components/AIChat/ChatHeader.vue'
import ChatMessageList from '~/components/AIChat/ChatMessageList.vue'
import ChatInputBar from '~/components/AIChat/ChatInputBar.vue'
import { useAIChat } from '~/composables/chat/useAIChat'

definePageMeta({
  layout: 'app'
})

const runtime = useRuntimeConfig()
const systemPrompt = '你是一位优雅、冷静且洞察敏锐的 AI 助手，善于以简洁行动建议帮助用户前进。'

const availableModelNames = Array.isArray(runtime.public.aiModels)
  ? runtime.public.aiModels
  : []

const defaultModel = runtime.public.aiDefaultModel || 'glm-4.5'
const defaultTemperature = Number(runtime.public.aiTemperature ?? 0.6)

const aiChat = useAIChat({
  systemPrompt,
  defaultModel,
  temperature: defaultTemperature
})

const { input, messages, isWaiting, activeModel, errorMessage, sendMessage, resetConversation } = aiChat

const searchRecommendations = [
  '总结今天的工作亮点，并给出优化建议',
  '为产品发布会准备一个 30 分钟的讲稿结构',
  '帮我列出学习一门新技能的 7 日计划'
]

const modelOptions = computed(() => {
  if (!availableModelNames.length) {
    return [{ label: defaultModel.toUpperCase(), value: defaultModel }]
  }
  return availableModelNames.map((value: string) => ({
    label: value.toUpperCase(),
    value
  }))
})

const heroGradient = computed(() => ({
  background:
    'radial-gradient(circle at top, rgba(20, 184, 166, 0.22), rgba(6, 182, 212, 0) 45%), radial-gradient(circle at bottom left, rgba(167, 139, 250, 0.24), rgba(59, 130, 246, 0) 60%)'
}))

const currentModel = computed(() => activeModel.value ?? modelOptions.value[0]?.value ?? null)

const visibleMessages = computed(() => messages.value.filter(message => message.role !== 'system'))

const handleSubmit = async () => {
  await sendMessage()
}

const updateModel = (value: string) => {
  activeModel.value = value
}

const applyPrompt = (prompt: string) => {
  input.value = prompt
}

useHead({
  title: 'AI 会话 - MemFilter'
})

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSubmit()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="relative min-h-screen bg-slate-950 text-white">
    <div class="absolute inset-0 -z-10 opacity-80" :style="heroGradient" />
    <div class="absolute inset-0 -z-20 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950" />

    <UContainer class="flex min-h-screen flex-col items-center justify-start gap-12 py-12">
      <ChatHeader />

      <UCard
        class="relative flex w-full max-w-5xl flex-1 flex-col overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl"
        :ui="{ body: 'flex flex-col h-full' }"
      >
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
            <div class="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
              <UIcon name="i-lucide-message-circle" class="h-4 w-4 text-primary" />
              <span>即时对话</span>
            </div>
            <div class="flex gap-2 text-xs text-white/40">
              <UButton
                color="white"
                variant="soft"
                size="xs"
                icon="i-lucide-rotate-ccw"
                class="bg-white/10"
                @click="resetConversation"
              >
                清空对话
              </UButton>
              <UButton
                color="white"
                variant="ghost"
                size="xs"
                icon="i-lucide-book-open"
                class="hover:bg-white/10"
              >
                会话指南
              </UButton>
            </div>
          </div>
        </template>

  <ChatMessageList :messages="visibleMessages" />

        <div class="border-t border-white/10 bg-slate-950/40 px-4 pb-4 pt-3">
          <div v-if="errorMessage" class="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {{ errorMessage }}
          </div>
          <ChatInputBar
            v-model="input"
            :models="modelOptions"
            :active-model="currentModel"
            :loading="isWaiting"
            :disabled="isWaiting"
            placeholder="向 AI 问点什么吧..."
            @submit="handleSubmit"
            @update:model="updateModel"
          >
            <template #meta>
              <div v-if="currentModel" class="flex items-center gap-2 text-white/50">
                <UIcon name="i-lucide-flame" class="h-3.5 w-3.5" />
                <span class="text-[11px] uppercase tracking-widest">{{ currentModel?.toUpperCase() }}</span>
              </div>
            </template>
          </ChatInputBar>
        </div>
      </UCard>

      <div class="grid w-full max-w-5xl gap-3 md:grid-cols-3">
        <UCard
          v-for="(item, index) in searchRecommendations"
          :key="index"
          class="border border-white/5 bg-white/8 backdrop-blur-lg"
          :ui="{ body: 'space-y-2 text-sm text-white/70' }"
        >
          <h3 class="text-sm font-semibold text-white/80">灵感提示 {{ index + 1 }}</h3>
          <p>{{ item }}</p>
          <UButton
            color="primary"
            variant="ghost"
            size="xs"
            class="mt-2"
            @click="applyPrompt(item)"
          >
            使用提示
          </UButton>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>
