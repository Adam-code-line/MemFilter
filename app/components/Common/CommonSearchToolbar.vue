<script setup lang="ts">
  type FilterValue = string | null | undefined

  interface FilterOption {
    label: string
    value: string
    icon?: string
  }

  const props = withDefaults(
    defineProps<{
      modelValue: string
      placeholder?: string
      importanceOptions?: FilterOption[]
      importanceValue?: FilterValue
      importanceLabel?: string
      timeOptions?: FilterOption[]
      timeValue?: FilterValue
      timeLabel?: string
      clearLabel?: string
      searchLabel?: string
      layout?: 'horizontal' | 'vertical'
    }>(),
    {
      modelValue: '',
      placeholder: '搜索……',
      importanceOptions: () => [],
      importanceValue: null,
      importanceLabel: '',
      timeOptions: () => [],
      timeValue: null,
      timeLabel: '',
      clearLabel: '重置',
      searchLabel: '搜索',
      layout: 'vertical',
    }
  )

  const emit = defineEmits<{
    (event: 'update:modelValue', value: string): void
    (event: 'update:importance', value: string | null): void
    (event: 'update:time', value: string | null): void
    (event: 'search'): void
    (event: 'reset'): void
  }>()

  const searchText = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  })

  const importanceValue = computed({
    get: () => props.importanceValue ?? null,
    set: (value) => emit('update:importance', value ?? null),
  })

  const timeValue = computed({
    get: () => props.timeValue ?? null,
    set: (value) => emit('update:time', value ?? null),
  })

  const hasFilters = computed(() => {
    const hasSearch = searchText.value?.trim().length > 0
    const importanceActive = importanceValue.value && importanceValue.value !== 'all'
    const timeActive = timeValue.value && timeValue.value !== 'all'
    return hasSearch || importanceActive || timeActive
  })

  const handleEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      emit('search')
    }
  }

  const handleReset = () => {
    emit('reset')
  }
</script>

<template>
  <div
    :class="[
      'flex w-full flex-col gap-3',
      layout === 'horizontal' ? 'md:flex-row md:items-end md:gap-4' : '',
    ]"
  >
    <div class="flex-1 min-w-[240px]">
      <UInput
        v-model="searchText"
        :placeholder="placeholder"
        icon="i-lucide-search"
        size="lg"
        class="w-full"
        @keyup="handleEnter"
      />
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <div v-if="importanceOptions.length" class="min-w-[180px]">
        <UFormField :label="importanceLabel || undefined">
          <USelectMenu
            v-model="importanceValue"
            :items="importanceOptions"
            value-key="value"
            label-key="label"
            size="lg"
            placeholder="选择"
          />
        </UFormField>
      </div>

      <div v-if="timeOptions.length" class="min-w-[180px]">
        <UFormField :label="timeLabel || undefined">
          <USelectMenu
            v-model="timeValue"
            :items="timeOptions"
            value-key="value"
            label-key="label"
            size="lg"
            placeholder="选择"
          />
        </UFormField>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="primary"
          variant="solid"
          class="min-w-[88px]"
          icon="i-lucide-search"
          @click="emit('search')"
        >
          {{ searchLabel }}
        </UButton>
        <UButton
          v-if="hasFilters"
          color="neutral"
          variant="ghost"
          class="min-w-[72px]"
          icon="i-lucide-rotate-ccw"
          @click="handleReset"
        >
          {{ clearLabel }}
        </UButton>
      </div>
    </div>
  </div>
</template>
