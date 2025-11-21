<script setup lang="ts">
  import type { DiscoveryCollection } from '~/composables/discovery/useDiscoveryFeed'

  const props = defineProps<{
    collections: DiscoveryCollection[]
  }>()
</script>

<template>
  <aside class="flex flex-col gap-6">
    <UCard class="border border-gray-200/60 dark:border-slate-700/40">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">智能推荐</h3>
          <UBadge label="Beta" color="primary" variant="soft" />
        </div>
      </template>
      <p class="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
        个性化推荐将在接入 AI 服务后提供，现在可先浏览精选集合，后续会根据你的笔记自动调整权重。
      </p>
    </UCard>

    <div class="space-y-4">
      <UCard
        v-for="collection in collections"
        :key="collection.id"
        class="border border-gray-200/60 transition hover:border-primary/40 dark:border-slate-700/40 dark:hover:border-primary/40"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20"
          >
            <UIcon :name="collection.icon" class="text-lg" />
          </div>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ collection.title }}
              </h4>
              <UBadge
                v-if="collection.comingSoon"
                label="即将上线"
                color="neutral"
                variant="soft"
                size="xs"
              />
            </div>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
              {{ collection.description }}
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </aside>
</template>
