<script setup lang="ts">
import ChatHeader from "~/components/AIChat/ChatHeader.vue";
import ChatMessageList from "~/components/AIChat/ChatMessageList.vue";
import ChatInputBar from "~/components/AIChat/ChatInputBar.vue";
import ChatSessionSidebar from "~/components/AIChat/ChatSessionSidebar.vue";
import { useAIChat } from "~/composables/chat/useAIChat";
import {
  useAIChatSessions,
  type ChatSessionRecord,
} from "~/composables/chat/useAIChatSessions";

definePageMeta({
  layout: "app",
});

const runtime = useRuntimeConfig();
const systemPrompt = [
  "你是一位优雅、冷静且洞察敏锐的 AI 助手，善于以简洁行动建议帮助用户前进。",
  "",
  "输出准则：",
  "1. 默认用精炼 Markdown：使用 `##` 作为主要分段标题，细项用 `-` 列表，代码使用成对的 ```lang ```，并仅在需要时给出简短说明。",
  "2. 流式输出时按段落/列表块推送，避免逐字发送；开启代码块后必须在同一回复内关闭。",
  "3. 当用户显式要求其他格式（如 HTML、CSV、纯文本、JSON），严格遵循该格式且不要附加 Markdown 装饰。",
  "4. 对不确定或缺失的信息，用引用块 `>` 简明标注不确定性，不要臆造数据。",
  "5. 若需要给出下一步行动，优先用 2~4 条简洁的 Markdown 列表呈现。",
].join("\n");

const availableModelNames = Array.isArray(runtime.public.aiModels)
  ? runtime.public.aiModels
  : [];

const defaultModel = runtime.public.aiDefaultModel || "glm-4.5";
const defaultTemperature = Number(runtime.public.aiTemperature ?? 0.6);

const aiChat = useAIChat({
  systemPrompt,
  defaultModel,
  temperature: defaultTemperature,
});

const {
  input,
  messages,
  isWaiting,
  activeModel,
  errorMessage,
  sendMessage,
  resetConversation,
  replaceMessages,
  getInitialMessages,
  stopGenerating,
} = aiChat;

const {
  sessions,
  activeSessionId,
  currentSession,
  isReady,
  createSession,
  setActiveSession,
  renameSession,
  deleteSession,
  syncActiveSession,
} = useAIChatSessions();

const modelOptions = computed(() => {
  const ordered: string[] = [];
  const pushUnique = (value?: string | null) => {
    const normalized = (value ?? "").trim();
    if (!normalized) {
      return;
    }
    if (!ordered.includes(normalized)) {
      ordered.push(normalized);
    }
  };

  pushUnique(defaultModel);
  for (const name of availableModelNames) {
    pushUnique(name);
  }

  // Ensure both flash and standard variants are always present for quick switching.
  pushUnique("glm-4.5-flash");
  pushUnique("glm-4.5");

  if (!ordered.length) {
    pushUnique("glm-4.5-flash");
  }

  return ordered.map((value) => ({
    label: value.toUpperCase(),
    value,
  }));
});

const heroGradient = computed(() => ({
  background:
    "radial-gradient(circle at top, rgba(20, 184, 166, 0.22), rgba(6, 182, 212, 0) 45%), radial-gradient(circle at bottom left, rgba(167, 139, 250, 0.24), rgba(59, 130, 246, 0) 60%)",
}));

const currentModel = computed(
  () => activeModel.value ?? modelOptions.value[0]?.value ?? null
);

const visibleMessages = computed(() =>
  messages.value.filter((message) => message.role !== "system")
);

const sessionSummaries = computed(() =>
  sessions.value.map(({ messages: _messages, ...summary }) => summary)
);

const currentSessionTitle = computed(
  () => currentSession.value?.title ?? "新的对话"
);

const currentSessionMeta = computed(() => {
  if (!currentSession.value) {
    return "尚未保存";
  }
  const updated = new Date(currentSession.value.updatedAt);
  return `更新于 ${updated.toLocaleString()}`;
});

const hasInitializedSessions = ref(false);
let suppressSync = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

const loadSession = (session: ChatSessionRecord | null) => {
  suppressSync = true;

  if (session) {
    replaceMessages(
      session.messages?.length ? session.messages : getInitialMessages()
    );
    activeModel.value = session.model ?? defaultModel;
  } else {
    replaceMessages(getInitialMessages());
    activeModel.value = defaultModel;
  }

  input.value = "";
  suppressSync = false;
};

const scheduleSync = () => {
  if (suppressSync || !hasInitializedSessions.value || !activeSessionId.value) {
    return;
  }

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncActiveSession({
      messages: messages.value,
      model: activeModel.value,
      temperature: defaultTemperature,
    });
  }, 200);
};

