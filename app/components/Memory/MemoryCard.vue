<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-2xl">{{ icon }}</div>
          <div>
            <div class="font-semibold">{{ title }}</div>
            <div class="text-xs text-gray-500">{{ date }}</div>
          </div>
        </div>
        <UBadge :label="importanceLabel" :color="importanceColor" />
      </div>
    </template>

    <div class="py-3 text-sm text-gray-700">{{ snippet }}</div>

    <template #footer>
      <div class="flex justify-end">
        <UButton size="sm" variant="ghost" @click="$emit('open')">查看笔记</UButton>
      </div>
    </template>
  </UCard>
</template>

<script lang="ts" setup>

const props = defineProps()

const importanceLabel = computed(() => {
  if (props.importance === 'high') return '核心'
  if (props.importance === 'low') return '次要'
  return '一般'
})

const importanceColor = computed(() => {
  if (props.importance === 'high') return 'success'
  if (props.importance === 'low') return 'neutral'
  return 'info'
})
</script>

<style scoped>
</style>