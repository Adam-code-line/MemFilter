<script setup lang="ts">
import { computed } from 'vue'
import MemoryDetailPanel from '~/components/Memory/MemoryDetailPanel.vue'

interface MemoryDetailDialogProps {
  modelValue: boolean
  title?: string
  eyebrow?: string
  clearLabel?: string
  note: Record<string, any> | null
  actions?: Array<{
    key: string
    label: string
    icon?: string
    color?: string
    variant?: 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'
    disabled?: boolean
    tooltip?: string
  }>
  statusLabel?: string
  statusColor?: string
  width?: string
}

const props = withDefaults(defineProps<MemoryDetailDialogProps>(), {
  title: '记忆详情',
  eyebrow: undefined,
  clearLabel: '关闭',
  note: null,
  actions: () => [],
  statusLabel: undefined,
  statusColor: undefined,
  width: 'sm:max-w-4xl'
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'close'): void
  (event: 'action', key: string): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleAction = (key: string) => {
  emit('action', key)
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ width: props.width }"
    @close="handleClose"
  >
    <template #content>
      <UCard :ui="{ body: { padding: 'p-6' } }" class="space-y-4">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <p v-if="eyebrow" class="text-xs uppercase tracking-[0.4em] text-primary-500/70 dark:text-primary-300/70">
                {{ eyebrow }}
              </p>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ title }}
              </h2>
            </div>
            <UButton
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              @click="handleClose"
            >
              {{ clearLabel }}
            </UButton>
          </div>
        </template>

        <MemoryDetailPanel
          :note="note"
          :actions="actions"
          :status-label="statusLabel"
          :status-color="statusColor"
          @action="handleAction"
        />
      </UCard>
    </template>
  </UModal>
</template>
