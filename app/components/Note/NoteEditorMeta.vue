<template>
  <div class="meta-card" :class="{ 'meta-card--faded': fadeLevel > 0 }">
    <div class="meta-top">
      <UInput
        v-model="titleModel"
        :placeholder="titlePlaceholder"
        variant="none"
        class="meta-title"
      />
      <div class="meta-controls">
        <USelectMenu
          v-model="importanceModel"
          :items="importanceOptions"
          label-key="label"
          value-key="value"
          size="sm"
          class="min-w-[160px]"
          :ui="{ menu: 'min-w-[160px]' }"
        />
        <UBadge
          v-if="statusLabel"
          :label="statusLabel"
          :color="statusColor"
          variant="outline"
        />
      </div>
    </div>

    <div class="meta-description">
      <label class="meta-label">记忆描述</label>
      <UTextarea
        v-model="descriptionModel"
        :placeholder="descriptionPlaceholder"
        :rows="3"
        class="meta-textarea"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description: string
  importance: ImportanceLevel
  importanceOptions: Array<{ label: string; value: ImportanceLevel }>
  statusLabel?: string
  statusColor?: string
  titlePlaceholder?: string
  descriptionPlaceholder?: string
  fadeLevel?: number
}>(), {
  title: '',
  description: '',
  importance: 'medium',
  importanceOptions: () => [],
  statusLabel: '',
  statusColor: 'neutral',
  titlePlaceholder: '笔记标题...',
  descriptionPlaceholder: '补充上下文或灵感片段',
  fadeLevel: 0
})

const emit = defineEmits<{
  (event: 'update:title', value: string): void
  (event: 'update:description', value: string): void
  (event: 'update:importance', value: ImportanceLevel): void
}>()

const titleModel = computed({
  get: () => props.title,
  set: value => emit('update:title', value)
})

const descriptionModel = computed({
  get: () => props.description,
  set: value => emit('update:description', value)
})

const importanceModel = computed<ImportanceLevel>({
  get: () => props.importance,
  set: value => emit('update:importance', value)
})
</script>

<style scoped>
.meta-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.2rem 1.35rem;
  border-radius: 1.25rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.03), rgba(59, 130, 246, 0.04));
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(12px);
}

.dark .meta-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.45), rgba(59, 130, 246, 0.12));
  border-color: rgba(148, 163, 184, 0.25);
}

.meta-card--faded {
  opacity: 0.8;
  filter: blur(0.4px);
}

.meta-top {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .meta-top {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.meta-title {
  font-size: 1.25rem;
  font-weight: 600;
  height: 3rem;
  padding: 0;
  border-bottom: 1px solid transparent;
}

.meta-title :deep(input) {
  padding: 0;
}

.meta-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.meta-description {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(71, 85, 105, 0.85);
}

.dark .meta-label {
  color: rgba(148, 163, 184, 0.85);
}

.meta-textarea {
  min-height: 6rem;
  border-radius: 1rem;
}
</style>
