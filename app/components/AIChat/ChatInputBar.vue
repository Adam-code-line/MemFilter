<template>
  <form class="relative flex flex-col gap-3" @submit.prevent="handleSubmit">
    <div class="flex items-center justify-between text-xs uppercase tracking-widest text-white/40">
      <div class="flex items-center gap-2">
        <UBadge size="xs" color="primary" variant="soft" label="Alpha" />
        <span>AI 会话实验区</span>
      </div>
      <slot name="meta" />
    </div>
    <UTextarea
      v-model="textValue"
      :rows="4"
      :disabled="disabled"
      :placeholder="placeholder"
      data-chat-input="true"
      class="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
    />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-2 text-[11px] uppercase tracking-widest text-white/30">
        <span>Enter 发送</span>
        <span>Ctrl ⏎ 换行</span>
      </div>
      <div class="flex items-center gap-2">
        <USelect
          v-if="modelOptions?.length"
          v-model="selectedModel"
          :items="modelOptions"
          option-attribute="label"
          value-attribute="value"
          size="xs"
          class="min-w-[140px]"
        />
        <UButton
          type="submit"
          color="primary"
          :loading="loading"
          :disabled="disabled || !modelValue.trim()"
          icon="i-lucide-send"
          class="rounded-xl px-5"
        >
          发送
        </UButton>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
  import { useKeyboardShortcut } from '~/composables/ui/useKeyboardShortcut'
  const props = withDefaults(
    defineProps<{
      modelValue: string
      loading?: boolean
      disabled?: boolean
      placeholder?: string
      models?: Array<{ label: string; value: string }>
      activeModel?: string | null
    }>(),
    {
      modelValue: '',
      loading: false,
      disabled: false,
      placeholder: '向 AI 提问任何问题...',
    }
  )

  const emit = defineEmits<{
    (event: 'update:modelValue', value: string): void
    (event: 'submit'): void
    (event: 'update:model', value: string): void
  }>()

  const modelOptions = computed(() => props.models ?? [])

  const textValue = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  })

  const selectedModel = computed({
    get: () => props.activeModel ?? modelOptions.value[0]?.value ?? null,
    set: (value) => {
      if (!value) return
      emit('update:model', value)
    },
  })

  const handleSubmit = () => {
    if (props.disabled || props.loading) return
    emit('submit')
  }

  useKeyboardShortcut({
    allowInInput: true,
    preventDefault: true,
    stopPropagation: true,
    handler: () => {
      if (props.disabled || props.loading) {
        return
      }
      handleSubmit()
    },
    match: (event) => {
      if (event.repeat || event.isComposing) {
        return false
      }

      if (event.key !== 'Enter') {
        return false
      }

      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return false
      }

      const target = event.target as HTMLElement | null
      return target?.dataset?.chatInput === 'true'
    },
  })
</script>
