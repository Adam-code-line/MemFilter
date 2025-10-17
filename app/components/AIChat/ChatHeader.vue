<template>
  <header class="flex flex-col items-center gap-4 text-center text-white">
    <div class="flex items-center gap-3 text-2xl font-semibold tracking-tight">
      <AppLogo class = "h-15 w-auto"/>
      <span>MemFilter Conversational Studio</span>
    </div>
    <p class="max-w-xl text-sm text-white/60">
      以自然语言提问、构思或分析，你的专属 AI 助手将即刻响应。支持多模型快速切换，助力创作与洞察。
    </p>
    <div class="flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-wider text-white/40">
      <UBadge color="white" variant="soft" size="xs" class="bg-white/5 text-white/80" label="实时搜索" />
      <UBadge color="white" variant="soft" size="xs" class="bg-white/5 text-white/80" label="知识库" />
      <UBadge color="white" variant="soft" size="xs" class="bg-white/5 text-white/80" label="多模型" />
    </div>
  </header>
</template>

<script setup lang="ts">
</script>
