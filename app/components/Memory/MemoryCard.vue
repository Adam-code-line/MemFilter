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
interface Props {
  title: string
  date: string
  snippet: string
  icon?: string
  importance?: 'high' | 'medium' | 'low'
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📝',
  importance: 'medium'
})

defineEmits<{
  open: []
}>()

const importanceConfig = {
  high: { label: '重要', color: 'red' },
  medium: { label: '一般', color: 'blue' },
  low: { label: '备注', color: 'gray' }
}

const importanceLabel = computed(() => importanceConfig[props.importance].label)
const importanceColor = computed(() => importanceConfig[props.importance].color as any)
</script>

<style scoped>
</style>