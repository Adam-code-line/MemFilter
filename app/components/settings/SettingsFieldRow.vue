<script setup lang="ts">
  const props = defineProps({
    label: {
      type: String,
      required: true,
    },
    helper: {
      type: String,
      default: undefined,
    },
    placeholder: {
      type: String,
      default: undefined,
    },
    type: {
      type: String as () => 'text' | 'email' | 'password' | 'textarea',
      default: 'text',
    },
    modelValue: {
      type: String,
      default: '',
    },
  })

  const emit = defineEmits<{
    (event: 'update:modelValue', value: string): void
  }>()

  const value = computed({
    get: () => props.modelValue,
    set: (newValue) => emit('update:modelValue', newValue),
  })
</script>

<template>
  <div class="space-y-2">
    <UFormField :label="label" :description="helper" class="space-y-2">
      <UInput
        v-if="type !== 'textarea'"
        v-model="value"
        :type="type"
        :placeholder="placeholder"
        color="primary"
        variant="outline"
      />
      <UTextarea
        v-else
        v-model="value"
        :placeholder="placeholder"
        color="primary"
        variant="outline"
        :rows="4"
      />
    </UFormField>
  </div>
</template>