const ensureInitialSession = () => {
  if (!isReady.value || hasInitializedSessions.value) {
    return;
  }

  let target: ChatSessionRecord | null = null;

  if (!sessions.value.length) {
    target = createSession({
      messages: getInitialMessages(),
      model: activeModel.value,
      temperature: defaultTemperature,
    });
  } else {
    if (activeSessionId.value) {
      target = setActiveSession(activeSessionId.value);
    }

    if (!target && sessions.value.length) {
      target = setActiveSession(sessions.value[0].id);
    }
  }

  loadSession(target ?? null);
  hasInitializedSessions.value = true;
  scheduleSync();
};

watch([isReady, sessions], ensureInitialSession, { immediate: true });

watch(
  () => ({ messages: messages.value, model: activeModel.value }),
  () => scheduleSync(),
  { deep: true }
);

const handleSubmit = async () => {
  await sendMessage();
};

const updateModel = (value: string) => {
  activeModel.value = value;
};

const handleSessionSelect = (id: string) => {
  const session = setActiveSession(id);
  loadSession(session);
  scheduleSync();
};

const handleSessionCreate = () => {
  resetConversation();
  const session = createSession({
    messages: getInitialMessages(),
    model: activeModel.value,
    temperature: defaultTemperature,
  });
  loadSession(session);
  scheduleSync();
};

const handleSessionDelete = (id: string) => {
  const { deletedActive, nextActive } = deleteSession(id);

  if (!deletedActive) {
    return;
  }

  if (nextActive) {
    const session = setActiveSession(nextActive.id);
    loadSession(session);
  } else {
    const session = createSession({
      messages: getInitialMessages(),
      model: activeModel.value,
      temperature: defaultTemperature,
    });
    loadSession(session);
  }

  scheduleSync();
};

const handleSessionRename = ({ id, title }: { id: string; title: string }) => {
  renameSession(id, title);
  scheduleSync();
};

const clearConversation = () => {
  resetConversation();
  scheduleSync();
};

useHead({
  title: "AI 会话 - MemFilter",
});

onBeforeUnmount(() => {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
});
</script>

<template>
  <div class="relative min-h-screen bg-slate-950 text-white">
    <div class="absolute inset-0 -z-10 opacity-80" :style="heroGradient" />
    <div
      class="absolute inset-0 -z-20 bg-linear-to-b from-slate-950 via-slate-950/95 to-slate-950"
    />

    <UContainer class="relative flex min-h-screen flex-col gap-10 py-12">
      <ChatHeader />

      <div class="flex w-full flex-1 flex-col gap-6 lg:flex-row">
        <ChatSessionSidebar
          :sessions="sessionSummaries"
          :active-id="activeSessionId"
          :pending="!isReady"
          @select="handleSessionSelect"
          @create="handleSessionCreate"
          @delete="handleSessionDelete"
          @rename="handleSessionRename"
        />

        <UCard
          class="relative flex w-full flex-1 flex-col overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl"
          :ui="{ body: 'flex flex-col h-full' }"
        >
          <template #header>
            <div
              class="flex flex-wrap items-start justify-between gap-4 text-sm text-white/70"
            >
              <div class="space-y-2">
                <div
                  class="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50"
                >
                  <UIcon
                    name="i-lucide-message-circle"
                    class="h-4 w-4 text-primary"
                  />
                  <span>即时对话</span>
                </div>
                <div>
                  <h2 class="text-xl font-semibold text-white">
                    {{ currentSessionTitle }}
                  </h2>
                  <p class="text-xs text-white/40">{{ currentSessionMeta }}</p>
                </div>
              </div>
              <div
                class="flex flex-wrap items-center gap-2 text-xs text-white/60"
              >
                <UButton
                  v-if="isWaiting"
                  color="red"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-square"
                  class="bg-red-500/20 text-red-100 hover:bg-red-500/30"
                  @click="stopGenerating"
                >
                  停止生成
                </UButton>
                <UButton
                  color="white"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-sparkles"
                  class="bg-white/10"
                  :disabled="isWaiting"
                  @click="handleSessionCreate"
                >
                  新建会话
                </UButton>
                <UButton
                  color="white"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-rotate-ccw"
                  class="hover:bg-white/10"
                  :disabled="isWaiting"
                  @click="clearConversation"
                >
                  清空对话
                </UButton>
              </div>
            </div>
          </template>

          <ChatMessageList :messages="visibleMessages" />

          <div class="border-t border-white/10 bg-slate-950/40 px-4 pb-4 pt-3">
            <div
              v-if="errorMessage"
              class="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"
            >
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
                <div
                  v-if="currentModel"
                  class="flex items-center gap-2 text-white/50"
                >
                  <UIcon name="i-lucide-flame" class="h-3.5 w-3.5" />
                  <span class="text-[11px] uppercase tracking-widest">{{
                    currentModel?.toUpperCase()
                  }}</span>
                </div>
              </template>
            </ChatInputBar>
          </div>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>
