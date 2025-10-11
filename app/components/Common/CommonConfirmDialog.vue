<script setup lang="ts">
interface ConfirmDialogProps {
  modelValue: boolean
  title?: string
  description?: string
  icon?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'primary' | 'secondary' | 'neutral' | 'error' | 'warning' | 'success' | 'info'
  confirmVariant?: 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'
  loading?: boolean
}

const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  title: '确认操作',
  description: '',
  icon: 'i-lucide-alert-triangle',
  confirmLabel: '确认',
  cancelLabel: '取消',
  confirmColor: 'error',
  confirmVariant: 'solid',
  loading: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const iconColorClass = computed(() => {
  const colorMap: Record<Required<ConfirmDialogProps>['confirmColor'], string> = {
    primary: 'text-primary-500',
    secondary: 'text-secondary-500',
    neutral: 'text-neutral-500',
    error: 'text-error-500',
    warning: 'text-warning-500',
    success: 'text-success-500',
    info: 'text-info-500'
  }
  return colorMap[props.confirmColor] ?? 'text-error-500'
})

const close = () => {
  emit('update:modelValue', false)
}

const handleCancel = () => {
  emit('cancel')
  close()
}

const handleConfirm = () => {
  emit('confirm')
  close()
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ width: 'sm:max-w-md' }"
  >
    <template #content>
      <UCard class="space-y-4" :ui="{ body: { padding: 'p-6' }, footer: { padding: 'px-6 pb-6 pt-0' } }">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon v-if="icon" :name="icon" :class="['text-xl', iconColorClass]" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
          </div>
        </template>

        <p v-if="description" class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {{ description }}
        </p>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <UButton
              variant="ghost"
              color="neutral"
              @click="handleCancel"
            >
              {{ cancelLabel }}
            </UButton>
            <UButton
              :color="confirmColor"
              :variant="confirmVariant"
              :loading="loading"
              @click="handleConfirm"
            >
              {{ confirmLabel }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
